package com.guiltyparty.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class PolicyTest {
    @Test
    fun hostPresentationStatusIsRejectedByPlayerCompanion() {
        val authority = SessionAuthority(
            sessionId = "session-synthetic-001",
            endpointId = "endpoint-synthetic-player-001",
            participantId = "participant-synthetic-001",
            bearer = "synthetic-memory-only-bearer",
            expiresAtUnixMs = 2_000_000_000_000,
            primaryAuthorityGeneration = 3,
            gameplayLanguage = "en",
            serverEndpoint = ServerEndpoint.parse("https://api.test.guiltyparty.app", false),
        )
        val failure = assertThrows(CompanionFailure::class.java) {
            ControlPlaneCodec.decodeServerEvent(
                """{"protocol_version":"1.0","type":"presentation_status","message_id":"message-host-status-001","session_id":"session-synthetic-001","endpoint_id":"endpoint-synthetic-player-001","payload":{"manifest_revision":"the-stolen-artifact-v2-presentation-r2","asset_available":true,"sound_enabled":true,"atmosphere_state":"playing","reduced_motion":false}}""",
                authority,
            )
        }
        assertEquals(FailureKind.PROTOCOL_VIOLATION, failure.kind)
    }

    @Test
    fun connectionHealthMatchesAcceptedDurations() {
        assertEquals(5_000, ConnectionHealthPolicy.NEGOTIATION_TIMEOUT_MS)
        assertEquals(ConnectionHealthAction.HEALTHY, ConnectionHealthPolicy.action(29_999))
        assertEquals(ConnectionHealthAction.SHIELD, ConnectionHealthPolicy.action(30_000))
        assertEquals(ConnectionHealthAction.SHIELD, ConnectionHealthPolicy.action(44_999))
        assertEquals(ConnectionHealthAction.DISCONNECT, ConnectionHealthPolicy.action(45_000))
        assertEquals(60_000, ConnectionHealthPolicy.STABLE_CONNECTION_MS)
    }

    @Test
    fun reconnectBackoffCapsAndExplicitlyResets() {
        val backoff = ReconnectBackoff()
        assertEquals(
            listOf(1_000L, 2_000L, 4_000L, 8_000L, 15_000L, 30_000L, 30_000L),
            List(7) { backoff.nextMaximumDelayMs() },
        )
        backoff.reset()
        assertEquals(1_000L, backoff.nextMaximumDelayMs())
    }

    @Test
    fun ambiguousSocketFailureRefreshesAuthorityBeforeReconnect() {
        assertEquals(
            SocketInterruptionAction.END_SESSION,
            SocketInterruptionPolicy.closed(1000),
        )
        assertEquals(
            SocketInterruptionAction.REFRESH_AUTHORITY,
            SocketInterruptionPolicy.closed(1008),
        )
        assertEquals(
            SocketInterruptionAction.RECONNECT_EXISTING_AUTHORITY,
            SocketInterruptionPolicy.closed(1001),
        )
        assertEquals(
            SocketInterruptionAction.REFRESH_AUTHORITY_WITH_BACKOFF,
            SocketInterruptionPolicy.failed(SocketFailure.AMBIGUOUS_TRANSPORT),
        )
        assertEquals(
            SocketInterruptionAction.FAIL_PROTOCOL,
            SocketInterruptionPolicy.failed(SocketFailure.PROTOCOL_VIOLATION),
        )
    }

    @Test
    fun productionEndpointRequiresSecureOriginWithoutPathOrCredentials() {
        val endpoint = ServerEndpoint.parse("https://api.test.guiltyparty.app/", false)
        assertEquals("https://api.test.guiltyparty.app/api/v1/join", endpoint.joinUrl)
        assertEquals("wss://api.test.guiltyparty.app/ws/v1", endpoint.webSocketUrl)

        assertThrows(CompanionFailure::class.java) {
            ServerEndpoint.parse("http://api.test.guiltyparty.app", false)
        }
        assertThrows(CompanionFailure::class.java) {
            ServerEndpoint.parse("https://user@example.test/path?token=secret", false)
        }
        assertThrows(CompanionFailure::class.java) {
            ServerEndpoint.parse("https://api.test.guiltyparty.app:65536", false)
        }
    }

    @Test
    fun debugEndpointAllowsBoundedHttpLanOrigin() {
        val endpoint = ServerEndpoint.parse("http://192.168.10.20:3000", true)
        assertEquals("http://192.168.10.20:3000/api/v1/resume", endpoint.resumeUrl)
        assertEquals("ws://192.168.10.20:3000/ws/v1", endpoint.webSocketUrl)
        assertEquals(
            "ws://[::1]:3000/ws/v1",
            ServerEndpoint.parse("http://[::1]:3000", true).webSocketUrl,
        )
        assertThrows(CompanionFailure::class.java) {
            ServerEndpoint.parse("http://203.0.113.10:3000", true)
        }
        assertThrows(CompanionFailure::class.java) {
            ServerEndpoint.parse("http://192.168.10.20:0", true)
        }
        assertThrows(CompanionFailure::class.java) {
            ServerEndpoint.parse("http://192.168.10.20:99999", true)
        }
    }
}
