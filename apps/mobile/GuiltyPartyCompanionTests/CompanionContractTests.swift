import Foundation
import Security
import XCTest
@testable import GuiltyPartyCompanion

final class InvitationDecoderTests: XCTestCase {
    func testValidGP1TransferPreservesRequiredFields() throws {
        let payload = try makeInvitationPayload(expiresAt: 2_000_000_000_000)
        let invitation = try InvitationDecoder.decode(payload, nowUnixMilliseconds: 1_000)

        XCTAssertEqual(invitation.sessionID, "session_123456789")
        XCTAssertEqual(invitation.pairingProof, "pairing-proof-1234")
        XCTAssertEqual(invitation.expiresAtUnixMilliseconds, 2_000_000_000_000)
        XCTAssertEqual(invitation.gameplayLanguage, "en-US")
    }

    func testRejectsMalformedUnsupportedAndURLInvitations() throws {
        XCTAssertThrowsError(try InvitationDecoder.decode("https://example.test/GP1.secret"))
        XCTAssertThrowsError(try InvitationDecoder.decode("GP2.abc"))
        XCTAssertThrowsError(try InvitationDecoder.decode("GP1.%%%"))
    }

    func testRejectsExpiredInvitation() throws {
        let payload = try makeInvitationPayload(expiresAt: 999)
        XCTAssertThrowsError(
            try InvitationDecoder.decode(payload, nowUnixMilliseconds: 1_000)
        ) { error in
            XCTAssertEqual(error as? SessionModelError, .expiredInvitation)
        }
    }

    func testRejectsAdditiveInvitationFieldsAndInvalidLanguage() throws {
        XCTAssertThrowsError(
            try InvitationDecoder.decode(
                try makeInvitationPayload(
                    expiresAt: 2_000,
                    additions: ["unexpected": true]
                ),
                nowUnixMilliseconds: 1_000
            )
        )
        XCTAssertThrowsError(
            try InvitationDecoder.decode(
                try makeInvitationPayload(
                    expiresAt: 2_000,
                    additions: ["gameplay_language": "not a language tag!"]
                ),
                nowUnixMilliseconds: 1_000
            )
        )
    }

