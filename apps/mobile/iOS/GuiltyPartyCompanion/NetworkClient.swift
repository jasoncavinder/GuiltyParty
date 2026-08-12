import Foundation

enum CompanionEnvironment {
    static let compatibilityURL = URL(string: "https://api.test.guiltyparty.app/api/protocol")!
    static let joinURL = URL(string: "https://api.test.guiltyparty.app/api/v1/join")!
    static let resumeURL = URL(string: "https://api.test.guiltyparty.app/api/v1/resume")!
    static let webSocketURL = URL(string: "wss://api.test.guiltyparty.app/ws/v1")!
    static let controlSubprotocol = "guiltyparty.control.v1"
    static let legacyProtocolVersion = "1.0"
    static let protocolVersion = "1.1"
    static let participantVotingFeature = "participant_vote_targets_v1"
    static let applicationID = "companion_ios"
    static let applicationVersion = "0.3.0"
    static let buildNumber: Int64 = 4
    static let maximumResponseBytes = 262_144

    static func shortRequestConfiguration() -> URLSessionConfiguration {
        let configuration = baseEphemeralConfiguration()
        configuration.timeoutIntervalForRequest = 15
        configuration.timeoutIntervalForResource = 20
        return configuration
    }

    static func webSocketConfiguration() -> URLSessionConfiguration {
        baseEphemeralConfiguration()
    }

    private static func baseEphemeralConfiguration() -> URLSessionConfiguration {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        configuration.httpShouldSetCookies = false
        configuration.httpCookieAcceptPolicy = .never
        return configuration
    }

    static func clientBuild() throws -> GPV1ClientBuild {
        try GPV1ClientBuild(
            applicationId: GPV1FeatureIdentifier(applicationID),
            applicationVersion: applicationVersion,
            buildNumber: buildNumber
        )
    }
}

enum CompatibilityClient {
    static func request() -> URLRequest {
        var request = URLRequest(
            url: CompanionEnvironment.compatibilityURL,
            cachePolicy: .reloadIgnoringLocalAndRemoteCacheData,
            timeoutInterval: 15
        )
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        return request
    }

    static func discover() async throws {
        let session = URLSession(
            configuration: CompanionEnvironment.shortRequestConfiguration(),
            delegate: RejectingRedirectDelegate(),
            delegateQueue: nil
        )
        defer { session.invalidateAndCancel() }
        let (data, response) = try await session.data(for: request())
        guard data.count <= CompanionEnvironment.maximumResponseBytes,
              let http = response as? HTTPURLResponse,
              http.statusCode == 200
        else {
            throw SessionModelError.unsupportedTransport
        }
        try validate(data)
    }

    static func validate(_ data: Data) throws {
        let compatibility = try JSONDecoder().decode(GPV1CompatibilityResponse.self, from: data)
        guard compatibility.requiredUpgrade == false,
              compatibility.supportedProtocolMajors.contains(1),
              compatibility.preferredProtocolVersion.value == CompanionEnvironment.protocolVersion,
              compatibility.features.map(\.value).contains(CompanionEnvironment.participantVotingFeature)
        else {
            throw SessionModelError.unsupportedTransport
        }
    }
}

final class RejectingRedirectDelegate: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest,
        completionHandler: @escaping (URLRequest?) -> Void
    ) {
        completionHandler(nil)
    }
}

enum JoinClient {
    static func request(invitation: Invitation, displayName: String) throws -> URLRequest {
        let nickname = displayName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...80).contains(nickname.unicodeScalars.count),
              nickname.range(of: "^[^\\u0000-\\u001F\\u007F-\\u009F]+$", options: .regularExpression) != nil
        else {
            throw SessionModelError.invalidDisplayName
        }

        let endpoint = try GPV1EndpointRegistration(
            capabilities: [
                GPV1FeatureIdentifier("private_display"),
                GPV1FeatureIdentifier("touch_input")
            ],
            clientBuild: CompanionEnvironment.clientBuild(),
            features: [GPV1FeatureIdentifier(CompanionEnvironment.participantVotingFeature)],
            platform: GPV1FeatureIdentifier("ios_companion")
        )
        let body = GPV1JoinRequest.participant(
            try GPV1JoinRequestParticipant(
                displayName: nickname,
                endpoint: endpoint,
                kind: "participant",
                protocolVersion: try GPV1ProtocolVersion(CompanionEnvironment.protocolVersion)
            )
        )

