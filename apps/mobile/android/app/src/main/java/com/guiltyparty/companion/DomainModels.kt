package com.guiltyparty.companion

enum class CompanionPhase(val title: String) {
    MANUAL_REJOIN("Join a private session"),
    JOINING("Joining"),
    WAITING_FOR_ASSIGNMENT("Waiting for assignment"),
    CONNECTED("Connected"),
    RECONNECTING("Reconnecting"),
    REJOINED("Rejoined"),
    EXPIRED_OR_REVOKED("Invitation or access expired"),
    SESSION_ENDED("Session ended"),
}

enum class PrivacyInterruption(val message: String) {
    BACKGROUND_OR_LOCK("Private content is hidden while Guilty Party is inactive."),
    CONNECTION_UNCERTAIN("The connection is uncertain. A fresh private view is required."),
    MANUAL("Your private view is hidden."),
}

enum class FailureKind {
    INVALID_INVITATION,
    EXPIRED_INVITATION,
    INVALID_DISPLAY_NAME,
    INVALID_RESPONSE,
    PROTOCOL_VIOLATION,
    RECIPIENT_BOUNDARY_VIOLATION,
    SEQUENCE_REGRESSION,
    SEQUENCE_GAP,
    CONNECTION_UNAVAILABLE,
    COMMAND_REJECTED,
    VOTING_CHOICE_UNAVAILABLE,
    UNSUPPORTED_BUILD,
    JOIN_FAILED,
    EXPIRED_OR_REVOKED,
    SESSION_ENDED,
}

class CompanionFailure(
    val kind: FailureKind,
    val safeMessage: String = kind.defaultMessage,
) : Exception(safeMessage) {
    override fun toString(): String = "CompanionFailure(kind=$kind)"
}

val FailureKind.defaultMessage: String
    get() = when (this) {
        FailureKind.INVALID_INVITATION ->
            "That invitation is malformed or unsupported. Ask the Host for a fresh invitation."
        FailureKind.EXPIRED_INVITATION ->
            "That invitation has expired. Ask the Host to rotate it."
        FailureKind.INVALID_DISPLAY_NAME ->
            "Use a nickname with 1 to 80 visible characters."
        FailureKind.INVALID_RESPONSE,
        FailureKind.PROTOCOL_VIOLATION,
        FailureKind.RECIPIENT_BOUNDARY_VIOLATION,
        FailureKind.SEQUENCE_REGRESSION,
        FailureKind.SEQUENCE_GAP,
        -> "The server response could not be applied safely. Rejoin with a fresh invitation."
        FailureKind.CONNECTION_UNAVAILABLE -> "The private connection is not ready."
        FailureKind.COMMAND_REJECTED -> "The action was rejected."
        FailureKind.VOTING_CHOICE_UNAVAILABLE -> "That voting choice is unavailable."
        FailureKind.UNSUPPORTED_BUILD ->
            "This development build is no longer supported by the test service."
        FailureKind.JOIN_FAILED -> "The session could not be joined."
        FailureKind.EXPIRED_OR_REVOKED ->
            "This invitation or device access is no longer valid. Ask the Host for an active invitation."
        FailureKind.SESSION_ENDED -> "The session has ended."
    }

class Invitation(
    val sessionId: String,
    val pairingProof: String,
    val expiresAtUnixMs: Long,
    val gameplayLanguage: String,
) {
    override fun toString(): String = "Invitation(<redacted>)"
}

class SessionAuthority(
    val sessionId: String,
    val endpointId: String,
    val participantId: String,
    val bearer: String,
    val expiresAtUnixMs: Long,
    val primaryAuthorityGeneration: Long,
    val gameplayLanguage: String,
    val serverEndpoint: ServerEndpoint,
    val protocolVersion: String = CompanionEnvironment.LEGACY_PROTOCOL_VERSION,
) {
    override fun toString(): String = "SessionAuthority(<redacted>)"
}

