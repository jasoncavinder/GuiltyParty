import Foundation

enum CompanionPhase: Equatable, Sendable {
    case manualRejoin
    case joining
    case waitingForAssignment
    case connected
    case reconnecting
    case rejoined
    case expiredOrRevoked
    case sessionEnded

    var title: String {
        switch self {
        case .manualRejoin: String(localized: "Join a private session")
        case .joining: String(localized: "Joining")
        case .waitingForAssignment: String(localized: "Waiting for assignment")
        case .connected: String(localized: "Connected")
        case .reconnecting: String(localized: "Reconnecting")
        case .rejoined: String(localized: "Rejoined")
        case .expiredOrRevoked: String(localized: "Invitation or access expired")
        case .sessionEnded: String(localized: "Session ended")
        }
    }
}

enum PrivacyInterruption: Equatable, Sendable {
    case backgroundOrLock
    case capture
    case connectionUncertain
    case manual

    var message: String {
        switch self {
        case .backgroundOrLock:
            String(localized: "Private content is hidden while Guilty Party is inactive.")
        case .capture:
            String(localized: "Screen recording or mirroring is active. Private content and actions remain hidden.")
        case .connectionUncertain:
            String(localized: "The connection is uncertain. A fresh private view is required.")
        case .manual:
            String(localized: "Your private view is hidden.")
        }
    }
}

struct Invitation: Equatable, Sendable {
    let sessionID: String
    let pairingProof: String
    let expiresAtUnixMilliseconds: Int64
    let gameplayLanguage: String
}

struct SessionAuthority: Sendable {
    let sessionID: String
    let endpointID: String
    let participantID: String
    let bearer: String
    let expiresAtUnixMilliseconds: Int64
    let primaryAuthorityGeneration: Int64
    let gameplayLanguage: String
    let protocolVersion: String
}

struct ParticipantSessionAdmission: Sendable {
    let authority: SessionAuthority
    let resumeCredential: StoredResumeCredential
}

struct ProjectedScene: Equatable, Sendable {
    let name: String
    let publicNarrative: String
}

struct ProjectedClueView: Equatable, Identifiable, Sendable {
    let id: String
    let name: String
    let description: String
}

enum ParticipantVotingPhase: String, Equatable, Sendable {
    case unavailable
    case notOpen = "not_open"
    case open
    case closed
    case resolved
}

struct ProjectedVoteTargetView: Equatable, Identifiable, Sendable {
    let id: String
    let name: String
}

struct ParticipantProjection: Equatable, Sendable {
    let scenarioTitle: String
    let gameplayLanguage: String
    let assignedCharacter: String?
    let privateObjective: String?
    let clues: [ProjectedClueView]
    let scene: ProjectedScene?
    let votingPhase: ParticipantVotingPhase
    let voteTargets: [ProjectedVoteTargetView]
    let ownVoteRecorded: Bool
    let votesCast: Int64
    let publicOutcome: String?

    var hasAssignment: Bool {
        assignedCharacter != nil
    }
}

enum SessionModelError: Error, Equatable, Sendable {
    case invalidInvitation
    case expiredInvitation
    case invalidDisplayName
    case invalidResponse
    case unsupportedTransport
    case protocolViolation
    case recipientBoundaryViolation
    case staleSocketEvent
    case sequenceRegression
    case sequenceGap
    case connectionUnavailable
    case commandRejected(String)
    case expiredOrRevoked
    case sessionEnded

    var userMessage: String {
        switch self {
        case .invalidInvitation:
            String(localized: "That invitation is malformed or unsupported. Ask the Host for a fresh GP1 invitation.")
        case .expiredInvitation:
            String(localized: "That invitation has expired. Ask the Host to rotate it.")
        case .invalidDisplayName:
            String(localized: "Use a nickname with 1 to 80 visible characters.")
        case .invalidResponse, .protocolViolation, .recipientBoundaryViolation,
             .staleSocketEvent, .sequenceRegression, .sequenceGap:
            String(localized: "The server response could not be applied safely. Rejoin with a fresh invitation.")
        case .unsupportedTransport:
            String(localized: "This server did not offer the required native connection transport.")
        case .connectionUnavailable:
            String(localized: "The private connection is not ready.")
        case .commandRejected(let title):
            title
        case .expiredOrRevoked:
            String(localized: "This invitation or device access is no longer valid. Ask the Host for an active invitation.")
        case .sessionEnded:
            String(localized: "The session has ended.")
        }
    }
}