        var request = URLRequest(
            url: CompanionEnvironment.joinURL,
            cachePolicy: .reloadIgnoringLocalAndRemoteCacheData,
            timeoutInterval: 15
        )
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(invitation.sessionID, forHTTPHeaderField: "X-GP-Session-ID")
        request.setValue("Pairing \(invitation.pairingProof)", forHTTPHeaderField: "Authorization")
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        request.httpBody = try JSONEncoder().encode(body)
        return request
    }

    static func join(invitation: Invitation, displayName: String) async throws -> ParticipantSessionAdmission {
        try await CompatibilityClient.discover()
        let request = try request(invitation: invitation, displayName: displayName)
        let session = URLSession(
            configuration: CompanionEnvironment.shortRequestConfiguration(),
            delegate: RejectingRedirectDelegate(),
            delegateQueue: nil
        )
        defer { session.invalidateAndCancel() }
        let (data, response) = try await session.data(for: request)
        guard data.count <= CompanionEnvironment.maximumResponseBytes,
              let http = response as? HTTPURLResponse
        else {
            throw SessionModelError.invalidResponse
        }
        guard http.statusCode == 200 else {
            throw HTTPFailureClassifier.classify(status: http.statusCode, data: data)
        }
        return try decodeResponse(
            data,
            invitation: invitation,
            cacheControl: http.value(forHTTPHeaderField: "Cache-Control")
        )
    }

    static func decodeResponse(
        _ data: Data,
        invitation: Invitation,
        cacheControl: String?,
        nowUnixMilliseconds: Int64 = Int64(Date().timeIntervalSince1970 * 1_000)
    ) throws -> ParticipantSessionAdmission {
        guard cacheControl?.lowercased().contains("no-store") == true,
              case .authorizationHeader(let joined) = try JSONDecoder().decode(
                GPV1RemoteFriendsJoinResponse.self,
                from: data
              ),
              joined.sessionId.value == invitation.sessionID,
              joined.protocolVersion.value == CompanionEnvironment.protocolVersion,
              let participantID = joined.participantId?.value,
              joined.authorityExpiresAtUnixMs > nowUnixMilliseconds,
              joined.resumeExpiresAtUnixMs > nowUnixMilliseconds
        else {
            throw SessionModelError.invalidResponse
        }

        return ParticipantSessionAdmission(
            authority: SessionAuthority(
                sessionID: joined.sessionId.value,
                endpointID: joined.endpointId.value,
                participantID: participantID,
                bearer: joined.token.value,
                expiresAtUnixMilliseconds: joined.authorityExpiresAtUnixMs,
                primaryAuthorityGeneration: joined.primaryAuthorityGeneration,
                gameplayLanguage: invitation.gameplayLanguage,
                protocolVersion: joined.protocolVersion.value
            ),
            resumeCredential: StoredResumeCredential(
                token: joined.resumeToken.value,
                sessionID: joined.sessionId.value,
                endpointID: joined.endpointId.value,
                participantID: participantID,
                expiresAtUnixMilliseconds: joined.resumeExpiresAtUnixMs,
                primaryAuthorityGeneration: joined.primaryAuthorityGeneration,
                lastServerSequence: joined.serverSequence,
                pendingIdempotencyIDs: [],
                gameplayLanguage: invitation.gameplayLanguage,
                protocolVersion: joined.protocolVersion.value
            )
        )
    }
}

enum ResumeClient {
    static func request(credential: StoredResumeCredential) throws -> URLRequest {
        guard let replacementToken = credential.pendingReplacementToken,
              replacementToken != credential.token
        else {
            throw SessionModelError.protocolViolation
        }
        let body = try GPV1ParticipantResumeRequest(
            clientBuild: CompanionEnvironment.clientBuild(),
            endpointId: GPV1Identifier(credential.endpointID),
            lastServerSequence: credential.lastServerSequence,
            participantId: GPV1Identifier(credential.participantID),
            pendingIdempotencyIds: try credential.pendingIdempotencyIDs.map(GPV1MessageIdentifier.init),
            primaryAuthorityGeneration: credential.primaryAuthorityGeneration,
            protocolVersion: try GPV1ProtocolVersion(credential.negotiatedProtocolVersion),
            sessionId: GPV1Identifier(credential.sessionID)
        )
        var request = URLRequest(
            url: CompanionEnvironment.resumeURL,
            cachePolicy: .reloadIgnoringLocalAndRemoteCacheData,
            timeoutInterval: 15
        )
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Resume \(credential.token)", forHTTPHeaderField: "Authorization")
        request.setValue(replacementToken, forHTTPHeaderField: "X-GP-Replacement-Resume")
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        request.httpBody = try JSONEncoder().encode(body)
        return request
    }

