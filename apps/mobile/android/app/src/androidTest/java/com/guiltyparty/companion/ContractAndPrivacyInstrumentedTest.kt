package com.guiltyparty.companion

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import guiltyparty.contracts.v1.GPV1ClientEnvelope
import guiltyparty.contracts.v1.GPV1JoinRequest
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import okio.Buffer
import java.util.Base64

@RunWith(AndroidJUnit4::class)
class ContractAndPrivacyInstrumentedTest {
    private val context = InstrumentationRegistry.getInstrumentation().targetContext
    private val fixtureContext = InstrumentationRegistry.getInstrumentation().context

    @After
    fun removeSyntheticCredential() {
        KeystoreResumeCredentialStore(context).delete()
    }

    @Test
    fun invitationIsStrictBoundedAndOneTimeTransferCompatible() {
        val json = JSONObject()
            .put("version", "1")
            .put("session_id", "session-synthetic-001")
            .put("pairing_code", "synthetic-pairing-proof")
            .put("expires_at_unix_ms", 2_000_000_000_000)
            .put("gameplay_language", "en")
        val encoded = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(json.toString().toByteArray(Charsets.UTF_8))

        val invitation = InvitationDecoder.decode("GP1.$encoded", nowUnixMs = 1_000)

        assertEquals("session-synthetic-001", invitation.sessionId)
        assertEquals("en", invitation.gameplayLanguage)
        json.put("unexpected", "field")
        val widened = Base64.getUrlEncoder().withoutPadding()
            .encodeToString(json.toString().toByteArray(Charsets.UTF_8))
        assertEquals(
            FailureKind.INVALID_INVITATION,
            assertThrows(CompanionFailure::class.java) {
                InvitationDecoder.decode("GP1.$widened", nowUnixMs = 1_000)
            }.kind,
        )
    }

    @Test
    fun malformedUtf8IsRejectedInsteadOfSubstituted() {
        assertEquals(
            FailureKind.INVALID_RESPONSE,
            assertThrows(CompanionFailure::class.java) {
                ContractJson.decodeUtf8(byteArrayOf(0x7b, 0xff.toByte(), 0x7d))
            }.kind,
        )
    }

    @Test
    fun participantProjectionHonorsRecipientAndLanguageBoundary() {
        val authority = authority()
        val incoming = ControlPlaneCodec.decodeServerEvent(
            fixture("privacy/participant-projection.json"),
            authority,
        ) as IncomingControlEvent.Projection

        val projection = ControlPlaneCodec.participantProjection(incoming.value, authority)

        assertEquals("Curator", projection.assignedCharacter)
        assertEquals("SYNTHETIC_OWN_PRIVATE_OBJECTIVE", projection.privateObjective)
        assertEquals(listOf("SYNTHETIC_OWN_PRIVATE_CLUE"), projection.clues.map { it.description })

        val substituted = JSONObject(fixture("privacy/participant-projection.json"))
        substituted.getJSONObject("payload").getJSONObject("projection")
            .put("gameplay_language", "fr")
        val event = ControlPlaneCodec.decodeServerEvent(substituted.toString(), authority)
            as IncomingControlEvent.Projection
        assertEquals(
            FailureKind.RECIPIENT_BOUNDARY_VIOLATION,
            assertThrows(CompanionFailure::class.java) {
                ControlPlaneCodec.participantProjection(event.value, authority)
            }.kind,
        )
    }

    @Test
    fun joinAndResumeKeepAuthorityOutOfUrlsAndBodies() {
        val client = NetworkClient()
        val endpoint = ServerEndpoint.parse("https://api.test.guiltyparty.app", false)
        val invitation = Invitation(
            "session-synthetic-001",
            "synthetic-pairing-proof",
            2_000_000_000_000,
            "en",
        )
        val join = client.buildJoinRequest(endpoint, invitation, "Synthetic Player")
        val joinBody = body(join)
        assertEquals("https://api.test.guiltyparty.app/api/v1/join", join.url.toString())
        assertNull(join.url.query)
        assertEquals("Pairing synthetic-pairing-proof", join.header("Authorization"))
        assertFalse(joinBody.contains("synthetic-pairing-proof"))
        val decodedJoin = GPV1JoinRequest.from(ContractJson.parse(joinBody))
            as GPV1JoinRequest.Participant
        assertEquals("android_companion", decodedJoin.value.endpoint.platform.value)
        assertEquals("companion_android", decodedJoin.value.endpoint.clientBuild?.applicationId?.value)

        val credential = resumeCredential()
        val resume = client.buildResumeRequest(credential)
        val resumeBody = body(resume)
        assertNull(resume.url.query)
        assertEquals("Resume ${credential.token}", resume.header("Authorization"))
        assertEquals(credential.pendingReplacementToken, resume.header("X-GP-Replacement-Resume"))
        assertFalse(resumeBody.contains(credential.token))
        assertFalse(resumeBody.contains("private_objective"))
        assertFalse(resumeBody.contains("clue"))
    }

