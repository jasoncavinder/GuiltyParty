package com.guiltyparty.companion

class SessionStateMachine {
    var phase: CompanionPhase = CompanionPhase.MANUAL_REJOIN
        private set
    var projection: ParticipantProjection? = null
        private set
    var privacyInterruption: PrivacyInterruption? = null
        private set
    var needsFreshProjection: Boolean = false
        private set
    var socketId: String? = null
        private set
    var lastServerSequence: Long? = null
        private set
    private var currentConnectionIsRejoin = false

    fun beginJoin() {
        phase = CompanionPhase.JOINING
        projection = null
        privacyInterruption = null
        needsFreshProjection = true
        socketId = null
        lastServerSequence = null
        currentConnectionIsRejoin = false
    }

    fun beginSocket(id: String, isRejoin: Boolean, baselineServerSequence: Long?) {
        socketId = id
        baselineServerSequence?.let { baseline ->
            lastServerSequence = maxOf(lastServerSequence ?: 0, baseline)
        }
        projection = null
        privacyInterruption = PrivacyInterruption.CONNECTION_UNCERTAIN
        needsFreshProjection = true
        currentConnectionIsRejoin = isRejoin
        phase = if (isRejoin) CompanionPhase.RECONNECTING else CompanionPhase.JOINING
    }

    fun applyProjection(next: ParticipantProjection, sequence: Long, eventSocketId: String) {
        acceptServerSequence(sequence, eventSocketId, needsFreshProjection)
        projection = next
        privacyInterruption = null
        needsFreshProjection = false
        phase = if (currentConnectionIsRejoin) {
            CompanionPhase.REJOINED
        } else if (next.hasAssignment) {
            CompanionPhase.CONNECTED
        } else {
            CompanionPhase.WAITING_FOR_ASSIGNMENT
        }
    }

    fun acceptServerSequence(
        sequence: Long,
        eventSocketId: String,
        permitsFreshProjectionGap: Boolean = false,
    ) {
        if (eventSocketId != socketId) {
            throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
        }
        lastServerSequence?.let { last ->
            if (sequence < last) throw CompanionFailure(FailureKind.SEQUENCE_REGRESSION)
            if (!permitsFreshProjectionGap && sequence > last && sequence - last > 1) {
                throw CompanionFailure(FailureKind.SEQUENCE_GAP)
            }
        }
        lastServerSequence = sequence
    }

    fun settleRejoined() {
        if (phase != CompanionPhase.REJOINED) return
        projection?.let {
            phase = if (it.hasAssignment) CompanionPhase.CONNECTED else CompanionPhase.WAITING_FOR_ASSIGNMENT
        }
    }

    fun interrupt(reason: PrivacyInterruption) {
        projection = null
        privacyInterruption = reason
        needsFreshProjection = true
        socketId = null
        currentConnectionIsRejoin = true
        if (phase !in setOf(
                CompanionPhase.EXPIRED_OR_REVOKED,
                CompanionPhase.SESSION_ENDED,
                CompanionPhase.MANUAL_REJOIN,
            )
        ) {
            phase = CompanionPhase.RECONNECTING
        }
    }

    fun markConnectionUncertain(eventSocketId: String) {
        if (eventSocketId != socketId) {
            throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
        }
        projection = null
        privacyInterruption = PrivacyInterruption.CONNECTION_UNCERTAIN
        needsFreshProjection = true
        currentConnectionIsRejoin = true
        phase = CompanionPhase.RECONNECTING
    }

    fun expireOrRevoke() = clearPrivateState(CompanionPhase.EXPIRED_OR_REVOKED)
    fun endSession() = clearPrivateState(CompanionPhase.SESSION_ENDED)
    fun requireManualRejoin() = clearPrivateState(CompanionPhase.MANUAL_REJOIN)

    private fun clearPrivateState(nextPhase: CompanionPhase) {
        projection = null
        privacyInterruption = null
        needsFreshProjection = false
        socketId = null
        lastServerSequence = null
        currentConnectionIsRejoin = false
        phase = nextPhase
    }
}

enum class ConnectionHealthAction { HEALTHY, SHIELD, DISCONNECT }

enum class SocketInterruptionAction {
    END_SESSION,
    REFRESH_AUTHORITY,
    RECONNECT_EXISTING_AUTHORITY,
}

object SocketInterruptionPolicy {
    fun closed(code: Int): SocketInterruptionAction = when (code) {
        1000 -> SocketInterruptionAction.END_SESSION
        1008 -> SocketInterruptionAction.REFRESH_AUTHORITY
        else -> SocketInterruptionAction.RECONNECT_EXISTING_AUTHORITY
    }

    fun failed(): SocketInterruptionAction = SocketInterruptionAction.REFRESH_AUTHORITY
}

object ConnectionHealthPolicy {
    const val NEGOTIATION_TIMEOUT_MS = 5_000L
    const val PRIVACY_SHIELD_DELAY_MS = 30_000L
    const val DISCONNECT_DELAY_MS = 45_000L
    const val STABLE_CONNECTION_MS = 60_000L

    fun action(elapsedMs: Long): ConnectionHealthAction = when {
        elapsedMs >= DISCONNECT_DELAY_MS -> ConnectionHealthAction.DISCONNECT
        elapsedMs >= PRIVACY_SHIELD_DELAY_MS -> ConnectionHealthAction.SHIELD
        else -> ConnectionHealthAction.HEALTHY
    }
}

class ReconnectBackoff {
    private val maximumDelayMs = longArrayOf(1_000, 2_000, 4_000, 8_000, 15_000, 30_000)
    private var attempt = 0

    fun nextMaximumDelayMs(): Long = maximumDelayMs[minOf(attempt++, maximumDelayMs.lastIndex)]
    fun reset() { attempt = 0 }
}