    static func resume(_ credential: StoredResumeCredential) async throws -> ParticipantSessionAdmission {
        let request = try request(credential: credential)
        let session = URLSession(
            configuration: CompanionEnvironment.shortRequestConfiguration(),
            delegate: RejectingRedirectDelegate(),
            delegateQueue: nil
        )
        defer { session.invalidateAndCancel() }
        let (data, response) = try await session.data(for: request)
        guard data.count <= CompanionEnvironment.maximumResponseBytes,
              let http = response as? HTTPURLResponse
        else {
            throw SessionModelError.invalidResponse
        }
        guard http.statusCode == 200 else {
            throw HTTPFailureClassifier.classify(status: http.statusCode, data: data)
        }
        return try decodeResponse(
            data,
            previous: credential,
            cacheControl: http.value(forHTTPHeaderField: "Cache-Control")
        )
    }

    static func decodeResponse(
        _ data: Data,
        previous: StoredResumeCredential,
        cacheControl: String?,
        nowUnixMilliseconds: Int64 = Int64(Date().timeIntervalSince1970 * 1_000)
    ) throws -> ParticipantSessionAdmission {
        let resumed = try JSONDecoder().decode(GPV1RemoteNativeResumeResponse.self, from: data)
        guard let replacementToken = previous.pendingReplacementToken else {
            throw SessionModelError.invalidResponse
        }
        let requested = Set(previous.pendingIdempotencyIDs)
        let normalizedResults = resumed.pendingCommandResults.map { result in
            switch result {
            case .accepted(let accepted):
                return (accepted.idempotencyId.value, Optional(accepted.serverSequence))
            case .rejected(let rejected):
                return (rejected.idempotencyId.value, Optional(rejected.serverSequence))
            case .unknown(let unknown):
                return (unknown.idempotencyId.value, Optional<Int64>.none)
            }
        }
        let resolved = Set(normalizedResults.map(\.0))
        let resultsAreNotAhead = normalizedResults.allSatisfy { result in
            result.1.map { $0 <= resumed.serverSequence } ?? true
        }
        guard cacheControl?.lowercased().contains("no-store") == true,
              resumed.sessionId.value == previous.sessionID,
              resumed.endpointId.value == previous.endpointID,
              resumed.participantId.value == previous.participantID,
              resumed.protocolVersion.value == previous.negotiatedProtocolVersion,
              resumed.resumeToken.value == replacementToken,
              resumed.primaryAuthorityGeneration > previous.primaryAuthorityGeneration,
              resumed.authorityExpiresAtUnixMs > nowUnixMilliseconds,
              resumed.resumeExpiresAtUnixMs > nowUnixMilliseconds,
              resumed.serverSequence >= previous.lastServerSequence,
              resumed.pendingCommandResults.count == requested.count,
              resolved == requested,
              resultsAreNotAhead
        else {
            throw SessionModelError.invalidResponse
        }

        return ParticipantSessionAdmission(
            authority: SessionAuthority(
                sessionID: resumed.sessionId.value,
                endpointID: resumed.endpointId.value,
                participantID: resumed.participantId.value,
                bearer: resumed.token.value,
                expiresAtUnixMilliseconds: resumed.authorityExpiresAtUnixMs,
                primaryAuthorityGeneration: resumed.primaryAuthorityGeneration,
                gameplayLanguage: previous.gameplayLanguage,
                protocolVersion: resumed.protocolVersion.value
            ),
            resumeCredential: StoredResumeCredential(
                token: resumed.resumeToken.value,
                sessionID: resumed.sessionId.value,
                endpointID: resumed.endpointId.value,
                participantID: resumed.participantId.value,
                expiresAtUnixMilliseconds: resumed.resumeExpiresAtUnixMs,
                primaryAuthorityGeneration: resumed.primaryAuthorityGeneration,
                lastServerSequence: resumed.serverSequence,
                pendingIdempotencyIDs: [],
                gameplayLanguage: previous.gameplayLanguage,
                protocolVersion: resumed.protocolVersion.value
            )
        )
    }
}

