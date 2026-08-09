package com.guiltyparty.companion

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class PolicyTest {
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
    }
}
