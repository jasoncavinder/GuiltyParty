import Combine
import Foundation

@MainActor
final class CompanionSession: ObservableObject {
    @Published private(set) var state = SessionStateMachine()
    @Published private(set) var statusMessage = "Paste or enter an active GP1 invitation."
    @Published private(set) var screenshotWarningIsPresented = false
    @Published private(set) var advertisedGameplayLanguage: String?

    private var authority: SessionAuthority?
    private var socket: FirstPartyWebSocket?
    private var receiveTask: Task<Void, Never>?
    private var heartbeatTask: Task<Void, Never>?
    private var connectionHealthTask: Task<Void, Never>?
    private var negotiationTask: Task<Void, Never>?
    private var stableConnectionTask: Task<Void, Never>?
    private var reconnectTask: Task<Void, Never>?
    private var socketID: UUID?
    private var lastAuthenticatedActivity: ContinuousClock.Instant?
    private var connectionIsShieldedForInactivity = false
    private var reconnectBackoff = ReconnectBackoff()
    private var hasOpenedConnection = false
    private var appIsActive = true
    private var captureIsActive = false
    private var manuallyShielded = false
    private var pendingCommands: [String: OutboundCommand] = [:]
    private var resumeCredential: StoredResumeCredential?
    private var credentialResumeTask: Task<Void, Never>?
    private let credentialStore: any ResumeCredentialStoring
    private let commandFactory = CommandFactory()

    init(
        credentialStore: any ResumeCredentialStoring = KeychainResumeCredentialStore(),
        automaticallyResume: Bool = true
    ) {
        self.credentialStore = credentialStore
        do {
            guard let credential = try credentialStore.load() else { return }
            let now = Int64(Date().timeIntervalSince1970 * 1_000)
            guard credential.expiresAtUnixMilliseconds > now else {
                try credentialStore.delete()
                return
            }
            resumeCredential = credential
            advertisedGameplayLanguage = credential.gameplayLanguage
            state.beginJoin()
            statusMessage = "Recovering this device's private session…"
            if automaticallyResume {
                beginCredentialResumeIfNeeded()
            }
        } catch {
            try? credentialStore.delete()
            statusMessage = "Saved session access could not be read safely. Join with a fresh invitation."
        }
    }

    var phase: CompanionPhase { state.phase }
    var projection: ParticipantProjection? { state.projection }
    var privacyInterruption: PrivacyInterruption? { state.privacyInterruption }

    var canCastVote: Bool {
        guard let projection else { return false }
        return appIsActive
            && !captureIsActive
            && !manuallyShielded
            && !state.needsFreshProjection
            && projection.votingOpen
            && !projection.ownVoteRecorded
            && pendingCommands.isEmpty
    }

    func join(invitationPayload: String, displayName: String) async {
        stopTransport()
        clearResumeCredential()
        authority = nil
        advertisedGameplayLanguage = nil
        pendingCommands.removeAll(keepingCapacity: false)
        reconnectBackoff.reset()
        hasOpenedConnection = false
        state.beginJoin()
        statusMessage = "Validating the invitation and joining privately…"

        do {
            let invitation = try InvitationDecoder.decode(invitationPayload)
            advertisedGameplayLanguage = invitation.gameplayLanguage
            let admission = try await JoinClient.join(invitation: invitation, displayName: displayName)
            try persistResumeCredential(admission.resumeCredential)
            authority = admission.authority
            try ensureAuthorityIsCurrent(admission.authority)
            connect(isRejoin: false)
        } catch let error as SessionModelError {
            handleTerminalOrJoinError(error)
        } catch {
            state.requireManualRejoin()
            statusMessage = "The session could not be reached. Check your connection and try a fresh invitation."
        }
    }

    func castVote(targetCharacterID: String) async {
        guard canCastVote, let authority, let socket else {
            statusMessage = SessionModelError.connectionUnavailable.userMessage
            return
        }
        do {
            let command = try commandFactory.castVote(targetCharacterID: targetCharacterID)
            let data = try commandFactory.encode(command, authority: authority)
            pendingCommands[command.messageID] = command
            try recordPendingIdempotencyID(command.idempotencyID)
            statusMessage = "Submitting your private vote…"
            try await socket.send(data)
        } catch let error as SessionModelError {
            statusMessage = error.userMessage
        } catch {
            protectAndReconnect(reason: .connectionUncertain)
        }
    }

