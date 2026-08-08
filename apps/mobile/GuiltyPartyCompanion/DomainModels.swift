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
        case .manualRejoin: "Join a private session"
        case .joining: "Joining"
        case .waitingForAssignment: "Waiting for assignment"
        case .connected: "Connected"
        case .reconnecting: "Reconnecting"
        case .rejoined: "Rejoined"
        case .expiredOrRevoked: "Invitation or access expired"
        case .sessionEnded: "Session ended"
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
            "Private content is hidden while Guilty Party is inactive."
        case .capture:
            "Screen recording or mirroring is active. Private content and actions remain hidden."
        case .connectionUncertain:
            "The connection is uncertain. A fresh private view is required."
        case .manual:
            "Your private view is hidden."
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

struct ParticipantProjection: Equatable, Sendable {
    let scenarioTitle: String
    let gameplayLanguage: String
    let assignedCharacter: String?
    let privateObjective: String?
    let clues: [ProjectedClueView]
    let scene: ProjectedScene?
    let votingOpen: Bool
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
            "That invitation is malformed or unsupported. Ask the Host for a fresh GP1 invitation."
        case .expiredInvitation:
            "That invitation has expired. Ask the Host to rotate it."
        case .invalidDisplayName:
            "Use a nickname with 1 to 80 visible characters."
        case .invalidResponse, .protocolViolation, .recipientBoundaryViolation,
             .staleSocketEvent, .sequenceRegression, .sequenceGap:
            "The server response could not be applied safely. Rejoin with a fresh invitation."
        case .unsupportedTransport:
            "This server did not offer the required native connection transport."
        case .connectionUnavailable:
            "The private connection is not ready."
        case .commandRejected(let title):
            title
        case .expiredOrRevoked:
            "This invitation or device access is no longer valid. Ask the Host for an active invitation."
        case .sessionEnded:
            "The session has ended."
        }
    }
}