    @Test
    fun resumeRotatesAuthorityWithoutSubstitutingIdentity() {
        val client = NetworkClient()
        val previous = resumeCredential()

        val admission = client.decodeResumeResponse(
            fixture("positive/participant-resume-response.json"),
            previous,
            nowUnixMs = 1_000,
        )

        assertEquals(previous.sessionId, admission.authority.sessionId)
        assertEquals(previous.endpointId, admission.authority.endpointId)
        assertEquals(previous.participantId, admission.authority.participantId)
        assertEquals(4, admission.authority.primaryAuthorityGeneration)
        assertEquals("synthetic-device-only-rotated-resume-token", admission.resumeCredential.token)
        assertTrue(admission.resumeCredential.pendingIdempotencyIds.isEmpty())

        val substituted = JSONObject(fixture("positive/participant-resume-response.json"))
            .put("endpoint_id", "endpoint-attacker")
        assertThrows(Exception::class.java) {
            client.decodeResumeResponse(substituted.toString(), previous, nowUnixMs = 1_000)
        }
    }

    @Test
    fun transportHasNoCacheCookiesRedirectsOrImplicitRetries() {
        val client = NetworkClient()
        assertNull(client.httpClient.cache)
        assertFalse(client.httpClient.followRedirects)
        assertFalse(client.httpClient.followSslRedirects)
        assertFalse(client.httpClient.retryOnConnectionFailure)
        assertEquals(20_000, client.httpClient.callTimeoutMillis)
        assertEquals(15_000, client.socketClient.pingIntervalMillis)
    }

    @Test
    fun keystoreCredentialIsNoBackupEncryptedAndContainsNoProjection() {
        val store = KeystoreResumeCredentialStore(context)
        store.delete()
        val credential = resumeCredential()

        store.save(credential)

        val restored = store.load()
        assertNotNull(restored)
        requireNotNull(restored)
        assertEquals(credential.token, restored.token)
        assertEquals(credential.pendingIdempotencyIds, restored.pendingIdempotencyIds)
        val files = context.noBackupFilesDir.listFiles().orEmpty()
        val persisted = files.single { it.name == "participant-resume-v1.bin" }
        val bytes = persisted.readBytes()
        assertNotEquals(credential.token, bytes.toString(Charsets.UTF_8))
        assertFalse(bytes.toString(Charsets.UTF_8).contains("private_objective"))
        assertFalse(bytes.toString(Charsets.UTF_8).contains("clue"))
        assertFalse(context.filesDir.resolve(persisted.name).exists())
    }

    @Test
    fun credentialSerializationContainsOnlyApprovedOpaqueFields() {
        val encoded = JSONObject(KeystoreResumeCredentialStore.encodeCredential(resumeCredential()))
        assertEquals(
            setOf(
                "version", "token", "pending_replacement_token", "session_id", "endpoint_id",
                "participant_id", "expires_at_unix_ms", "primary_authority_generation",
                "last_server_sequence", "last_authenticated_unix_ms", "pending_idempotency_ids",
                "gameplay_language", "server_origin",
            ),
            encoded.keys().asSequence().toSet(),
        )
        assertFalse(encoded.toString().contains("private_objective"))
        assertFalse(encoded.toString().contains("revealed_clues"))
        assertFalse(encoded.toString().contains("target_character"))
    }

    @Test
    fun oversizedCredentialFileIsRejectedAndRemovedBeforeReading() {
        val store = KeystoreResumeCredentialStore(context)
        store.delete()
        val credentialFile = context.noBackupFilesDir.resolve("participant-resume-v1.bin")
        credentialFile.writeBytes(ByteArray(65_537))

        assertNull(store.load())
        assertFalse(credentialFile.exists())
    }

    private fun fixture(path: String): String =
        fixtureContext.assets.open(path).bufferedReader(Charsets.UTF_8).use { it.readText() }

    private fun body(request: okhttp3.Request): String = Buffer().also {
        requireNotNull(request.body).writeTo(it)
    }.readUtf8()

    private fun authority() = SessionAuthority(
        sessionId = "session-synthetic-001",
        endpointId = "endpoint-synthetic-player-001",
        participantId = "participant-synthetic-001",
        bearer = "synthetic-memory-only-bearer",
        expiresAtUnixMs = 2_000_000_000_000,
        primaryAuthorityGeneration = 3,
        gameplayLanguage = "en",
        serverEndpoint = ServerEndpoint.parse("https://api.test.guiltyparty.app", false),
    )

    private fun resumeCredential() = StoredResumeCredential(
        token = "synthetic-device-only-resume-token",
        pendingReplacementToken = "synthetic-device-only-rotated-resume-token",
        sessionId = "session-synthetic-001",
        endpointId = "endpoint-synthetic-player-001",
        participantId = "participant-synthetic-001",
        expiresAtUnixMs = 2_000_000_000_000,
        primaryAuthorityGeneration = 3,
        lastServerSequence = 8,
        lastAuthenticatedUnixMs = 1_000,
        pendingIdempotencyIds = listOf("idempotency-synthetic-001"),
        gameplayLanguage = "en",
        serverOrigin = "https://api.test.guiltyparty.app",
    )
}