    func setAppActive(_ active: Bool) {
        appIsActive = active
        if active {
            resumeIfPermitted()
        } else if authority != nil {
            protect(reason: .backgroundOrLock)
        }
    }

    func setCaptureActive(_ active: Bool) {
        guard captureIsActive != active else { return }
        captureIsActive = active
        if active, authority != nil {
            protect(reason: .capture)
        } else if !active {
            resumeIfPermitted()
        }
    }

    func hidePrivateView() {
        manuallyShielded = true
        if authority != nil {
            protect(reason: .manual)
        }
    }

    func revealPrivateView() {
        manuallyShielded = false
        resumeIfPermitted()
    }

    func screenshotDetected() {
        guard authority != nil else { return }
        screenshotWarningIsPresented = true
    }

    func dismissScreenshotWarning() {
        screenshotWarningIsPresented = false
    }

    func manualRejoin() {
        stopTransport()
        clearResumeCredential()
        authority = nil
        pendingCommands.removeAll(keepingCapacity: false)
        advertisedGameplayLanguage = nil
        manuallyShielded = false
        captureIsActive = false
        reconnectBackoff.reset()
        hasOpenedConnection = false
        state.requireManualRejoin()
        statusMessage = "Paste or enter an active GP1 invitation."
    }

    private func connect(isRejoin: Bool) {
        guard appIsActive, !captureIsActive, !manuallyShielded, let authority else { return }
        do {
            try ensureAuthorityIsCurrent(authority)
        } catch {
            recoverWithResumeCredentialOrExpire()
            return
        }

        stopTransport()
        let newSocketID = UUID()
        socketID = newSocketID
        state.beginSocket(
            id: newSocketID,
            isRejoin: isRejoin,
            baselineServerSequence: resumeCredential?.lastServerSequence
        )
        statusMessage = isRejoin
            ? "Reconnecting. Private content stays hidden until the server sends a fresh view."
            : "Opening the private game connection…"

        let request = WebSocketRequestBuilder.request(authority: authority)
        let socket = FirstPartyWebSocket(request: request) { [weak self] event in
            Task { @MainActor [weak self] in
                self?.handleLifecycle(event, socketID: newSocketID)
            }
        }
        self.socket = socket
        socket.start()
    }

    private func handleLifecycle(_ event: SocketLifecycleEvent, socketID eventSocketID: UUID) {
        guard eventSocketID == socketID else { return }
        switch event {
        case .opened(let subprotocolName):
            guard subprotocolName == CompanionEnvironment.controlSubprotocol else {
                failProtocol()
                return
            }
            let wasRejoin = hasOpenedConnection
            hasOpenedConnection = true
            statusMessage = wasRejoin
                ? "Connected again. Requesting a fresh private view…"
                : "Connected. Requesting your private view…"
            startReceiveLoop(socketID: eventSocketID)
            startHeartbeatLoop(socketID: eventSocketID)
            startNegotiationDeadline(socketID: eventSocketID)
            Task { [weak self] in
                await self?.requestFreshProjection(socketID: eventSocketID)
            }
        case .closed(let code):
            handleSocketClosure(code: code, socketID: eventSocketID)
        case .failed:
            protectAndReconnect(reason: .connectionUncertain)
        }
    }

    private func requestFreshProjection(socketID eventSocketID: UUID) async {
        guard eventSocketID == socketID, let authority, let socket else { return }
        do {
            let messageID = "msg_\(UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased())"
            let data = try ControlPlaneCodec.projectionRequest(
                authority: authority,
                messageID: messageID
            )
            try await socket.send(data)
        } catch {
            protectAndReconnect(reason: .connectionUncertain)
        }
    }

