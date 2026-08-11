package com.guiltyparty.companion

import guiltyparty.contracts.v1.GPV1CastVoteCommand
import guiltyparty.contracts.v1.GPV1ClientCommand
import guiltyparty.contracts.v1.GPV1ClientEnvelope
import guiltyparty.contracts.v1.GPV1CommandResultEnvelope
import guiltyparty.contracts.v1.GPV1ErrorEnvelope
import guiltyparty.contracts.v1.GPV1GetProjectionEnvelope
import guiltyparty.contracts.v1.GPV1GetProjectionEnvelopePayload
import guiltyparty.contracts.v1.GPV1Identifier
import guiltyparty.contracts.v1.GPV1MessageIdentifier
import guiltyparty.contracts.v1.GPV1ProjectionEnvelope
import guiltyparty.contracts.v1.GPV1ProtocolVersion
import guiltyparty.contracts.v1.GPV1ServerEnvelope
import guiltyparty.contracts.v1.GPV1SubmitCommandEnvelope
import guiltyparty.contracts.v1.GPV1SubmitCommandEnvelopePayload
import java.util.UUID

sealed interface IncomingControlEvent {
    class Projection(val value: GPV1ProjectionEnvelope) : IncomingControlEvent
    class CommandResult(val value: GPV1CommandResultEnvelope) : IncomingControlEvent
    class Error(val value: GPV1ErrorEnvelope) : IncomingControlEvent
}

object ControlPlaneCodec {
    fun decodeServerEvent(text: String, authority: SessionAuthority): IncomingControlEvent {
        val envelope = runCatching { GPV1ServerEnvelope.from(ContractJson.parse(text)) }.getOrNull()
            ?: throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
        return when (envelope) {
            is GPV1ServerEnvelope.Projection -> {
                validateContext(envelope.value.sessionId.value, envelope.value.endpointId.value, authority)
                IncomingControlEvent.Projection(envelope.value)
            }
            is GPV1ServerEnvelope.CommandResult -> {
                validateContext(envelope.value.sessionId.value, envelope.value.endpointId.value, authority)
                IncomingControlEvent.CommandResult(envelope.value)
            }
            is GPV1ServerEnvelope.Error -> {
                val session = envelope.value.sessionId?.value
                    ?: throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
                val endpoint = envelope.value.endpointId?.value
                    ?: throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
                validateContext(session, endpoint, authority)
                IncomingControlEvent.Error(envelope.value)
            }
            is GPV1ServerEnvelope.AiSuggestion,
            is GPV1ServerEnvelope.PresentationStatus ->
                throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
        }
    }

    fun projectionRequest(authority: SessionAuthority): String {
        val envelope = GPV1ClientEnvelope.GetProjection(
            GPV1GetProjectionEnvelope(
                correlationId = null,
                endpointId = GPV1Identifier(authority.endpointId),
                idempotencyId = null,
                messageId = GPV1MessageIdentifier(identifier("msg")),
                payload = GPV1GetProjectionEnvelopePayload,
                primaryAuthorityGeneration = null,
                protocolVersion = GPV1ProtocolVersion("1.0"),
                serverSequence = null,
                sessionId = GPV1Identifier(authority.sessionId),
                type = "get_projection",
            ),
        )
        return ContractJson.stringify(envelope.toJson())
    }

    fun voteCommand(authority: SessionAuthority, targetCharacterId: String): Pair<OutboundCommand, String> {
        val target = targetCharacterId.trim()
        if (target.codePointCount(0, target.length) !in 1..128) {
            throw CompanionFailure(
                FailureKind.COMMAND_REJECTED,
                "Enter the target character identifier supplied for this test.",
            )
        }
        val command = OutboundCommand(
            messageId = identifier("msg"),
            idempotencyId = identifier("cmd"),
            targetCharacterId = target,
        )
        return command to encodeVote(authority, command)
    }

    fun encodeVote(authority: SessionAuthority, command: OutboundCommand): String {
        val envelope = GPV1ClientEnvelope.SubmitCommand(
            GPV1SubmitCommandEnvelope(
                correlationId = null,
                endpointId = GPV1Identifier(authority.endpointId),
                idempotencyId = GPV1MessageIdentifier(command.idempotencyId),
                messageId = GPV1MessageIdentifier(command.messageId),
                payload = GPV1SubmitCommandEnvelopePayload(
                    GPV1ClientCommand.CastVote(
                        GPV1CastVoteCommand(
                            targetCharacterId = GPV1Identifier(command.targetCharacterId),
                            type = "cast_vote",
                        ),
                    ),
                ),
                primaryAuthorityGeneration = authority.primaryAuthorityGeneration,
                protocolVersion = GPV1ProtocolVersion("1.0"),
                serverSequence = null,
                sessionId = GPV1Identifier(authority.sessionId),
                type = "submit_command",
            ),
        )
        return ContractJson.stringify(envelope.toJson())
    }

    fun participantProjection(
        envelope: GPV1ProjectionEnvelope,
        authority: SessionAuthority,
    ): ParticipantProjection {
        validateContext(envelope.sessionId.value, envelope.endpointId.value, authority)
        val projection = envelope.payload.projection
        val ownMatches = projection.participants.filter {
            it.participantId.value == authority.participantId
        }
        val own = ownMatches.singleOrNull()
            ?: throw CompanionFailure(FailureKind.RECIPIENT_BOUNDARY_VIOLATION)
        val safeOthers = projection.participants.all { participant ->
            participant.participantId.value == authority.participantId ||
                (participant.privateObjective == null && participant.hasVoted == null)
        }
        if (!safeOthers || own.hasVoted == null) {
            throw CompanionFailure(FailureKind.RECIPIENT_BOUNDARY_VIOLATION)
        }
        val language = projection.gameplayLanguage?.value ?: authority.gameplayLanguage
        if (language != authority.gameplayLanguage) {
            throw CompanionFailure(FailureKind.RECIPIENT_BOUNDARY_VIOLATION)
        }
        return ParticipantProjection(
            scenarioTitle = projection.scenarioTitle,
            gameplayLanguage = language,
            assignedCharacter = own.characterName,
            privateObjective = own.privateObjective,
            clues = projection.revealedClues.map {
                ProjectedClue(it.id.value, it.name, it.description)
            },
            scene = projection.activeScene?.let {
                ProjectedScene(it.name, it.publicNarrative)
            },
            votingOpen = projection.votingOpen,
            ownVoteRecorded = own.hasVoted,
            votesCast = projection.votesCast,
            publicOutcome = projection.outcome?.publicResolution,
        )
    }

    private fun validateContext(sessionId: String, endpointId: String, authority: SessionAuthority) {
        if (sessionId != authority.sessionId || endpointId != authority.endpointId) {
            throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
        }
    }

    private fun identifier(prefix: String): String =
        "${prefix}_${UUID.randomUUID().toString().replace("-", "").lowercase()}"
}
