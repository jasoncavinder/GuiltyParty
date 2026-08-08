import Foundation

enum CompanionEnvironment {
    static let joinURL = URL(string: "https://api.test.guiltyparty.app/api/v1/join")!
    static let webSocketURL = URL(string: "wss://api.test.guiltyparty.app/ws/v1")!
    static let controlSubprotocol = "guiltyparty.control.v1"
    static let applicationID = "companion_ios"
    static let applicationVersion = "0.1.0"
    static let buildNumber: Int64 = 1
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

        let clientBuild = try GPV1ClientBuild(
            applicationId: GPV1FeatureIdentifier(CompanionEnvironment.applicationID),
            applicationVersion: CompanionEnvironment.applicationVersion,
            buildNumber: CompanionEnvironment.buildNumber
        )
        let endpoint = try GPV1EndpointRegistration(
            capabilities: [
                GPV1FeatureIdentifier("private_display"),
                GPV1FeatureIdentifier("touch_input")
            ],
            clientBuild: clientBuild,
            platform: GPV1FeatureIdentifier("ios_companion")
        )
        let body = GPV1JoinRequest.participant(
            try GPV1JoinRequestParticipant(
                displayName: nickname,
                endpoint: endpoint,
                kind: "participant",
                protocolVersion: GPV1ProtocolVersion()
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

    static func join(invitation: Invitation, displayName: String) async throws -> SessionAuthority {
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
            throw classifyHTTPFailure(status: http.statusCode, data: data)
        }
        guard http.value(forHTTPHeaderField: "Cache-Control")?.lowercased().contains("no-store") == true,
              case .authorizationHeader(let joined) = try JSONDecoder().decode(
                GPV1RemoteFriendsJoinResponse.self,
                from: data
              ),
              joined.sessionId.value == invitation.sessionID,
              let participantID = joined.participantId?.value,
              joined.authorityExpiresAtUnixMs > Int64(Date().timeIntervalSince1970 * 1_000)
        else {
            throw SessionModelError.invalidResponse
        }

        return SessionAuthority(
            sessionID: joined.sessionId.value,
            endpointID: joined.endpointId.value,
            participantID: participantID,
            bearer: joined.token.value,
            expiresAtUnixMilliseconds: joined.authorityExpiresAtUnixMs,
            primaryAuthorityGeneration: joined.primaryAuthorityGeneration,
            gameplayLanguage: invitation.gameplayLanguage
        )
    }

    private static func classifyHTTPFailure(status: Int, data: Data) -> SessionModelError {
        let problem = try? JSONDecoder().decode(GPV1ProblemDetails.self, from: data)
        let code = problem?.code ?? ""
        if status == 410 || code.contains("expired") || code.contains("revoked") || code.contains("invitation") {
            return .expiredOrRevoked
        }
        if code == "unsupported_client_build" || code == "upgrade_required" {
            return .commandRejected("This development build is no longer supported by the test service.")
        }
        return .commandRejected(problem?.title ?? "The session could not be joined.")
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
            task.sendPing { error in
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
                sessionID: projection.sessionId.value,
                endpointID: projection.endpointId.value,
                authority: authority
            )
            return .projection(projection)
        case .commandResult(let result):
            try validateContext(
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
                sessionID: sessionID,
                endpointID: endpointID,
                authority: authority
            )
            return .error(error)
        case .aiSuggestion:
            throw SessionModelError.protocolViolation
        }
    }

    static func projectionRequest(authority: SessionAuthority, messageID: String) throws -> Data {
        let envelope = GPV1ClientEnvelope.getProjection(
            try GPV1GetProjectionEnvelope(
                endpointId: GPV1Identifier(authority.endpointID),
                messageId: GPV1MessageIdentifier(messageID),
                payload: GPV1GetProjectionEnvelopePayload(),
                protocolVersion: GPV1ProtocolVersion(),
                sessionId: GPV1Identifier(authority.sessionID),
                type: "get_projection"
            )
        )
        return try JSONEncoder().encode(envelope)
    }

    private static func validateContext(
        sessionID: String,
        endpointID: String,
        authority: SessionAuthority
    ) throws {
        guard sessionID == authority.sessionID, endpointID == authority.endpointID else {
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
            throw SessionModelError.commandRejected("Enter the target character identifier supplied for this test.")
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
                protocolVersion: GPV1ProtocolVersion(),
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
