package com.guiltyparty.companion

import guiltyparty.contracts.v1.GPV1ClientBuild
import guiltyparty.contracts.v1.GPV1EndpointRegistration
import guiltyparty.contracts.v1.GPV1FeatureIdentifier
import guiltyparty.contracts.v1.GPV1Identifier
import guiltyparty.contracts.v1.GPV1JoinRequest
import guiltyparty.contracts.v1.GPV1JoinRequestParticipant
import guiltyparty.contracts.v1.GPV1MessageIdentifier
import guiltyparty.contracts.v1.GPV1ParticipantResumeRequest
import guiltyparty.contracts.v1.GPV1ProblemDetails
import guiltyparty.contracts.v1.GPV1ProtocolVersion
import guiltyparty.contracts.v1.GPV1RemoteFriendsJoinResponse
import guiltyparty.contracts.v1.GPV1RemoteNativeResumeResponse
import guiltyparty.contracts.v1.GPV1ResumedCommandStatus
import okhttp3.Call
import okhttp3.Callback
import okhttp3.CookieJar
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import java.io.IOException
import java.util.concurrent.TimeUnit

interface AdmissionCallback {
    fun onSuccess(admission: ParticipantAdmission)
    fun onFailure(failure: CompanionFailure)
}

interface SocketCallback {
    fun onOpen(socketId: String)
    fun onText(socketId: String, text: String)
    fun onClosed(socketId: String, code: Int)
    fun onFailure(socketId: String, failure: SocketFailure)
}

enum class SocketFailure { AMBIGUOUS_TRANSPORT, PROTOCOL_VIOLATION }