    private func makeInvitationPayload(
        expiresAt: Int64,
        additions: [String: Any] = [:]
    ) throws -> String {
        var value: [String: Any] = [
            "version": "1",
            "session_id": "session_123456789",
            "pairing_code": "pairing-proof-1234",
            "expires_at_unix_ms": expiresAt,
            "gameplay_language": "en-US"
        ]
        value.merge(additions) { _, new in new }
        let data = try JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
        return "GP1." + data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

final class GeneratedContractTests: XCTestCase {
    func testGeneratedJoinModelDecodesAndEncodesSharedPositiveFixture() throws {
        let data = try fixture("join-participant-request")
        let decoded = try JSONDecoder().decode(GPV1JoinRequest.self, from: data)
        guard case .participant(let participant) = decoded else {
            return XCTFail("Expected participant request")
        }
        XCTAssertEqual(participant.endpoint.platform.value, "ios")
        XCTAssertEqual(participant.endpoint.clientBuild?.applicationId.value, "companion_ios")
        XCTAssertNoThrow(try JSONEncoder().encode(decoded))
    }

    func testGeneratedParticipantProjectionRoundTripsPrivacyFixture() throws {
        let data = try fixture("participant-projection")
        let decoded = try JSONDecoder().decode(GPV1ServerEnvelope.self, from: data)
        guard case .projection(let envelope) = decoded else {
            return XCTFail("Expected projection")
        }
        XCTAssertEqual(envelope.serverSequence, 8)
        XCTAssertEqual(envelope.payload.projection.revealedClues.count, 1)
        XCTAssertNoThrow(try JSONEncoder().encode(decoded))
    }

    func testGeneratedResumeModelsRoundTripSharedFixtures() throws {
        let request = try JSONDecoder().decode(
            GPV1ParticipantResumeRequest.self,
            from: fixture("participant-resume-request")
        )
        XCTAssertEqual(request.lastServerSequence, 8)
        XCTAssertEqual(request.pendingIdempotencyIds.map(\.value), ["idempotency-synthetic-001"])
        XCTAssertNoThrow(try JSONEncoder().encode(request))

        let response = try JSONDecoder().decode(
            GPV1RemoteNativeResumeResponse.self,
            from: fixture("participant-resume-response")
        )
        XCTAssertEqual(response.primaryAuthorityGeneration, 4)
        guard let first = response.pendingCommandResults.first,
              case .accepted(let accepted) = first
        else {
            return XCTFail("Expected an accepted resumed command result")
        }
        XCTAssertEqual(accepted.status, "accepted")
        XCTAssertNoThrow(try JSONEncoder().encode(response))
    }

    func testAdditiveFieldsRemainCompatible() throws {
        let decoded = try JSONDecoder().decode(
            GPV1ClientEnvelope.self,
            from: fixture("get-projection-additive-field")
        )
        guard case .getProjection(let envelope) = decoded else {
            return XCTFail("Expected projection request")
        }
        XCTAssertEqual(envelope.messageId.value, "message-client-001")
    }

    func testUnknownCriticalVariantIsRejected() throws {
        XCTAssertThrowsError(
            try JSONDecoder().decode(
                GPV1ClientEnvelope.self,
                from: fixture("unknown-message-type")
            )
        ) { error in
            guard case GPContractError.unsupportedVariant(let field, let value) = error else {
                return XCTFail("Expected unsupported variant")
            }
            XCTAssertEqual(field, "type")
            XCTAssertEqual(value, "silently_change_story_truth")
        }
    }

    func testPortableIntegerMaximumIsEnforced() throws {
        let data = Data("""
        {
          "protocol_version":"1.0",
          "type":"projection",
          "message_id":"m",
          "session_id":"s",
          "endpoint_id":"e",
          "server_sequence":9007199254740992,
          "payload":{"projection":{
            "scenario_id":"scenario","scenario_version":1,"scenario_title":"Synthetic",
            "active_scene":null,"revealed_clues":[],"participants":[],
            "voting_open":false,"votes_cast":0,"outcome":null
          }}
        }
        """.utf8)
        XCTAssertThrowsError(try JSONDecoder().decode(GPV1ServerEnvelope.self, from: data))
    }

    func testRequiredPrivateObjectiveCannotBeExplicitNull() throws {
        XCTAssertThrowsError(
            try JSONDecoder().decode(
                GPV1ProjectedParticipant.self,
                from: fixture("private-objective-null")
            )
        )
    }

    func testStagePrivacyFixtureContainsNoParticipantPrivateFields() throws {
        let data = try fixture("stage-projection")
        let text = try XCTUnwrap(String(data: data, encoding: .utf8))
        XCTAssertFalse(text.contains("private_objective"))
        XCTAssertFalse(text.contains("has_voted"))
        XCTAssertNoThrow(try JSONDecoder().decode(GPV1ServerEnvelope.self, from: data))
    }
}

final class ProjectionBoundaryTests: XCTestCase {
    func testParticipantProjectionMapsOnlyOwnPrivateState() throws {
        let envelope = try participantEnvelope()
        let projection = try ProjectionValidator.participantProjection(
            from: envelope,
            authority: authority()
        )
        XCTAssertEqual(projection.assignedCharacter, "Curator")
        XCTAssertEqual(projection.privateObjective, "SYNTHETIC_OWN_PRIVATE_OBJECTIVE")
        XCTAssertTrue(projection.ownVoteRecorded)
        XCTAssertEqual(projection.clues.first?.description, "SYNTHETIC_OWN_PRIVATE_CLUE")
    }

    func testRejectsPrivateFieldsScopedToAnotherParticipant() throws {
        var object = try XCTUnwrap(
            try JSONSerialization.jsonObject(with: fixture("participant-projection"))
                as? [String: Any]
        )
        var payload = try XCTUnwrap(object["payload"] as? [String: Any])
        var projection = try XCTUnwrap(payload["projection"] as? [String: Any])
        var participants = try XCTUnwrap(projection["participants"] as? [[String: Any]])
        participants[1]["private_objective"] = "SYNTHETIC_OTHER_PRIVATE_OBJECTIVE"
        projection["participants"] = participants
        payload["projection"] = projection
        object["payload"] = payload
        let data = try JSONSerialization.data(withJSONObject: object)
        let decoded = try JSONDecoder().decode(GPV1ServerEnvelope.self, from: data)
        guard case .projection(let envelope) = decoded else {
            return XCTFail("Expected projection")
        }

        XCTAssertThrowsError(
            try ProjectionValidator.participantProjection(from: envelope, authority: authority())
        ) { error in
            XCTAssertEqual(error as? SessionModelError, .recipientBoundaryViolation)
        }
    }

    private func participantEnvelope() throws -> GPV1ProjectionEnvelope {
        let decoded = try JSONDecoder().decode(
            GPV1ServerEnvelope.self,
            from: fixture("participant-projection")
        )
        guard case .projection(let envelope) = decoded else {
            throw SessionModelError.invalidResponse
        }
        return envelope
    }
}

final class SessionStateMachineTests: XCTestCase {
    func testConnectionTransitionsThroughWaitingConnectedAndRejoined() throws {
        let firstSocket = UUID()
        var machine = SessionStateMachine()
        machine.beginJoin()
        XCTAssertEqual(machine.phase, .joining)
        machine.beginSocket(id: firstSocket, isRejoin: false)
        try machine.applyProjection(projection(assigned: false), sequence: 2, socketID: firstSocket)
        XCTAssertEqual(machine.phase, .waitingForAssignment)

        machine.interrupt(.connectionUncertain)
        XCTAssertNil(machine.projection)
        XCTAssertTrue(machine.needsFreshProjection)
        XCTAssertEqual(machine.phase, .reconnecting)

        let secondSocket = UUID()
        machine.beginSocket(id: secondSocket, isRejoin: true)
        try machine.applyProjection(projection(assigned: true), sequence: 3, socketID: secondSocket)
        XCTAssertEqual(machine.phase, .rejoined)
        machine.settleRejoinedState()
        XCTAssertEqual(machine.phase, .connected)
    }

    func testRejectsStaleSocketEvent() throws {
        var machine = SessionStateMachine()
        machine.beginJoin()
        machine.beginSocket(id: UUID(), isRejoin: false)
        XCTAssertThrowsError(
            try machine.applyProjection(projection(assigned: true), sequence: 1, socketID: UUID())
        ) { error in
            XCTAssertEqual(error as? SessionModelError, .staleSocketEvent)
        }
    }

    func testRejectsSequenceRegression() throws {
        let socket = UUID()
        var machine = SessionStateMachine()
        machine.beginJoin()
        machine.beginSocket(id: socket, isRejoin: false)
        try machine.applyProjection(projection(assigned: true), sequence: 10, socketID: socket)
        XCTAssertThrowsError(
            try machine.applyProjection(projection(assigned: true), sequence: 9, socketID: socket)
        ) { error in
            XCTAssertEqual(error as? SessionModelError, .sequenceRegression)
        }
    }

    func testRejectsConnectedSequenceGapButAllowsFreshProjectionJump() throws {
        let socket = UUID()
        var machine = SessionStateMachine()
        machine.beginJoin()
        machine.beginSocket(id: socket, isRejoin: false)
        try machine.applyProjection(projection(assigned: true), sequence: 10, socketID: socket)
        XCTAssertThrowsError(
            try machine.acceptServerSequence(12, socketID: socket)
        ) { error in
            XCTAssertEqual(error as? SessionModelError, .sequenceGap)
        }

        machine.interrupt(.connectionUncertain)
        let rejoinedSocket = UUID()
        machine.beginSocket(id: rejoinedSocket, isRejoin: true)
        XCTAssertNoThrow(
            try machine.applyProjection(
                projection(assigned: true),
                sequence: 20,
                socketID: rejoinedSocket
            )
        )
    }

    func testRestartedSocketRejectsProjectionBeforeResumedBaseline() throws {
        let socket = UUID()
        var machine = SessionStateMachine()
        machine.beginJoin()
        machine.beginSocket(
            id: socket,
            isRejoin: true,
            baselineServerSequence: 20
        )

        XCTAssertThrowsError(
            try machine.applyProjection(
                projection(assigned: true),
                sequence: 19,
                socketID: socket
            )
        ) { error in
            XCTAssertEqual(error as? SessionModelError, .sequenceRegression)
        }
        XCTAssertNoThrow(
            try machine.applyProjection(
                projection(assigned: true),
                sequence: 20,
                socketID: socket
            )
        )
    }

    func testBackgroundAndCaptureClearPrivateProjection() throws {
        for reason in [PrivacyInterruption.backgroundOrLock, .capture] {
            let socket = UUID()
            var machine = SessionStateMachine()
            machine.beginJoin()
            machine.beginSocket(id: socket, isRejoin: false)
            try machine.applyProjection(projection(assigned: true), sequence: 1, socketID: socket)
            XCTAssertNotNil(machine.projection)
            machine.interrupt(reason)
            XCTAssertNil(machine.projection)
            XCTAssertTrue(machine.needsFreshProjection)
            XCTAssertEqual(machine.privacyInterruption, reason)
        }
    }

    func testReconnectCannotRevealWithoutFreshProjection() throws {
        let socket = UUID()
        var machine = SessionStateMachine()
        machine.beginJoin()
        machine.beginSocket(id: socket, isRejoin: false)
        try machine.applyProjection(projection(assigned: true), sequence: 1, socketID: socket)
        machine.interrupt(.connectionUncertain)
        machine.beginSocket(id: UUID(), isRejoin: true)
        XCTAssertNil(machine.projection)
        XCTAssertTrue(machine.needsFreshProjection)
        XCTAssertEqual(machine.phase, .reconnecting)
    }

    func testAuthenticatedInactivityShieldRetainsSocketForFreshProjection() throws {
        let socket = UUID()
        var machine = SessionStateMachine()
        machine.beginJoin()
        machine.beginSocket(id: socket, isRejoin: false)
        try machine.applyProjection(projection(assigned: true), sequence: 4, socketID: socket)

        try machine.markConnectionUncertain(socketID: socket)

        XCTAssertNil(machine.projection)
        XCTAssertTrue(machine.needsFreshProjection)
        XCTAssertEqual(machine.privacyInterruption, .connectionUncertain)
        XCTAssertEqual(machine.socketID, socket)
        XCTAssertNoThrow(
            try machine.applyProjection(
                projection(assigned: true),
                sequence: 9,
                socketID: socket
            )
        )
        XCTAssertEqual(machine.phase, .rejoined)
    }
}

final class CommandAndRequestTests: XCTestCase {
    func testIdempotentRetryUsesNewMessageIDAndSameEndpointScopedID() throws {
        let factory = CommandFactory()
        let original = try factory.castVote(targetCharacterID: "character-synthetic-002")
        let retry = factory.retry(original)
        XCTAssertNotEqual(original.messageID, retry.messageID)
        XCTAssertEqual(original.idempotencyID, retry.idempotencyID)
        XCTAssertEqual(original.targetCharacterID, retry.targetCharacterID)

        let secondCommand = try factory.castVote(targetCharacterID: "character-synthetic-002")
        XCTAssertNotEqual(original.messageID, secondCommand.messageID)
        XCTAssertNotEqual(original.idempotencyID, secondCommand.idempotencyID)
    }

    func testJoinRequestUsesNativeHeadersAndBuildMetadataWithoutOrigin() throws {
        let request = try JoinClient.request(
            invitation: Invitation(
                sessionID: "session_123456789",
                pairingProof: "pairing-proof-1234",
                expiresAtUnixMilliseconds: 2_000_000_000_000,
                gameplayLanguage: "en"
            ),
            displayName: "Synthetic Player"
        )
        XCTAssertEqual(request.url, CompanionEnvironment.joinURL)
        XCTAssertNil(request.url?.query)
        XCTAssertNil(request.value(forHTTPHeaderField: "Origin"))
        XCTAssertEqual(request.value(forHTTPHeaderField: "X-GP-Session-ID"), "session_123456789")
        XCTAssertTrue(request.value(forHTTPHeaderField: "Authorization")?.hasPrefix("Pairing ") == true)

        let body = try XCTUnwrap(request.httpBody)
        let decoded = try JSONDecoder().decode(GPV1JoinRequest.self, from: body)
        guard case .participant(let participant) = decoded else {
            return XCTFail("Expected participant join")
        }
        XCTAssertEqual(participant.endpoint.platform.value, "ios_companion")
        XCTAssertEqual(
            participant.endpoint.capabilities.map(\.value),
            ["private_display", "touch_input"]
        )
        XCTAssertEqual(participant.endpoint.clientBuild?.applicationId.value, "companion_ios")
        XCTAssertEqual(participant.endpoint.clientBuild?.applicationVersion, "0.2.0")
        XCTAssertEqual(participant.endpoint.clientBuild?.buildNumber, 3)
    }

    func testResumeRequestUsesDedicatedHeaderAndContainsOnlyOpaqueMetadata() throws {
        let credential = resumeCredential()
        let request = try ResumeClient.request(credential: credential)

        XCTAssertEqual(request.url, CompanionEnvironment.resumeURL)
        XCTAssertNil(request.url?.query)
        XCTAssertNil(request.value(forHTTPHeaderField: "Origin"))
        XCTAssertEqual(
            request.value(forHTTPHeaderField: "Authorization"),
            "Resume synthetic-device-only-resume-token"
        )
        XCTAssertEqual(
            request.value(forHTTPHeaderField: "X-GP-Replacement-Resume"),
            "synthetic-device-only-rotated-resume-token"
        )
        let body = try XCTUnwrap(request.httpBody)
        let text = try XCTUnwrap(String(data: body, encoding: .utf8))
        XCTAssertFalse(text.contains(credential.token))
        XCTAssertFalse(text.contains("private_objective"))
        XCTAssertFalse(text.contains("clue"))
        XCTAssertFalse(text.contains("target_character"))

        let decoded = try JSONDecoder().decode(GPV1ParticipantResumeRequest.self, from: body)
        XCTAssertEqual(decoded.endpointId.value, credential.endpointID)
        XCTAssertEqual(decoded.pendingIdempotencyIds.map(\.value), credential.pendingIdempotencyIDs)
        XCTAssertEqual(decoded.clientBuild.applicationVersion, "0.2.0")
        XCTAssertEqual(decoded.clientBuild.buildNumber, 3)
    }

    func testResumeRequestRequiresDurablyStagedReplacement() throws {
        let credential = StoredResumeCredential(
            token: "synthetic-device-only-resume-token",
            sessionID: "session-synthetic-001",
            endpointID: "endpoint-synthetic-player-001",
            participantID: "participant-synthetic-001",
            expiresAtUnixMilliseconds: 2_000_000_000_000,
            primaryAuthorityGeneration: 3,
            lastServerSequence: 8,
            pendingIdempotencyIDs: [],
            gameplayLanguage: "en"
        )
        XCTAssertThrowsError(try ResumeClient.request(credential: credential))
    }

    func testResumeResponseRotatesAuthorityWithoutChangingIdentity() throws {
        let admission = try ResumeClient.decodeResponse(
            fixture("participant-resume-response"),
            previous: resumeCredential(),
            cacheControl: "private, no-store",
            nowUnixMilliseconds: 1_000
        )

        XCTAssertEqual(admission.authority.sessionID, "session-synthetic-001")
        XCTAssertEqual(admission.authority.endpointID, "endpoint-synthetic-player-001")
        XCTAssertEqual(admission.authority.participantID, "participant-synthetic-001")
        XCTAssertEqual(admission.authority.primaryAuthorityGeneration, 4)
        XCTAssertEqual(admission.resumeCredential.lastServerSequence, 9)
        XCTAssertEqual(admission.resumeCredential.pendingIdempotencyIDs, [])
        XCTAssertEqual(
            admission.resumeCredential.token,
            "synthetic-device-only-rotated-resume-token"
        )
    }

    func testResumeResponseRejectsIdentitySubstitutionAndMissingPendingResult() throws {
        var object = try XCTUnwrap(
            try JSONSerialization.jsonObject(with: fixture("participant-resume-response"))
                as? [String: Any]
        )
        object["endpoint_id"] = "endpoint-attacker"
        let substituted = try JSONSerialization.data(withJSONObject: object)
        XCTAssertThrowsError(
            try ResumeClient.decodeResponse(
                substituted,
                previous: resumeCredential(),
                cacheControl: "no-store",
                nowUnixMilliseconds: 1_000
            )
        )

        object["endpoint_id"] = "endpoint-synthetic-player-001"
        object["pending_command_results"] = []
        let incomplete = try JSONSerialization.data(withJSONObject: object)
        XCTAssertThrowsError(
            try ResumeClient.decodeResponse(
                incomplete,
                previous: resumeCredential(),
                cacheControl: "no-store",
                nowUnixMilliseconds: 1_000
            )
        )
    }

    func testResumeCredentialSerializationHasOnlyApprovedOpaqueFields() throws {
        let data = try JSONEncoder().encode(resumeCredential())
        let object = try XCTUnwrap(
            JSONSerialization.jsonObject(with: data) as? [String: Any]
        )
        XCTAssertEqual(
            Set(object.keys),
            Set([
                "token", "sessionID", "endpointID", "participantID",
                "expiresAtUnixMilliseconds", "primaryAuthorityGeneration",
                "lastServerSequence", "pendingIdempotencyIDs", "gameplayLanguage",
                "pendingReplacementToken",
            ])
        )
        let text = try XCTUnwrap(String(data: data, encoding: .utf8))
        XCTAssertFalse(text.contains("privateObjective"))
        XCTAssertFalse(text.contains("revealedClues"))
        XCTAssertFalse(text.contains("targetCharacterID"))
    }

    func testKeychainPolicyIsDeviceOnlyNonSynchronizingAndUnlockedOnly() {
        let query = KeychainResumeCredentialStore.baseQuery()
        XCTAssertEqual(
            query[kSecAttrSynchronizable as String] as? Bool,
            false
        )
        let attributes = KeychainResumeCredentialStore.saveAttributes(data: Data("synthetic".utf8))
        XCTAssertEqual(
            attributes[kSecAttrAccessible as String] as? String,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly as String
        )
    }

    func testWebSocketRequestKeepsBearerOutOfURLAndOffersProtocol() {
        let request = WebSocketRequestBuilder.request(authority: authority())
        XCTAssertEqual(request.url, CompanionEnvironment.webSocketURL)
        XCTAssertNil(request.url?.query)
        XCTAssertTrue(request.value(forHTTPHeaderField: "Authorization")?.hasPrefix("Bearer ") == true)
        XCTAssertEqual(
            request.value(forHTTPHeaderField: "Sec-WebSocket-Protocol"),
            "guiltyparty.control.v1"
        )
    }

    func testWebSocketControlPayloadUsesTextFrame() throws {
        let data = Data(#"{"type":"get_projection"}"#.utf8)

        switch try WebSocketControlFrame.message(from: data) {
        case .string(let text):
            XCTAssertEqual(text, #"{"type":"get_projection"}"#)
        case .data:
            XCTFail("Control-plane JSON must use a WebSocket text frame")
        @unknown default:
            XCTFail("Unsupported WebSocket message frame")
        }

        XCTAssertThrowsError(try WebSocketControlFrame.message(from: Data([0xFF]))) { error in
            XCTAssertEqual(error as? SessionModelError, .protocolViolation)
        }
    }

    func testPingCompletionCanBeClaimedOnlyOnceAcrossConcurrentCallbacks() {
        let gate = OneShotCompletionGate()
        let counter = LockedClaimCounter()

        DispatchQueue.concurrentPerform(iterations: 100) { _ in
            if gate.claim() {
                counter.increment()
            }
        }

        XCTAssertEqual(counter.value, 1)
        XCTAssertFalse(gate.claim())
    }

    func testShortRequestAndWebSocketUseDistinctResourceTimeouts() {
        let shortRequest = CompanionEnvironment.shortRequestConfiguration()
        let webSocket = CompanionEnvironment.webSocketConfiguration()

        XCTAssertEqual(shortRequest.timeoutIntervalForRequest, 15)
        XCTAssertEqual(shortRequest.timeoutIntervalForResource, 20)
        XCTAssertGreaterThan(webSocket.timeoutIntervalForResource, 4 * 60 * 60)
    }

    func testWebSocketTaskCompletionErrorProducesFailedLifecycleEvent() {
        let recorder = SocketEventRecorder()
        let delegate = WebSocketDelegate { event in
            recorder.record(event)
        }
        let session = URLSession(configuration: .ephemeral)
        defer { session.invalidateAndCancel() }
        let task = session.webSocketTask(with: URL(string: "wss://example.invalid")!)

        delegate.urlSession(
            session,
            task: task,
            didCompleteWithError: URLError(.cannotConnectToHost)
        )
        delegate.urlSession(session, task: task, didCompleteWithError: nil)

        XCTAssertEqual(recorder.snapshot, [.failed])
    }

    func testAuthorityBearingTransportsRejectRedirects() throws {
        let session = URLSession(configuration: .ephemeral)
        defer { session.invalidateAndCancel() }
        let originalURL = try XCTUnwrap(URL(string: "https://api.test.guiltyparty.app/api/v1/join"))
        let redirectURL = try XCTUnwrap(URL(string: "https://redirect.invalid/join"))
        let response = try XCTUnwrap(
            HTTPURLResponse(
                url: originalURL,
                statusCode: 307,
                httpVersion: "HTTP/1.1",
                headerFields: ["Location": redirectURL.absoluteString]
            )
        )
        let redirectedRequest = URLRequest(url: redirectURL)

        let joinDecision = RedirectDecisionRecorder()
        RejectingRedirectDelegate().urlSession(
            session,
            task: session.dataTask(with: originalURL),
            willPerformHTTPRedirection: response,
            newRequest: redirectedRequest
        ) { request in
            joinDecision.record(request)
        }

        let socketEvents = SocketEventRecorder()
        let socketDecision = RedirectDecisionRecorder()
        let webSocketDelegate = WebSocketDelegate { event in
            socketEvents.record(event)
        }
        webSocketDelegate.urlSession(
            session,
            task: session.webSocketTask(with: WebSocketRequestBuilder.request(authority: authority())),
            willPerformHTTPRedirection: response,
            newRequest: redirectedRequest
        ) { request in
            socketDecision.record(request)
        }

        XCTAssertEqual(joinDecision.snapshot, [true])
        XCTAssertEqual(socketDecision.snapshot, [true])
        XCTAssertEqual(socketEvents.snapshot, [.failed])
    }

    func testCastVoteEnvelopeCarriesCurrentGenerationAndNoCredential() throws {
        let factory = CommandFactory()
        let command = try factory.castVote(targetCharacterID: "character-synthetic-002")
        let data = try factory.encode(command, authority: authority())
        let text = try XCTUnwrap(String(data: data, encoding: .utf8))
        XCTAssertFalse(text.contains("synthetic-memory-only-bearer"))
        let envelope = try JSONDecoder().decode(GPV1ClientEnvelope.self, from: data)
        guard case .submitCommand(let submit) = envelope else {
            return XCTFail("Expected submit command")
        }
        XCTAssertEqual(submit.primaryAuthorityGeneration, 3)
        XCTAssertEqual(submit.idempotencyId.value, command.idempotencyID)
        guard case .castVote(let vote) = submit.payload.command else {
            return XCTFail("Expected cast vote")
        }
        XCTAssertEqual(vote.targetCharacterId.value, "character-synthetic-002")
    }
}

final class ReconnectBackoffTests: XCTestCase {
    func testDelayGrowsUntilRecoveryExplicitlyResetsIt() {
        var backoff = ReconnectBackoff()

        XCTAssertEqual(
            (0..<8).map { _ in backoff.nextMaximumDelaySeconds() },
            [1, 2, 4, 8, 15, 30, 30, 30]
        )
        XCTAssertEqual(backoff.attempt, 8)

        backoff.reset()

        XCTAssertEqual(backoff.attempt, 0)
        XCTAssertEqual(backoff.nextMaximumDelaySeconds(), 1)
    }
}

final class ResumeCredentialLifecycleTests: XCTestCase {
    @MainActor
    func testManualRejoinDeletesSavedResumeAuthority() {
        let store = MemoryResumeCredentialStore(value: resumeCredential())
        let session = CompanionSession(
            credentialStore: store,
            automaticallyResume: false
        )

        XCTAssertEqual(session.phase, .joining)
        session.manualRejoin()

        XCTAssertEqual(session.phase, .manualRejoin)
        XCTAssertNil(store.value)
    }

    @MainActor
    func testExpiredSavedResumeAuthorityIsDeletedAtLaunch() {
        let expired = StoredResumeCredential(
            token: "synthetic-expired-device-only-resume-token",
            sessionID: "session-synthetic-001",
            endpointID: "endpoint-synthetic-player-001",
            participantID: "participant-synthetic-001",
            expiresAtUnixMilliseconds: 1,
            primaryAuthorityGeneration: 3,
            lastServerSequence: 8,
            pendingIdempotencyIDs: [],
            gameplayLanguage: "en"
        )
        let store = MemoryResumeCredentialStore(value: expired)
        let session = CompanionSession(
            credentialStore: store,
            automaticallyResume: false
        )

        XCTAssertEqual(session.phase, .manualRejoin)
        XCTAssertNil(store.value)
    }
}

final class ConnectionHealthPolicyTests: XCTestCase {
    func testNegotiationAndStabilityDurationsMatchAcceptedPolicy() {
        XCTAssertEqual(ConnectionHealthPolicy.negotiationTimeout, .seconds(5))
        XCTAssertEqual(ConnectionHealthPolicy.privacyShieldDelay, .seconds(30))
        XCTAssertEqual(ConnectionHealthPolicy.disconnectDelay, .seconds(45))
        XCTAssertEqual(ConnectionHealthPolicy.stableConnectionDuration, .seconds(60))
    }

    func testAuthenticatedInactivityTransitionsFromHealthyToShieldedToDisconnected() {
        XCTAssertEqual(ConnectionHealthPolicy.action(after: .seconds(29)), .healthy)
        XCTAssertEqual(ConnectionHealthPolicy.action(after: .seconds(30)), .shield)
        XCTAssertEqual(ConnectionHealthPolicy.action(after: .seconds(44)), .shield)
        XCTAssertEqual(ConnectionHealthPolicy.action(after: .seconds(45)), .disconnect)
    }
}

private func fixture(_ name: String) throws -> Data {
    let bundle = Bundle(for: GeneratedContractTests.self)
    let url = try XCTUnwrap(bundle.url(forResource: name, withExtension: "json"))
    return try Data(contentsOf: url)
}

private func authority() -> SessionAuthority {
    SessionAuthority(
        sessionID: "session-synthetic-001",
        endpointID: "endpoint-synthetic-player-001",
        participantID: "participant-synthetic-001",
        bearer: "synthetic-memory-only-bearer",
        expiresAtUnixMilliseconds: 2_000_000_000_000,
        primaryAuthorityGeneration: 3,
        gameplayLanguage: "en"
    )
}

private func resumeCredential() -> StoredResumeCredential {
    StoredResumeCredential(
        token: "synthetic-device-only-resume-token",
        sessionID: "session-synthetic-001",
        endpointID: "endpoint-synthetic-player-001",
        participantID: "participant-synthetic-001",
        expiresAtUnixMilliseconds: 2_000_000_000_000,
        primaryAuthorityGeneration: 3,
        lastServerSequence: 8,
        pendingIdempotencyIDs: ["idempotency-synthetic-001"],
        gameplayLanguage: "en",
        pendingReplacementToken: "synthetic-device-only-rotated-resume-token"
    )
}

private func projection(assigned: Bool) -> ParticipantProjection {
    ParticipantProjection(
        scenarioTitle: "Synthetic",
        gameplayLanguage: "en",
        assignedCharacter: assigned ? "Curator" : nil,
        privateObjective: assigned ? "Synthetic private objective" : nil,
        clues: [],
        scene: nil,
        votingOpen: false,
        ownVoteRecorded: false,
        votesCast: 0,
        publicOutcome: nil
    )
}

private final class SocketEventRecorder: @unchecked Sendable {
    private let lock = NSLock()
    private var events: [SocketLifecycleEvent] = []

    var snapshot: [SocketLifecycleEvent] {
        lock.lock()
        defer { lock.unlock() }
        return events
    }

    func record(_ event: SocketLifecycleEvent) {
        lock.lock()
        defer { lock.unlock() }
        events.append(event)
    }
}

private final class LockedClaimCounter: @unchecked Sendable {
    private let lock = NSLock()
    private var count = 0

    var value: Int {
        lock.lock()
        defer { lock.unlock() }
        return count
    }

    func increment() {
        lock.lock()
        count += 1
        lock.unlock()
    }
}

private final class RedirectDecisionRecorder: @unchecked Sendable {
    private let lock = NSLock()
    private var rejected: [Bool] = []

    var snapshot: [Bool] {
        lock.lock()
        defer { lock.unlock() }
        return rejected
    }

    func record(_ request: URLRequest?) {
        lock.lock()
        defer { lock.unlock() }
        rejected.append(request == nil)
    }
}

private final class MemoryResumeCredentialStore: ResumeCredentialStoring, @unchecked Sendable {
    private let lock = NSLock()
    private var storedValue: StoredResumeCredential?

    init(value: StoredResumeCredential?) {
        storedValue = value
    }

    var value: StoredResumeCredential? {
        lock.lock()
        defer { lock.unlock() }
        return storedValue
    }

    func load() throws -> StoredResumeCredential? {
        value
    }

    func save(_ credential: StoredResumeCredential) throws {
        lock.lock()
        storedValue = credential
        lock.unlock()
    }

    func delete() throws {
        lock.lock()
        storedValue = nil
        lock.unlock()
    }
}