    private func startReceiveLoop(socketID eventSocketID: UUID) {
        receiveTask?.cancel()
        receiveTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                do {
                    guard eventSocketID == socketID, let socket else { return }
                    let data = try await socket.receive()
                    try handleServerData(data, socketID: eventSocketID)
                } catch is CancellationError {
                    return
                } catch let error as SessionModelError {
                    if error == .staleSocketEvent { return }
                    if error == .sequenceGap {
                        protectAndReconnect(reason: .connectionUncertain)
                        return
                    }
                    failProtocol()
                    return
                } catch {
                    guard eventSocketID == socketID else { return }
                    handleSocketClosure(code: socket?.closeCode ?? 0, socketID: eventSocketID)
                    return
                }
            }
        }
    }

    private func startHeartbeatLoop(socketID eventSocketID: UUID) {
        heartbeatTask?.cancel()
        heartbeatTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                do {
                    try await Task.sleep(for: .seconds(15))
                    guard eventSocketID == socketID, let socket else { return }
                    try await socket.ping()
                    await requestFreshProjection(socketID: eventSocketID)
                } catch is CancellationError {
                    return
                } catch {
                    guard eventSocketID == socketID else { return }
                    protectAndReconnect(reason: .connectionUncertain)
                    return
                }
            }
        }
    }

    private func startNegotiationDeadline(socketID eventSocketID: UUID) {
        negotiationTask?.cancel()
        negotiationTask = Task { [weak self] in
            do {
                try await Task.sleep(for: ConnectionHealthPolicy.negotiationTimeout)
            } catch {
                return
            }
            guard let self,
                  eventSocketID == socketID,
                  state.needsFreshProjection
            else {
                return
            }
            protectAndReconnect(reason: .connectionUncertain)
        }
    }

    private func recordAuthenticatedActivity(
        socketID eventSocketID: UUID,
        establishesPrivateView: Bool = false
    ) {
        guard eventSocketID == socketID else { return }
        lastAuthenticatedActivity = ContinuousClock.now
        if establishesPrivateView {
            negotiationTask?.cancel()
            negotiationTask = nil
            connectionIsShieldedForInactivity = false
            startConnectionHealthMonitoring(socketID: eventSocketID)
            startStableConnectionTimerIfNeeded(socketID: eventSocketID)
        }
    }

    private func startConnectionHealthMonitoring(socketID eventSocketID: UUID) {
        guard connectionHealthTask == nil else { return }
        connectionHealthTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                do {
                    try await Task.sleep(for: .seconds(1))
                } catch {
                    return
                }
                guard eventSocketID == socketID,
                      let lastAuthenticatedActivity
                else {
                    return
                }
                let elapsed = lastAuthenticatedActivity.duration(to: ContinuousClock.now)
                switch ConnectionHealthPolicy.action(after: elapsed) {
                case .healthy:
                    continue
                case .shield:
                    guard !connectionIsShieldedForInactivity else { continue }
                    do {
                        try state.markConnectionUncertain(socketID: eventSocketID)
                    } catch {
                        return
                    }
                    connectionIsShieldedForInactivity = true
                    stableConnectionTask?.cancel()
                    stableConnectionTask = nil
                    statusMessage = PrivacyInterruption.connectionUncertain.message
                    await requestFreshProjection(socketID: eventSocketID)
                case .disconnect:
                    protectAndReconnect(reason: .connectionUncertain)
                    return
                }
            }
        }
    }

    private func startStableConnectionTimerIfNeeded(socketID eventSocketID: UUID) {
        guard stableConnectionTask == nil else { return }
        stableConnectionTask = Task { [weak self] in
            do {
                try await Task.sleep(for: ConnectionHealthPolicy.stableConnectionDuration)
            } catch {
                return
            }
            guard let self,
                  eventSocketID == socketID,
                  !state.needsFreshProjection,
                  !connectionIsShieldedForInactivity
            else {
                return
            }
            reconnectBackoff.reset()
            stableConnectionTask = nil
        }
    }

    private func handleServerData(_ data: Data, socketID eventSocketID: UUID) throws {
        guard eventSocketID == socketID, let authority else {
            throw SessionModelError.staleSocketEvent
        }
        switch try ControlPlaneCodec.decodeServerEvent(data, authority: authority) {
        case .projection(let envelope):
            try ensureSequenceIsNotBeforeResume(envelope.serverSequence)
            let nextProjection = try ProjectionValidator.participantProjection(
                from: envelope,
                authority: authority
            )
            try state.applyProjection(
                nextProjection,
                sequence: envelope.serverSequence,
                socketID: eventSocketID
            )
            try recordServerSequence(envelope.serverSequence)
            recordAuthenticatedActivity(socketID: eventSocketID, establishesPrivateView: true)
            advertisedGameplayLanguage = nextProjection.gameplayLanguage
            statusMessage = state.phase == .rejoined
                ? "Rejoined with a fresh server-authorized private view."
                : nextProjection.hasAssignment
                    ? "Your private view is current."
                    : "Connected. Waiting for the Host to assign your character."
            if state.phase == .rejoined {
                Task { [weak self] in
                    try? await Task.sleep(for: .seconds(2))
                    guard let self, eventSocketID == socketID else { return }
                    state.settleRejoinedState()
                }
            }
        case .commandResult(let envelope):
            try ensureSequenceIsNotBeforeResume(envelope.serverSequence)
            try state.acceptServerSequence(envelope.serverSequence, socketID: eventSocketID)
            try handleCommandResult(envelope)
            try recordServerSequence(envelope.serverSequence)
            recordAuthenticatedActivity(socketID: eventSocketID)
        case .error(let envelope):
            if let sequence = envelope.serverSequence {
                try ensureSequenceIsNotBeforeResume(sequence)
                try state.acceptServerSequence(sequence, socketID: eventSocketID)
                try recordServerSequence(sequence)
            }
            recordAuthenticatedActivity(socketID: eventSocketID)
            if let correlationID = envelope.correlationId?.value {
                if let pending = pendingCommands.removeValue(forKey: correlationID) {
                    try removePendingIdempotencyID(pending.idempotencyID)
                }
            }
            let code = envelope.payload.code
            if code.contains("expired") || code.contains("revoked") {
                transitionToExpiredOrRevoked()
            } else {
                statusMessage = envelope.payload.title
            }
        }
    }

    private func handleCommandResult(_ envelope: GPV1CommandResultEnvelope) throws {
        guard let pending = pendingCommands.removeValue(forKey: envelope.correlationId.value)
        else {
            return
        }
        try removePendingIdempotencyID(pending.idempotencyID)
        switch envelope.payload {
        case .accepted(let result):
            guard result.idempotencyId.value == pending.idempotencyID,
                  result.primaryAuthorityGeneration == authority?.primaryAuthorityGeneration
            else {
                throw SessionModelError.protocolViolation
            }
            statusMessage = "Your vote was accepted. Waiting for the refreshed private view…"
        case .rejected(let result):
            guard result.idempotencyId.value == pending.idempotencyID else {
                throw SessionModelError.protocolViolation
            }
            statusMessage = result.title
        }
    }

    private func handleSocketClosure(code: Int, socketID eventSocketID: UUID) {
        guard eventSocketID == socketID else { return }
        switch code {
        case URLSessionWebSocketTask.CloseCode.normalClosure.rawValue:
            transitionToSessionEnded()
        case URLSessionWebSocketTask.CloseCode.policyViolation.rawValue:
            recoverWithResumeCredentialOrExpire()
        case URLSessionWebSocketTask.CloseCode.goingAway.rawValue:
            protectAndReconnect(reason: .connectionUncertain)
        default:
            protectAndReconnect(reason: .connectionUncertain)
        }
    }

    private func protect(reason: PrivacyInterruption) {
        stopTransport()
        pendingCommands.removeAll(keepingCapacity: false)
        state.interrupt(reason)
        statusMessage = reason.message
    }

    private func protectAndReconnect(reason: PrivacyInterruption) {
        protect(reason: reason)
        scheduleReconnect()
    }

    private func scheduleReconnect() {
        guard authority != nil, appIsActive, !captureIsActive, !manuallyShielded else { return }
        reconnectTask?.cancel()
        let seconds = reconnectBackoff.nextMaximumDelaySeconds()
        let delay = Double.random(in: 0...seconds)
        reconnectTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(delay))
            guard let self, !Task.isCancelled else { return }
            connect(isRejoin: true)
        }
    }

    private func resumeIfPermitted() {
        guard appIsActive, !captureIsActive, !manuallyShielded else { return }
        if let authority {
            do {
                try ensureAuthorityIsCurrent(authority)
                connect(isRejoin: true)
            } catch {
                recoverWithResumeCredentialOrExpire()
            }
        } else {
            beginCredentialResumeIfNeeded()
        }
    }

    private func stopTransport() {
        reconnectTask?.cancel()
        reconnectTask = nil
        receiveTask?.cancel()
        receiveTask = nil
        heartbeatTask?.cancel()
        heartbeatTask = nil
        connectionHealthTask?.cancel()
        connectionHealthTask = nil
        negotiationTask?.cancel()
        negotiationTask = nil
        stableConnectionTask?.cancel()
        stableConnectionTask = nil
        socket?.cancel()
        socket = nil
        socketID = nil
        lastAuthenticatedActivity = nil
        connectionIsShieldedForInactivity = false
    }

    private func beginCredentialResumeIfNeeded() {
        guard credentialResumeTask == nil,
              authority == nil,
              resumeCredential != nil,
              appIsActive,
              !captureIsActive,
              !manuallyShielded
        else {
            return
        }
        credentialResumeTask = Task { [weak self] in
            await self?.resumeStoredSession()
        }
    }

    private func resumeStoredSession() async {
        defer { credentialResumeTask = nil }
        guard var credential = resumeCredential else { return }
        let now = Int64(Date().timeIntervalSince1970 * 1_000)
        guard credential.expiresAtUnixMilliseconds > now else {
            transitionToExpiredOrRevoked()
            return
        }
        state.beginJoin()
        statusMessage = "Recovering this device's private session…"
        do {
            if credential.pendingReplacementToken == nil {
                credential = credential.stagingReplacementToken(try ResumeCredentialToken.generate())
                try persistResumeCredential(credential)
            }
            let admission = try await ResumeClient.resume(credential)
            try persistResumeCredential(admission.resumeCredential)
            authority = admission.authority
            advertisedGameplayLanguage = admission.authority.gameplayLanguage
            try ensureAuthorityIsCurrent(admission.authority)
            connect(isRejoin: true)
        } catch let error as SessionModelError {
            if error == .connectionUnavailable {
                state.interrupt(.connectionUncertain)
                statusMessage = "Session recovery is waiting for a secure connection."
                scheduleCredentialResume()
            } else {
                handleTerminalOrJoinError(error)
            }
        } catch {
            state.interrupt(.connectionUncertain)
            statusMessage = "Session recovery is waiting for a secure connection."
            scheduleCredentialResume()
        }
    }

    private func scheduleCredentialResume() {
        guard resumeCredential != nil, appIsActive, !captureIsActive, !manuallyShielded else { return }
        reconnectTask?.cancel()
        let seconds = reconnectBackoff.nextMaximumDelaySeconds()
        let delay = Double.random(in: 0...seconds)
        reconnectTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(delay))
            guard let self, !Task.isCancelled else { return }
            beginCredentialResumeIfNeeded()
        }
    }

    private func recoverWithResumeCredentialOrExpire() {
        guard resumeCredential != nil else {
            transitionToExpiredOrRevoked()
            return
        }
        stopTransport()
        authority = nil
        pendingCommands.removeAll(keepingCapacity: false)
        state.interrupt(.connectionUncertain)
        statusMessage = "Refreshing this device's private session access…"
        beginCredentialResumeIfNeeded()
    }

    private func persistResumeCredential(_ credential: StoredResumeCredential) throws {
        try credentialStore.save(credential)
        resumeCredential = credential
    }

    private func recordServerSequence(_ sequence: Int64) throws {
        guard let credential = resumeCredential else {
            return
        }
        guard sequence >= credential.lastServerSequence else {
            throw SessionModelError.sequenceRegression
        }
        guard sequence != credential.lastServerSequence else { return }
        try persistResumeCredential(credential.updating(lastServerSequence: sequence))
    }

    private func ensureSequenceIsNotBeforeResume(_ sequence: Int64) throws {
        if let credential = resumeCredential,
           sequence < credential.lastServerSequence {
            throw SessionModelError.sequenceRegression
        }
    }

    private func recordPendingIdempotencyID(_ identifier: String) throws {
        guard let credential = resumeCredential else {
            throw SessionModelError.connectionUnavailable
        }
        var pending = credential.pendingIdempotencyIDs
        if !pending.contains(identifier) {
            pending.append(identifier)
        }
        guard pending.count <= 32 else {
            throw SessionModelError.protocolViolation
        }
        try persistResumeCredential(credential.updating(pendingIdempotencyIDs: pending))
    }

    private func removePendingIdempotencyID(_ identifier: String) throws {
        guard let credential = resumeCredential else { return }
        let pending = credential.pendingIdempotencyIDs.filter { $0 != identifier }
        guard pending != credential.pendingIdempotencyIDs else { return }
        try persistResumeCredential(credential.updating(pendingIdempotencyIDs: pending))
    }

    private func clearResumeCredential() {
        credentialResumeTask?.cancel()
        credentialResumeTask = nil
        resumeCredential = nil
        try? credentialStore.delete()
    }

    private func failProtocol() {
        stopTransport()
        clearResumeCredential()
        authority = nil
        pendingCommands.removeAll(keepingCapacity: false)
        state.requireManualRejoin()
        statusMessage = SessionModelError.protocolViolation.userMessage
    }

    private func handleTerminalOrJoinError(_ error: SessionModelError) {
        switch error {
        case .expiredInvitation, .expiredOrRevoked:
            transitionToExpiredOrRevoked(message: error.userMessage)
        case .sessionEnded:
            transitionToSessionEnded()
        case .invalidResponse, .protocolViolation, .recipientBoundaryViolation:
            clearResumeCredential()
            state.requireManualRejoin()
            statusMessage = error.userMessage
        default:
            state.requireManualRejoin()
            statusMessage = error.userMessage
        }
    }

    private func transitionToExpiredOrRevoked(message: String? = nil) {
        stopTransport()
        clearResumeCredential()
        authority = nil
        pendingCommands.removeAll(keepingCapacity: false)
        state.expireOrRevoke()
        statusMessage = message ?? SessionModelError.expiredOrRevoked.userMessage
    }

    private func transitionToSessionEnded() {
        stopTransport()
        clearResumeCredential()
        authority = nil
        pendingCommands.removeAll(keepingCapacity: false)
        state.endSession()
        statusMessage = SessionModelError.sessionEnded.userMessage
    }

    private func ensureAuthorityIsCurrent(_ authority: SessionAuthority) throws {
        let now = Int64(Date().timeIntervalSince1970 * 1_000)
        guard authority.expiresAtUnixMilliseconds > now else {
            throw SessionModelError.expiredOrRevoked
        }
    }
}

enum ConnectionHealthAction: Equatable, Sendable {
    case healthy
    case shield
    case disconnect
}

enum ConnectionHealthPolicy {
    static let negotiationTimeout: Duration = .seconds(5)
    static let privacyShieldDelay: Duration = .seconds(30)
    static let disconnectDelay: Duration = .seconds(45)
    static let stableConnectionDuration: Duration = .seconds(60)

    static func action(after elapsed: Duration) -> ConnectionHealthAction {
        if elapsed >= disconnectDelay {
            return .disconnect
        }
        if elapsed >= privacyShieldDelay {
            return .shield
        }
        return .healthy
    }
}

struct ReconnectBackoff: Equatable, Sendable {
    private static let maximumDelaySeconds = [1.0, 2.0, 4.0, 8.0, 15.0, 30.0]
    private(set) var attempt = 0

    mutating func nextMaximumDelaySeconds() -> Double {
        let delay = Self.maximumDelaySeconds[min(attempt, Self.maximumDelaySeconds.count - 1)]
        attempt += 1
        return delay
    }

    mutating func reset() {
        attempt = 0
    }
}
