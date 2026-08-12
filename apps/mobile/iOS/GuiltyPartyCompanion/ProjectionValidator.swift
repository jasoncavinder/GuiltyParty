import Foundation

enum ProjectionValidator {
    static func participantProjection(
        from envelope: GPV1ProjectionEnvelope,
        authority: SessionAuthority
    ) throws -> ParticipantProjection {
        guard envelope.sessionId.value == authority.sessionID,
              envelope.endpointId.value == authority.endpointID
        else {
            throw SessionModelError.protocolViolation
        }

        let projection = envelope.payload.projection
        let ownMatches = projection.participants.filter {
            $0.participantId.value == authority.participantID
        }
        guard ownMatches.count == 1, let own = ownMatches.first else {
            throw SessionModelError.recipientBoundaryViolation
        }
        guard projection.participants.allSatisfy({ participant in
            participant.participantId.value == authority.participantID
                || (participant.privateObjective == nil && participant.hasVoted == nil)
        }), let ownVoteRecorded = own.hasVoted else {
            throw SessionModelError.recipientBoundaryViolation
        }

        let phase: ParticipantVotingPhase
        let voteTargets: [ProjectedVoteTargetView]
        if authority.protocolVersion == CompanionEnvironment.protocolVersion {
            guard let projectedPhase = projection.votingPhase,
                  let negotiatedPhase = ParticipantVotingPhase(rawValue: projectedPhase.value),
                  negotiatedPhase != .unavailable,
                  projection.votingOpen == (negotiatedPhase == .open),
                  (negotiatedPhase == .resolved) == (projection.outcome != nil)
            else {
                throw SessionModelError.protocolViolation
            }
            phase = negotiatedPhase
            voteTargets = (projection.voteTargets ?? []).map {
                ProjectedVoteTargetView(id: $0.characterId.value, name: $0.characterName)
            }
            guard Set(voteTargets.map(\.id)).count == voteTargets.count,
                  voteTargets.isEmpty
                    || (phase == .open && own.characterName != nil && !ownVoteRecorded)
            else {
                throw SessionModelError.recipientBoundaryViolation
            }
        } else {
            guard authority.protocolVersion == CompanionEnvironment.legacyProtocolVersion,
                  projection.votingPhase == nil,
                  projection.voteTargets == nil
            else {
                throw SessionModelError.protocolViolation
            }
            phase = .unavailable
            voteTargets = []
        }

        return ParticipantProjection(
            scenarioTitle: projection.scenarioTitle,
            gameplayLanguage: projection.gameplayLanguage?.value ?? authority.gameplayLanguage,
            assignedCharacter: own.characterName,
            privateObjective: own.privateObjective,
            clues: projection.revealedClues.map {
                ProjectedClueView(
                    id: $0.id.value,
                    name: $0.name,
                    description: $0.description
                )
            },
            scene: projection.activeScene.map {
                ProjectedScene(name: $0.name, publicNarrative: $0.publicNarrative)
            },
            votingPhase: phase,
            voteTargets: voteTargets,
            ownVoteRecorded: ownVoteRecorded,
            votesCast: projection.votesCast,
            publicOutcome: projection.outcome?.publicResolution
        )
    }
}