enum HTTPFailureClassifier {
    static func classify(status: Int, data: Data) -> SessionModelError {
        let problem = try? JSONDecoder().decode(GPV1ProblemDetails.self, from: data)
        let code = problem?.code ?? ""
        if code == "session_ended" {
            return .sessionEnded
        }
        if status == 410 || status == 401 || code.contains("expired") || code.contains("revoked") || code.contains("invitation") || code.contains("resume") {
            return .expiredOrRevoked
        }
        if status == 429 || status >= 500 {
            return .connectionUnavailable
        }
        if code == "unsupported_client_build" || code == "upgrade_required" {
            return .commandRejected(
                String(localized: "This development build is no longer supported by the test service.")
            )
        }
        return .commandRejected(
            problem?.title ?? String(localized: "The session could not be joined.")
        )
    }
}

enum WebSocketRequestBuilder {
    static func request(authority: SessionAuthority) -> URLRequest {
        var request = URLRequest(
            url: CompanionEnvironment.webSocketURL,
            cachePolicy: .reloadIgnoringLocalAndRemoteCacheData,
            timeoutInterval: 10
        )
        request.setValue("Bearer \(authority.bearer)", forHTTPHeaderField: "Authorization")
        request.setValue(
            CompanionEnvironment.controlSubprotocol,
            forHTTPHeaderField: "Sec-WebSocket-Protocol"
        )
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        return request
    }
}

enum SocketLifecycleEvent: Equatable, Sendable {
    case opened(subprotocol: String?)
    case closed(code: Int)
    case failed
}

final class WebSocketDelegate: NSObject, URLSessionWebSocketDelegate, @unchecked Sendable {
    private let handler: @Sendable (SocketLifecycleEvent) -> Void

    init(handler: @escaping @Sendable (SocketLifecycleEvent) -> Void) {
        self.handler = handler
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?
    ) {
        handler(.opened(subprotocol: `protocol`))
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) {
        handler(.closed(code: closeCode.rawValue))
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: (any Error)?
    ) {
        if error != nil {
            handler(.failed)
        }
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest,
        completionHandler: @escaping (URLRequest?) -> Void
    ) {
        completionHandler(nil)
        handler(.failed)
    }
}

final class FirstPartyWebSocket: @unchecked Sendable {
    private let delegate: WebSocketDelegate
    private let session: URLSession
    private let task: URLSessionWebSocketTask

    init(
        request: URLRequest,
        lifecycleHandler: @escaping @Sendable (SocketLifecycleEvent) -> Void
    ) {
        let delegate = WebSocketDelegate(handler: lifecycleHandler)
        let session = URLSession(
            configuration: CompanionEnvironment.webSocketConfiguration(),
            delegate: delegate,
            delegateQueue: nil
        )
        self.delegate = delegate
        self.session = session
        task = session.webSocketTask(with: request)
        task.maximumMessageSize = CompanionEnvironment.maximumResponseBytes
    }

    var closeCode: Int {
        task.closeCode.rawValue
    }

    func start() {
        task.resume()
    }

    func send(_ data: Data) async throws {
        try await task.send(WebSocketControlFrame.message(from: data))
    }

    func receive() async throws -> Data {
        switch try await task.receive() {
        case .data(let data):
            guard data.count <= CompanionEnvironment.maximumResponseBytes else {
                throw SessionModelError.protocolViolation
            }
            return data
        case .string(let text):
            guard let data = text.data(using: .utf8),
                  data.count <= CompanionEnvironment.maximumResponseBytes
            else {
                throw SessionModelError.protocolViolation
            }
            return data
        @unknown default:
            throw SessionModelError.protocolViolation
        }
    }

    func ping() async throws {
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            let completionGate = OneShotCompletionGate()
            task.sendPing { error in
                guard completionGate.claim() else { return }
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }

    func cancel() {
        task.cancel(with: .goingAway, reason: nil)
        session.invalidateAndCancel()
    }
}

final class OneShotCompletionGate: @unchecked Sendable {
    private let lock = NSLock()
    private var claimed = false

