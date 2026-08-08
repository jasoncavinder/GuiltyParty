import Foundation

struct SessionStateMachine: Equatable, Sendable {
    private(set) var phase: CompanionPhase = .manualRejoin
    private(set) var projection: ParticipantProjection?
    private(set) var privacyInterruption: PrivacyInterruption?
    private(set) var needsFreshProjection = false
    private(set) var socketID: UUID?
    private(set) var lastServerSequence: Int64?
    private var currentConnectionIsRejoin = false

    mutating func beginJoin() {
        phase = .joining
        projection = nil
        privacyInterruption = nil
        needsFreshProjection = true
        socketID = nil
        lastServerSequence = nil
        currentConnectionIsRejoin = false
    }

    mutating func beginSocket(id: UUID, isRejoin: Bool) {
        socketID = id
        projection = nil
        privacyInterruption = .connectionUncertain
        needsFreshProjection = true
        currentConnectionIsRejoin = isRejoin
        phase = isRejoin ? .reconnecting : .joining
    }

    mutating func applyProjection(
        _ nextProjection: ParticipantProjection,
        sequence: Int64,
        socketID eventSocketID: UUID
    ) throws {
        try acceptServerSequence(
            sequence,
            socketID: eventSocketID,
            permitsFreshProjectionGap: needsFreshProjection
        )
        projection = nextProjection
        privacyInterruption = nil
        needsFreshProjection = false
        if currentConnectionIsRejoin {
            phase = .rejoined
        } else {
            phase = nextProjection.hasAssignment ? .connected : .waitingForAssignment
        }
    }

    mutating func acceptServerSequence(
        _ sequence: Int64,
        socketID eventSocketID: UUID,
        permitsFreshProjectionGap: Bool = false
    ) throws {
        guard eventSocketID == socketID else {
            throw SessionModelError.staleSocketEvent
        }
        if let lastServerSequence {
            guard sequence >= lastServerSequence else {
                throw SessionModelError.sequenceRegression
            }
            if !permitsFreshProjectionGap,
               sequence > lastServerSequence,
               sequence - lastServerSequence > 1 {
                throw SessionModelError.sequenceGap
            }
        }
        lastServerSequence = sequence
    }

    mutating func settleRejoinedState() {
        guard phase == .rejoined, let projection else { return }
        phase = projection.hasAssignment ? .connected : .waitingForAssignment
    }

    mutating func interrupt(_ reason: PrivacyInterruption) {
        projection = nil
        privacyInterruption = reason
        needsFreshProjection = true
        socketID = nil
        currentConnectionIsRejoin = true
        if phase != .expiredOrRevoked && phase != .sessionEnded && phase != .manualRejoin {
            phase = .reconnecting
        }
    }

    mutating func markConnectionUncertain(socketID eventSocketID: UUID) throws {
        guard eventSocketID == socketID else {
            throw SessionModelError.staleSocketEvent
        }
        projection = nil
        privacyInterruption = .connectionUncertain
        needsFreshProjection = true
        currentConnectionIsRejoin = true
        phase = .reconnecting
    }

    mutating func expireOrRevoke() {
        clearPrivateState()
        phase = .expiredOrRevoked
    }

    mutating func endSession() {
        clearPrivateState()
        phase = .sessionEnded
    }

    mutating func requireManualRejoin() {
        clearPrivateState()
        phase = .manualRejoin
    }

    private mutating func clearPrivateState() {
        projection = nil
        privacyInterruption = nil
        needsFreshProjection = false
        socketID = nil
        lastServerSequence = nil
        currentConnectionIsRejoin = false
    }
}