class StoredResumeCredential(
    val token: String,
    val pendingReplacementToken: String?,
    val sessionId: String,
    val endpointId: String,
    val participantId: String,
    val expiresAtUnixMs: Long,
    val primaryAuthorityGeneration: Long,
    val lastServerSequence: Long,
    val lastAuthenticatedUnixMs: Long,
    val pendingIdempotencyIds: List<String>,
    val gameplayLanguage: String,
    val serverOrigin: String,
    val protocolVersion: String = CompanionEnvironment.LEGACY_PROTOCOL_VERSION,
) {
    fun withReplacement(token: String): StoredResumeCredential = copy(
        pendingReplacementToken = token,
    )

    fun withAuthenticatedSequence(sequence: Long, authenticatedAtUnixMs: Long): StoredResumeCredential = copy(
        lastServerSequence = sequence,
        lastAuthenticatedUnixMs = authenticatedAtUnixMs,
    )

    fun withPending(ids: List<String>): StoredResumeCredential = copy(
        pendingIdempotencyIds = ids,
    )

    private fun copy(
        token: String = this.token,
        pendingReplacementToken: String? = this.pendingReplacementToken,
        sessionId: String = this.sessionId,
        endpointId: String = this.endpointId,
        participantId: String = this.participantId,
        expiresAtUnixMs: Long = this.expiresAtUnixMs,
        primaryAuthorityGeneration: Long = this.primaryAuthorityGeneration,
        lastServerSequence: Long = this.lastServerSequence,
        lastAuthenticatedUnixMs: Long = this.lastAuthenticatedUnixMs,
        pendingIdempotencyIds: List<String> = this.pendingIdempotencyIds,
        gameplayLanguage: String = this.gameplayLanguage,
        serverOrigin: String = this.serverOrigin,
        protocolVersion: String = this.protocolVersion,
    ) = StoredResumeCredential(
        token,
        pendingReplacementToken,
        sessionId,
        endpointId,
        participantId,
        expiresAtUnixMs,
        primaryAuthorityGeneration,
        lastServerSequence,
        lastAuthenticatedUnixMs,
        pendingIdempotencyIds,
        gameplayLanguage,
        serverOrigin,
        protocolVersion,
    )

    override fun toString(): String = "StoredResumeCredential(<redacted>)"
}

class ParticipantAdmission(
    val authority: SessionAuthority,
    val resumeCredential: StoredResumeCredential,
) {
    override fun toString(): String = "ParticipantAdmission(<redacted>)"
}

class ProjectedScene(
    val name: String,
    val publicNarrative: String,
)

class ProjectedClue(
    val id: String,
    val name: String,
    val description: String,
) {
    override fun toString(): String = "ProjectedClue(<redacted>)"
}

enum class ParticipantVotingPhase {
    UNAVAILABLE,
    NOT_OPEN,
    OPEN,
    CLOSED,
    RESOLVED,
}

class ProjectedVoteTarget(
    val id: String,
    val name: String,
) {
    override fun toString(): String = "ProjectedVoteTarget(<redacted>)"
}

class ParticipantProjection(
    val scenarioTitle: String,
    val gameplayLanguage: String,
    val assignedCharacter: String?,
    val privateObjective: String?,
    val clues: List<ProjectedClue>,
    val scene: ProjectedScene?,
    val votingPhase: ParticipantVotingPhase,
    val voteTargets: List<ProjectedVoteTarget>,
    val ownVoteRecorded: Boolean,
    val votesCast: Long,
    val publicOutcome: String?,
) {
    val hasAssignment: Boolean get() = assignedCharacter != null
    override fun toString(): String = "ParticipantProjection(<redacted>)"
}

class OutboundCommand(
    val messageId: String,
    val idempotencyId: String,
    val targetCharacterId: String,
) {
    override fun toString(): String = "OutboundCommand(<redacted>)"
}

class UiSnapshot(
    val phase: CompanionPhase = CompanionPhase.MANUAL_REJOIN,
    val statusMessage: String = "Paste or enter an active invitation.",
    val projection: ParticipantProjection? = null,
    val privacyInterruption: PrivacyInterruption? = null,
    val gameplayLanguage: String? = null,
    val votePending: Boolean = false,
    val insecureDevelopmentTransport: Boolean = false,
) {
    val hasActiveSession: Boolean
        get() = phase !in setOf(
            CompanionPhase.MANUAL_REJOIN,
            CompanionPhase.EXPIRED_OR_REVOKED,
            CompanionPhase.SESSION_ENDED,
        )

    override fun toString(): String = "UiSnapshot(phase=$phase, <private state redacted>)"
}