    func claim() -> Bool {
        lock.lock()
        defer { lock.unlock() }
        guard !claimed else { return false }
        claimed = true
        return true
    }
}

enum WebSocketControlFrame {
    static func message(from data: Data) throws -> URLSessionWebSocketTask.Message {
        guard let text = String(data: data, encoding: .utf8) else {
            throw SessionModelError.protocolViolation
        }
        return .string(text)
    }
}

enum IncomingControlEvent: Equatable, Sendable {
    case projection(GPV1ProjectionEnvelope)
    case commandResult(GPV1CommandResultEnvelope)
    case error(GPV1ErrorEnvelope)
}

enum ControlPlaneCodec {
    static func decodeServerEvent(
        _ data: Data,
        authority: SessionAuthority
    ) throws -> IncomingControlEvent {
        let envelope = try JSONDecoder().decode(GPV1ServerEnvelope.self, from: data)
        switch envelope {
        case .projection(let projection):
            try validateContext(
                protocolVersion: projection.protocolVersion.value,
                sessionID: projection.sessionId.value,
                endpointID: projection.endpointId.value,
                authority: authority
            )
            return .projection(projection)
        case .commandResult(let result):
            try validateContext(
                protocolVersion: result.protocolVersion.value,
                sessionID: result.sessionId.value,
                endpointID: result.endpointId.value,
                authority: authority
            )
            return .commandResult(result)
        case .error(let error):
            guard let sessionID = error.sessionId?.value,
                  let endpointID = error.endpointId?.value
            else {
                throw SessionModelError.protocolViolation
            }
            try validateContext(
                protocolVersion: error.protocolVersion.value,
                sessionID: sessionID,
                endpointID: endpointID,
                authority: authority
            )
            return .error(error)
        case .aiSuggestion, .presentationStatus:
            throw SessionModelError.protocolViolation
        }
    }

    static func projectionRequest(authority: SessionAuthority, messageID: String) throws -> Data {
        let envelope = GPV1ClientEnvelope.getProjection(
            try GPV1GetProjectionEnvelope(
                endpointId: GPV1Identifier(authority.endpointID),
                messageId: GPV1MessageIdentifier(messageID),
                payload: GPV1GetProjectionEnvelopePayload(),
                protocolVersion: try GPV1ProtocolVersion(authority.protocolVersion),
                sessionId: GPV1Identifier(authority.sessionID),
                type: "get_projection"
            )
        )
        return try JSONEncoder().encode(envelope)
    }

    private static func validateContext(
        protocolVersion: String,
        sessionID: String,
        endpointID: String,
        authority: SessionAuthority
    ) throws {
        guard protocolVersion == authority.protocolVersion,
              sessionID == authority.sessionID,
              endpointID == authority.endpointID
        else {
            throw SessionModelError.protocolViolation
        }
    }
}

struct OutboundCommand: Equatable, Sendable {
    let messageID: String
    let idempotencyID: String
    let targetCharacterID: String
}

struct CommandFactory: Sendable {
    private let makeUUID: @Sendable () -> UUID

    init(makeUUID: @escaping @Sendable () -> UUID = UUID.init) {
        self.makeUUID = makeUUID
    }

    func castVote(targetCharacterID: String) throws -> OutboundCommand {
        let target = targetCharacterID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard (1...128).contains(target.unicodeScalars.count) else {
            throw SessionModelError.commandRejected(
                String(localized: "That voting choice is not available.")
            )
        }
        return OutboundCommand(
            messageID: identifier(prefix: "msg"),
            idempotencyID: identifier(prefix: "cmd"),
            targetCharacterID: target
        )
    }

    func retry(_ command: OutboundCommand) -> OutboundCommand {
        OutboundCommand(
            messageID: identifier(prefix: "msg"),
            idempotencyID: command.idempotencyID,
            targetCharacterID: command.targetCharacterID
        )
    }

    func encode(_ command: OutboundCommand, authority: SessionAuthority) throws -> Data {
        let vote = try GPV1CastVoteCommand(
            targetCharacterId: GPV1Identifier(command.targetCharacterID),
            type: "cast_vote"
        )
        let envelope = GPV1ClientEnvelope.submitCommand(
            try GPV1SubmitCommandEnvelope(
                endpointId: GPV1Identifier(authority.endpointID),
                idempotencyId: GPV1MessageIdentifier(command.idempotencyID),
                messageId: GPV1MessageIdentifier(command.messageID),
                payload: GPV1SubmitCommandEnvelopePayload(command: .castVote(vote)),
                primaryAuthorityGeneration: authority.primaryAuthorityGeneration,
                protocolVersion: try GPV1ProtocolVersion(authority.protocolVersion),
                sessionId: GPV1Identifier(authority.sessionID),
                type: "submit_command"
            )
        )
        return try JSONEncoder().encode(envelope)
    }

    private func identifier(prefix: String) -> String {
        "\(prefix)_\(makeUUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased())"
    }
}