class NetworkClient {
    internal val httpClient = baseBuilder()
        .callTimeout(20, TimeUnit.SECONDS)
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .writeTimeout(15, TimeUnit.SECONDS)
        .build()
    internal val socketClient = baseBuilder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .pingInterval(15, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    fun join(
        endpoint: ServerEndpoint,
        invitation: Invitation,
        displayName: String,
        callback: AdmissionCallback,
    ): Call {
        val request = buildJoinRequest(endpoint, invitation, displayName)
        val call = httpClient.newCall(request)
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback.onFailure(CompanionFailure(FailureKind.CONNECTION_UNAVAILABLE))
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    try {
                        val text = responseText(it)
                        if (!it.isSuccessful) throw classifyHttpFailure(it.code, text)
                        requireNoStore(it)
                        callback.onSuccess(decodeJoinResponse(text, invitation, endpoint))
                    } catch (failure: CompanionFailure) {
                        callback.onFailure(failure)
                    } catch (_: Exception) {
                        callback.onFailure(CompanionFailure(FailureKind.INVALID_RESPONSE))
                    }
                }
            }
        })
        return call
    }

    internal fun buildJoinRequest(
        endpoint: ServerEndpoint,
        invitation: Invitation,
        displayName: String,
    ): Request {
        val nickname = displayName.trim()
        if (nickname.codePointCount(0, nickname.length) !in 1..80 ||
            nickname.any { it.code in 0x00..0x1f || it.code in 0x7f..0x9f }
        ) {
            throw CompanionFailure(FailureKind.INVALID_DISPLAY_NAME)
        }
        val body = GPV1JoinRequest.Participant(
            GPV1JoinRequestParticipant(
                displayName = nickname,
                endpoint = GPV1EndpointRegistration(
                    capabilities = listOf(
                        GPV1FeatureIdentifier("private_display"),
                        GPV1FeatureIdentifier("touch_input"),
                    ),
                    clientBuild = clientBuild(),
                    platform = GPV1FeatureIdentifier("android_companion"),
                ),
                kind = "participant",
                protocolVersion = GPV1ProtocolVersion("1.0"),
            ),
        )
        return Request.Builder()
            .url(endpoint.joinUrl)
            .header("Accept", JSON_MEDIA_TYPE)
            .header("Cache-Control", "no-store")
            .header("X-GP-Session-ID", invitation.sessionId)
            .header("Authorization", "Pairing ${invitation.pairingProof}")
            .post(ContractJson.stringify(body.toJson()).toRequestBody(JSON_TYPE))
            .build()
    }

    internal fun decodeJoinResponse(
        text: String,
        invitation: Invitation,
        endpoint: ServerEndpoint,
        nowUnixMs: Long = System.currentTimeMillis(),
    ): ParticipantAdmission {
        val result = GPV1RemoteFriendsJoinResponse.from(ContractJson.parse(text))
        val joined = (result as? GPV1RemoteFriendsJoinResponse.AuthorizationHeader)?.value
            ?: throw CompanionFailure(FailureKind.INVALID_RESPONSE)
        val participant = joined.participantId?.value
            ?: throw CompanionFailure(FailureKind.INVALID_RESPONSE)
        if (joined.sessionId.value != invitation.sessionId ||
            joined.authorityExpiresAtUnixMs <= nowUnixMs ||
            joined.resumeExpiresAtUnixMs <= nowUnixMs
        ) {
            throw CompanionFailure(FailureKind.INVALID_RESPONSE)
        }
        return ParticipantAdmission(
            authority = SessionAuthority(
                joined.sessionId.value,
                joined.endpointId.value,
                participant,
                joined.token.value,
                joined.authorityExpiresAtUnixMs,
                joined.primaryAuthorityGeneration,
                invitation.gameplayLanguage,
                endpoint,
            ),
            resumeCredential = StoredResumeCredential(
                joined.resumeToken.value,
                null,
                joined.sessionId.value,
                joined.endpointId.value,
                participant,
                joined.resumeExpiresAtUnixMs,
                joined.primaryAuthorityGeneration,
                joined.serverSequence,
                nowUnixMs,
                emptyList(),
                invitation.gameplayLanguage,
                endpoint.origin,
            ),
        )
    }

    fun resume(credential: StoredResumeCredential, callback: AdmissionCallback): Call {
        val request = buildResumeRequest(credential)
        val replacement = credential.pendingReplacementToken
            ?: throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
        val endpoint = ServerEndpoint.parse(credential.serverOrigin, BuildConfig.DEBUG)
        val call = httpClient.newCall(request)
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                callback.onFailure(CompanionFailure(FailureKind.CONNECTION_UNAVAILABLE))
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    try {
                        val text = responseText(it)
                        if (!it.isSuccessful) throw classifyHttpFailure(it.code, text)
                        requireNoStore(it)
                        val resumed = GPV1RemoteNativeResumeResponse.from(ContractJson.parse(text))
                        validateResume(resumed, credential, replacement)
                        callback.onSuccess(admissionFromResume(resumed, credential, endpoint))
                    } catch (failure: CompanionFailure) {
                        callback.onFailure(failure)
                    } catch (_: Exception) {
                        callback.onFailure(CompanionFailure(FailureKind.INVALID_RESPONSE))
                    }
                }
            }
        })
        return call
    }

    internal fun buildResumeRequest(credential: StoredResumeCredential): Request {
        val replacement = credential.pendingReplacementToken
        if (replacement.isNullOrBlank() || replacement == credential.token) {
            throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
        }
        val endpoint = ServerEndpoint.parse(credential.serverOrigin, BuildConfig.DEBUG)
        val body = GPV1ParticipantResumeRequest(
            clientBuild = clientBuild(),
            endpointId = GPV1Identifier(credential.endpointId),
            lastServerSequence = credential.lastServerSequence,
            participantId = GPV1Identifier(credential.participantId),
            pendingIdempotencyIds = credential.pendingIdempotencyIds.map(::GPV1MessageIdentifier),
            primaryAuthorityGeneration = credential.primaryAuthorityGeneration,
            protocolVersion = GPV1ProtocolVersion("1.0"),
            sessionId = GPV1Identifier(credential.sessionId),
        )
        return Request.Builder()
            .url(endpoint.resumeUrl)
            .header("Accept", JSON_MEDIA_TYPE)
            .header("Cache-Control", "no-store")
            .header("Authorization", "Resume ${credential.token}")
            .header("X-GP-Replacement-Resume", replacement)
            .post(ContractJson.stringify(body.toJson()).toRequestBody(JSON_TYPE))
            .build()
    }

    internal fun decodeResumeResponse(
        text: String,
        previous: StoredResumeCredential,
        nowUnixMs: Long = System.currentTimeMillis(),
    ): ParticipantAdmission {
        val replacement = previous.pendingReplacementToken
            ?: throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
        val resumed = GPV1RemoteNativeResumeResponse.from(ContractJson.parse(text))
        validateResume(resumed, previous, replacement, nowUnixMs)
        return admissionFromResume(
            resumed,
            previous,
            ServerEndpoint.parse(previous.serverOrigin, BuildConfig.DEBUG),
            nowUnixMs,
        )
    }

    fun openSocket(authority: SessionAuthority, socketId: String, callback: SocketCallback): WebSocket {
        val request = Request.Builder()
            .url(authority.serverEndpoint.webSocketUrl)
            .header("Authorization", "Bearer ${authority.bearer}")
            .header("Sec-WebSocket-Protocol", CONTROL_SUBPROTOCOL)
            .header("Cache-Control", "no-store")
            .build()
        return socketClient.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                if (response.header("Sec-WebSocket-Protocol") != CONTROL_SUBPROTOCOL) {
                    webSocket.close(1002, null)
                    callback.onFailure(socketId, SocketFailure.PROTOCOL_VIOLATION)
                    return
                }
                callback.onOpen(socketId)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                if (text.toByteArray(Charsets.UTF_8).size > MAXIMUM_RESPONSE_BYTES) {
                    webSocket.close(1009, null)
                    callback.onFailure(socketId, SocketFailure.PROTOCOL_VIOLATION)
                } else {
                    callback.onText(socketId, text)
                }
            }

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                webSocket.close(1003, null)
                callback.onFailure(socketId, SocketFailure.PROTOCOL_VIOLATION)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                callback.onClosed(socketId, code)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                callback.onFailure(socketId, SocketFailure.AMBIGUOUS_TRANSPORT)
            }
        })
    }

    private fun admissionFromResume(
        resumed: GPV1RemoteNativeResumeResponse,
        previous: StoredResumeCredential,
        endpoint: ServerEndpoint,
        nowUnixMs: Long = System.currentTimeMillis(),
    ) = ParticipantAdmission(
        authority = SessionAuthority(
            resumed.sessionId.value,
            resumed.endpointId.value,
            resumed.participantId.value,
            resumed.token.value,
            resumed.authorityExpiresAtUnixMs,
            resumed.primaryAuthorityGeneration,
            previous.gameplayLanguage,
            endpoint,
        ),
        resumeCredential = StoredResumeCredential(
            resumed.resumeToken.value,
            null,
            resumed.sessionId.value,
            resumed.endpointId.value,
            resumed.participantId.value,
            resumed.resumeExpiresAtUnixMs,
            resumed.primaryAuthorityGeneration,
            resumed.serverSequence,
            nowUnixMs,
            emptyList(),
            previous.gameplayLanguage,
            endpoint.origin,
        ),
    )

    private fun validateResume(
        resumed: GPV1RemoteNativeResumeResponse,
        previous: StoredResumeCredential,
        replacement: String,
        nowUnixMs: Long = System.currentTimeMillis(),
    ) {
        val requested = previous.pendingIdempotencyIds.toSet()
        val results = resumed.pendingCommandResults.associate { result ->
            when (result) {
                is GPV1ResumedCommandStatus.Accepted -> result.value.idempotencyId.value to result.value.serverSequence
                is GPV1ResumedCommandStatus.Rejected -> result.value.idempotencyId.value to result.value.serverSequence
                is GPV1ResumedCommandStatus.Unknown -> result.value.idempotencyId.value to null
            }
        }
        if (resumed.sessionId.value != previous.sessionId ||
            resumed.endpointId.value != previous.endpointId ||
            resumed.participantId.value != previous.participantId ||
            resumed.resumeToken.value != replacement ||
            resumed.primaryAuthorityGeneration <= previous.primaryAuthorityGeneration ||
            resumed.authorityExpiresAtUnixMs <= nowUnixMs ||
            resumed.resumeExpiresAtUnixMs <= nowUnixMs ||
            resumed.serverSequence < previous.lastServerSequence ||
            results.keys != requested ||
            results.values.filterNotNull().any { it > resumed.serverSequence }
        ) {
            throw CompanionFailure(FailureKind.INVALID_RESPONSE)
        }
    }

    private fun responseText(response: Response): String {
        val body = response.body ?: throw CompanionFailure(FailureKind.INVALID_RESPONSE)
        if (body.contentLength() > MAXIMUM_RESPONSE_BYTES) {
            throw CompanionFailure(FailureKind.INVALID_RESPONSE)
        }
        val bytes = body.byteStream().readNBytes(MAXIMUM_RESPONSE_BYTES + 1)
        if (bytes.size > MAXIMUM_RESPONSE_BYTES) {
            throw CompanionFailure(FailureKind.INVALID_RESPONSE)
        }
        return ContractJson.decodeUtf8(bytes)
    }

    private fun requireNoStore(response: Response) {
        if (!response.header("Cache-Control").orEmpty().lowercase().contains("no-store")) {
            throw CompanionFailure(FailureKind.INVALID_RESPONSE)
        }
    }

    private fun classifyHttpFailure(status: Int, text: String): CompanionFailure {
        val problem = runCatching { GPV1ProblemDetails.from(ContractJson.parse(text)) }.getOrNull()
        val code = problem?.code.orEmpty()
        return when {
            code == "session_ended" -> CompanionFailure(FailureKind.SESSION_ENDED)
            status == 410 || status == 401 || code.contains("expired") ||
                code.contains("revoked") || code.contains("invitation") || code.contains("resume") ->
                CompanionFailure(FailureKind.EXPIRED_OR_REVOKED)
            status == 429 || status >= 500 -> CompanionFailure(FailureKind.CONNECTION_UNAVAILABLE)
            code == "unsupported_client_build" || code == "upgrade_required" ->
                CompanionFailure(
                    FailureKind.COMMAND_REJECTED,
                    "This development build is no longer supported by the test service.",
                )
            else -> CompanionFailure(
                FailureKind.COMMAND_REJECTED,
                problem?.title ?: "The session could not be joined.",
            )
        }
    }

    private fun clientBuild() = GPV1ClientBuild(
        applicationId = GPV1FeatureIdentifier("companion_android"),
        applicationVersion = BuildConfig.VERSION_NAME.substringBefore('-'),
        buildNumber = BuildConfig.VERSION_CODE.toLong(),
    )

    private fun baseBuilder() = OkHttpClient.Builder()
        .cache(null)
        .cookieJar(CookieJar.NO_COOKIES)
        .followRedirects(false)
        .followSslRedirects(false)
        .retryOnConnectionFailure(false)

    companion object {
        const val CONTROL_SUBPROTOCOL = "guiltyparty.control.v1"
        const val MAXIMUM_RESPONSE_BYTES = 262_144
        private const val JSON_MEDIA_TYPE = "application/json"
        private val JSON_TYPE = JSON_MEDIA_TYPE.toMediaType()
    }
}
