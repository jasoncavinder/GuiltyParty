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
    private var reconnectTask: Task<Void, Never>?
    private var socketID: UUID?
    private var reconnectBackoff = ReconnectBackoff()
    private var hasOpenedConnection = false
    private var appIsActive = true
    private var captureIsActive = false
    private var manuallyShielded = false
    private var pendingCommands: [String: OutboundCommand] = [:]
    private let commandFactory = CommandFactory()

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
            let joined = try await JoinClient.join(invitation: invitation, displayName: displayName)
            authority = joined
            try ensureAuthorityIsCurrent(joined)
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
            transitionToExpiredOrRevoked()
            return
        }

        stopTransport()
        let newSocketID = UUID()
        socketID = newSocketID
        state.beginSocket(id: newSocketID, isRejoin: isRejoin)
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

    private func handleServerData(_ data: Data, socketID eventSocketID: UUID) throws {
        guard eventSocketID == socketID, let authority else {
            throw SessionModelError.staleSocketEvent
        }
        switch try ControlPlaneCodec.decodeServerEvent(data, authority: authority) {
        case .projection(let envelope):
            let nextProjection = try ProjectionValidator.participantProjection(
                from: envelope,
                authority: authority
            )
            try state.applyProjection(
                nextProjection,
                sequence: envelope.serverSequence,
                socketID: eventSocketID
            )
            reconnectBackoff.reset()
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
            try state.acceptServerSequence(envelope.serverSequence, socketID: eventSocketID)
            try handleCommandResult(envelope)
        case .error(let envelope):
            if let sequence = envelope.serverSequence {
                try state.acceptServerSequence(sequence, socketID: eventSocketID)
            }
            if let correlationID = envelope.correlationId?.value {
                pendingCommands.removeValue(forKey: correlationID)
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
        case URLSessionWebSocketTask.CloseCode.policyViolation.rawValue,
             URLSessionWebSocketTask.CloseCode.goingAway.rawValue:
            transitionToExpiredOrRevoked()
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
        guard authority != nil, appIsActive, !captureIsActive, !manuallyShielded else { return }
        connect(isRejoin: true)
    }

    private func stopTransport() {
        reconnectTask?.cancel()
        reconnectTask = nil
        receiveTask?.cancel()
        receiveTask = nil
        heartbeatTask?.cancel()
        heartbeatTask = nil
        socket?.cancel()
        socket = nil
        socketID = nil
    }

    private func failProtocol() {
        stopTransport()
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
        default:
            state.requireManualRejoin()
            statusMessage = error.userMessage
        }
    }

    private func transitionToExpiredOrRevoked(message: String? = nil) {
        stopTransport()
        authority = nil
        pendingCommands.removeAll(keepingCapacity: false)
        state.expireOrRevoke()
        statusMessage = message ?? SessionModelError.expiredOrRevoked.userMessage
    }

    private func transitionToSessionEnded() {
        stopTransport()
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
