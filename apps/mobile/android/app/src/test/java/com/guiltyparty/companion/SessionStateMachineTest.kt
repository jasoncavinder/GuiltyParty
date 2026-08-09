package com.guiltyparty.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class SessionStateMachineTest {
    @Test
    fun freshProjectionMovesFromJoinToConnected() {
        val machine = SessionStateMachine()
        machine.beginJoin()
        machine.beginSocket("socket-1", isRejoin = false, baselineServerSequence = null)

        machine.applyProjection(projection(assigned = true), 4, "socket-1")

        assertEquals(CompanionPhase.CONNECTED, machine.phase)
        assertFalse(machine.needsFreshProjection)
        assertNull(machine.privacyInterruption)
        assertNotNull(machine.projection)
    }

    @Test
    fun staleSocketAndSequenceRegressionAreRejected() {
        val machine = SessionStateMachine()
        machine.beginJoin()
        machine.beginSocket("socket-1", isRejoin = false, baselineServerSequence = null)
        machine.applyProjection(projection(assigned = true), 10, "socket-1")

        val stale = assertThrows(CompanionFailure::class.java) {
            machine.applyProjection(projection(assigned = true), 11, "socket-old")
        }
        assertEquals(FailureKind.PROTOCOL_VIOLATION, stale.kind)

        val regression = assertThrows(CompanionFailure::class.java) {
            machine.applyProjection(projection(assigned = true), 9, "socket-1")
        }
        assertEquals(FailureKind.SEQUENCE_REGRESSION, regression.kind)
    }

    @Test
    fun connectedGapIsRejectedButFreshRejoinProjectionMayJump() {
        val machine = SessionStateMachine()
        machine.beginJoin()
        machine.beginSocket("socket-1", isRejoin = false, baselineServerSequence = null)
        machine.applyProjection(projection(assigned = true), 10, "socket-1")

        val gap = assertThrows(CompanionFailure::class.java) {
            machine.acceptServerSequence(12, "socket-1")
        }
        assertEquals(FailureKind.SEQUENCE_GAP, gap.kind)

        machine.interrupt(PrivacyInterruption.CONNECTION_UNCERTAIN)
        machine.beginSocket("socket-2", isRejoin = true, baselineServerSequence = 10)
        machine.applyProjection(projection(assigned = true), 20, "socket-2")
        assertEquals(CompanionPhase.REJOINED, machine.phase)
    }

    @Test
    fun backgroundAndUncertainConnectionPurgePrivateProjection() {
        val machine = SessionStateMachine()
        machine.beginJoin()
        machine.beginSocket("socket-1", isRejoin = false, baselineServerSequence = null)
        machine.applyProjection(projection(assigned = true), 4, "socket-1")

        machine.interrupt(PrivacyInterruption.BACKGROUND_OR_LOCK)

        assertNull(machine.projection)
        assertTrue(machine.needsFreshProjection)
        assertEquals(PrivacyInterruption.BACKGROUND_OR_LOCK, machine.privacyInterruption)
        assertEquals(CompanionPhase.RECONNECTING, machine.phase)
    }

    @Test
    fun inactivityShieldRetainsSocketOnlyForFreshProjection() {
        val machine = SessionStateMachine()
        machine.beginJoin()
        machine.beginSocket("socket-1", isRejoin = false, baselineServerSequence = null)
        machine.applyProjection(projection(assigned = true), 4, "socket-1")

        machine.markConnectionUncertain("socket-1")
        assertNull(machine.projection)
        assertEquals("socket-1", machine.socketId)
        machine.applyProjection(projection(assigned = true), 9, "socket-1")
        assertEquals(CompanionPhase.REJOINED, machine.phase)
    }

    private fun projection(assigned: Boolean) = ParticipantProjection(
        scenarioTitle = "Synthetic",
        gameplayLanguage = "en",
        assignedCharacter = if (assigned) "Curator" else null,
        privateObjective = if (assigned) "Synthetic private objective" else null,
        clues = emptyList(),
        scene = null,
        votingOpen = false,
        ownVoteRecorded = false,
        votesCast = 0,
        publicOutcome = null,
    )
}
