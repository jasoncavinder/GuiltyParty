package com.guiltyparty.companion

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import guiltyparty.contracts.v1.GPV1CommandResultBody
import okhttp3.Call
import okhttp3.WebSocket
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import kotlin.random.Random

class CompanionController(
    context: Context,
    private val credentialStore: ResumeCredentialStore = KeystoreResumeCredentialStore(context),
    private val networkClient: NetworkClient = NetworkClient(),
) {
    private val appContext = context.applicationContext
    var snapshot by mutableStateOf(UiSnapshot())
        private set

    private val main = Handler(Looper.getMainLooper())
    private val scheduler = Executors.newSingleThreadScheduledExecutor { runnable ->
        Thread(runnable, "gp-companion-timer").apply { isDaemon = true }
    }
    private val state = SessionStateMachine()
    private val reconnectBackoff = ReconnectBackoff()
    private var authority: SessionAuthority? = null
    private var resumeCredential: StoredResumeCredential? = null
    private var socket: WebSocket? = null
    private var socketId: String? = null
    private var admissionCall: Call? = null
    private var admissionAttempt = 0L
    private var reconnectFuture: ScheduledFuture<*>? = null
    private var negotiationFuture: ScheduledFuture<*>? = null
    private var healthFuture: ScheduledFuture<*>? = null
    private var projectionHeartbeatFuture: ScheduledFuture<*>? = null
    private var settleFuture: ScheduledFuture<*>? = null
    private var stableFuture: ScheduledFuture<*>? = null
    private var lastAuthenticatedElapsedMs: Long? = null
    private var connectionShielded = false
    private var appActive = true
    private var manuallyShielded = false
    private var hasOpenedConnection = false
    private val pendingCommands = mutableMapOf<String, OutboundCommand>()
    private var statusMessage = appContext.getString(R.string.status_join_ready)
    private var gameplayLanguage: String? = null
    private var insecureDevelopmentTransport = false

    init {
        restoreCredentialIfUsable()
        publish()
    }

    val canCastVote: Boolean
        get() {
            val projection = state.projection ?: return false
            return appActive &&
                !manuallyShielded &&
                !state.needsFreshProjection &&
                projection.votingPhase == ParticipantVotingPhase.OPEN &&
                projection.voteTargets.isNotEmpty() &&
                !projection.ownVoteRecorded &&
                pendingCommands.isEmpty()
        }

    fun join(
        invitationPayload: String,
        displayName: String,
        developmentServerOrigin: String = "",
    ) {
        assertMainThread()
        stopTransport()
        clearCredential()
        authority = null
        gameplayLanguage = null
        insecureDevelopmentTransport = false
        pendingCommands.clear()
        reconnectBackoff.reset()
        hasOpenedConnection = false
        manuallyShielded = false
        state.beginJoin()
        statusMessage = text(R.string.status_join_validating)
        publish()

        try {
            val invitation = InvitationDecoder.decode(invitationPayload)
            gameplayLanguage = invitation.gameplayLanguage
            val endpoint = if (developmentServerOrigin.isBlank()) {
                ServerEndpoint.remote()
            } else {
                ServerEndpoint.parse(developmentServerOrigin, BuildConfig.DEBUG)
            }
            insecureDevelopmentTransport = endpoint.isInsecureDevelopment
            val attempt = nextAdmissionAttempt()
            admissionCall = networkClient.discoverCompatibility(
                endpoint,
                object : CompatibilityCallback {
                    override fun onSuccess() = onMain {
                        if (attempt != admissionAttempt) return@onMain
                        try {
                            admissionCall = networkClient.join(
                                endpoint,
                                invitation,
                                displayName,
                                admissionCallback(attempt) { admission ->
                                    acceptAdmission(admission, false)
                                },
                            )
                        } catch (failure: CompanionFailure) {
                            admissionCall = null
                            handleTerminalOrJoinFailure(failure)
                        }
                    }

                    override fun onFailure(failure: CompanionFailure) = onMain {
                        if (attempt != admissionAttempt) return@onMain
                        admissionCall = null
                        handleTerminalOrJoinFailure(failure)
                    }
                },
            )
        } catch (failure: CompanionFailure) {
            handleTerminalOrJoinFailure(failure)
        }
    }

    fun castVote(targetCharacterId: String) {
        assertMainThread()
        val activeAuthority = authority
        val activeSocket = socket
        val authorizedTarget = state.projection?.voteTargets?.any { it.id == targetCharacterId } == true
        if (!canCastVote || !authorizedTarget || activeAuthority == null || activeSocket == null) {
            statusMessage = failureText(FailureKind.CONNECTION_UNAVAILABLE)
            publish()
            return
        }
        try {
            val (command, encoded) = ControlPlaneCodec.voteCommand(activeAuthority, targetCharacterId)
            pendingCommands[command.messageId] = command
            recordPendingIdempotencyId(command.idempotencyId)
            statusMessage = text(R.string.status_vote_submitting)
            publish()
            if (!activeSocket.send(encoded)) {
                protectAndReconnect(PrivacyInterruption.CONNECTION_UNCERTAIN)
            }
        } catch (failure: CompanionFailure) {
            statusMessage = failure.safeMessage
            publish()
        }
    }

    fun setAppActive(active: Boolean) {
        assertMainThread()
        if (appActive == active) return
        appActive = active
        if (active) {
            resumeIfPermitted()
        } else if (authority != null) {
            protect(PrivacyInterruption.BACKGROUND_OR_LOCK)
        }
    }

    fun hidePrivateView() {
        assertMainThread()
        manuallyShielded = true
        if (authority != null) protect(PrivacyInterruption.MANUAL)
    }

    fun revealPrivateView() {
        assertMainThread()
        manuallyShielded = false
        resumeIfPermitted()
    }

    fun manualRejoin() {
        assertMainThread()
        stopTransport()
        clearCredential()
        authority = null
        gameplayLanguage = null
        insecureDevelopmentTransport = false
        pendingCommands.clear()
        reconnectBackoff.reset()
        hasOpenedConnection = false
        manuallyShielded = false
        state.requireManualRejoin()
        statusMessage = text(R.string.status_join_ready)
        publish()
    }

    fun dispose() {
        assertMainThread()
        stopTransport()
        state.interrupt(PrivacyInterruption.BACKGROUND_OR_LOCK)
        publish()
        scheduler.shutdownNow()
    }

    private fun restoreCredentialIfUsable() {
        val credential = credentialStore.load() ?: return
        val now = System.currentTimeMillis()
        val backstop = credential.lastAuthenticatedUnixMs + LOCAL_CREDENTIAL_BACKSTOP_MS
        if (credential.expiresAtUnixMs <= now ||
            credential.lastAuthenticatedUnixMs > now ||
            backstop <= now
        ) {
            credentialStore.delete()
            return
        }
        resumeCredential = credential
        gameplayLanguage = credential.gameplayLanguage
        insecureDevelopmentTransport = runCatching {
            ServerEndpoint.parse(credential.serverOrigin, BuildConfig.DEBUG).isInsecureDevelopment
        }.getOrDefault(false)
        state.beginJoin()
        statusMessage = text(R.string.status_recovering)
        publish()
        main.post { beginCredentialResumeIfNeeded() }
    }

    private fun acceptAdmission(admission: ParticipantAdmission, isResume: Boolean) {
        assertMainThread()
        try {
            persistCredential(admission.resumeCredential)
            authority = admission.authority
            gameplayLanguage = admission.authority.gameplayLanguage
            insecureDevelopmentTransport = admission.authority.serverEndpoint.isInsecureDevelopment
            if (admission.authority.expiresAtUnixMs <= System.currentTimeMillis()) {
                throw CompanionFailure(FailureKind.EXPIRED_OR_REVOKED)
            }
            connect(isRejoin = isResume)
        } catch (failure: CompanionFailure) {
            handleTerminalOrJoinFailure(failure)
        } catch (_: Exception) {
            failProtocol()
        }
    }

    private fun connect(isRejoin: Boolean) {
        assertMainThread()
        val activeAuthority = authority ?: return
        if (!appActive || manuallyShielded) return
        if (activeAuthority.expiresAtUnixMs <= System.currentTimeMillis()) {
            recoverWithResumeCredentialOrExpire()
            return
        }
        stopSocketAndTimers()
        val newSocketId = java.util.UUID.randomUUID().toString()
        socketId = newSocketId
        state.beginSocket(newSocketId, isRejoin, resumeCredential?.lastServerSequence)
        statusMessage = if (isRejoin) {
            text(R.string.status_reconnecting)
        } else {
            text(R.string.status_opening_connection)
        }
        publish()
        socket = networkClient.openSocket(activeAuthority, newSocketId, socketCallback)
    }

    private val socketCallback = object : SocketCallback {
        override fun onOpen(socketId: String) = onMain { handleSocketOpen(socketId) }
        override fun onText(socketId: String, text: String) = onMain { handleServerText(socketId, text) }
        override fun onClosed(socketId: String, code: Int) = onMain { handleSocketClosed(socketId, code) }
        override fun onFailure(socketId: String, failure: SocketFailure) =
            onMain { handleSocketFailure(socketId, failure) }
    }

    private fun handleSocketOpen(eventSocketId: String) {
        if (eventSocketId != socketId) return
        val wasRejoin = hasOpenedConnection
        hasOpenedConnection = true
        statusMessage = if (wasRejoin) {
            text(R.string.status_connected_again)
        } else {
            text(R.string.status_requesting_private_view)
        }
        publish()
        requestFreshProjection(eventSocketId)
        negotiationFuture = schedule(ConnectionHealthPolicy.NEGOTIATION_TIMEOUT_MS) {
            if (eventSocketId == socketId && state.needsFreshProjection) {
                protectAndReconnect(PrivacyInterruption.CONNECTION_UNCERTAIN)
            }
        }
        projectionHeartbeatFuture = scheduler.scheduleWithFixedDelay(
            { onMain { requestFreshProjection(eventSocketId) } },
            15,
            15,
            TimeUnit.SECONDS,
        )
    }

    private fun requestFreshProjection(eventSocketId: String) {
        val activeAuthority = authority ?: return
        val activeSocket = socket ?: return
        if (eventSocketId != socketId) return
        try {
            if (!activeSocket.send(ControlPlaneCodec.projectionRequest(activeAuthority))) {
                protectAndReconnect(PrivacyInterruption.CONNECTION_UNCERTAIN)
            }
        } catch (_: Exception) {
            protectAndReconnect(PrivacyInterruption.CONNECTION_UNCERTAIN)
        }
    }

    private fun handleServerText(eventSocketId: String, text: String) {
        if (eventSocketId != socketId) return
        val activeAuthority = authority ?: return
        try {
            when (val event = ControlPlaneCodec.decodeServerEvent(text, activeAuthority)) {
                is IncomingControlEvent.Projection -> {
                    ensureSequenceIsNotBeforeResume(event.value.serverSequence)
                    val projection = ControlPlaneCodec.participantProjection(event.value, activeAuthority)
                    state.applyProjection(projection, event.value.serverSequence, eventSocketId)
                    recordAuthenticatedSequence(event.value.serverSequence)
                    recordAuthenticatedActivity(eventSocketId, establishesPrivateView = true)
                    gameplayLanguage = projection.gameplayLanguage
                    statusMessage = if (state.phase == CompanionPhase.REJOINED) {
                        text(R.string.status_rejoined)
                    } else if (projection.hasAssignment) {
                        text(R.string.status_current)
                    } else {
                        text(R.string.status_waiting_assignment)
                    }
                    publish()
                    if (state.phase == CompanionPhase.REJOINED) {
                        settleFuture?.cancel(false)
                        settleFuture = schedule(2_000) {
                            if (eventSocketId == socketId) {
                                state.settleRejoined()
                                publish()
                            }
                        }
                    }
                }
                is IncomingControlEvent.CommandResult -> {
                    ensureSequenceIsNotBeforeResume(event.value.serverSequence)
                    state.acceptServerSequence(event.value.serverSequence, eventSocketId)
                    handleCommandResult(event.value.correlationId.value, event.value.payload)
                    recordAuthenticatedSequence(event.value.serverSequence)
                    recordAuthenticatedActivity(eventSocketId)
                    publish()
                }
                is IncomingControlEvent.Error -> {
                    event.value.serverSequence?.let { sequence ->
                        ensureSequenceIsNotBeforeResume(sequence)
                        state.acceptServerSequence(sequence, eventSocketId)
                        recordAuthenticatedSequence(sequence)
                    }
                    recordAuthenticatedActivity(eventSocketId)
                    event.value.correlationId?.value?.let { correlation ->
                        pendingCommands.remove(correlation)?.let { removePendingIdempotencyId(it.idempotencyId) }
                    }
                    val code = event.value.payload.code
                    when {
                        code == "session_ended" -> transitionToSessionEnded()
                        code.contains("expired") || code.contains("revoked") -> transitionToExpiredOrRevoked()
                        else -> {
                            statusMessage = event.value.payload.title
                            publish()
                        }
                    }
                }
            }
        } catch (failure: CompanionFailure) {
            if (failure.kind == FailureKind.SEQUENCE_GAP) {
                protectAndReconnect(PrivacyInterruption.CONNECTION_UNCERTAIN)
            } else {
                failProtocol()
            }
        } catch (_: Exception) {
            failProtocol()
        }
    }

    private fun handleCommandResult(correlationId: String, payload: GPV1CommandResultBody) {
        val pending = pendingCommands.remove(correlationId) ?: return
        removePendingIdempotencyId(pending.idempotencyId)
        when (payload) {
            is GPV1CommandResultBody.Accepted -> {
                if (payload.value.idempotencyId.value != pending.idempotencyId ||
                    payload.value.primaryAuthorityGeneration != authority?.primaryAuthorityGeneration
                ) {
                    throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
                }
                statusMessage = text(R.string.status_vote_accepted)
            }
            is GPV1CommandResultBody.Rejected -> {
                if (payload.value.idempotencyId.value != pending.idempotencyId) {
                    throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
                }
                statusMessage = payload.value.title
            }
        }
    }

    private fun recordAuthenticatedActivity(eventSocketId: String, establishesPrivateView: Boolean = false) {
        if (eventSocketId != socketId) return
        lastAuthenticatedElapsedMs = SystemClock.elapsedRealtime()
        if (!establishesPrivateView) return
        negotiationFuture?.cancel(false)
        negotiationFuture = null
        connectionShielded = false
        if (healthFuture == null) {
            healthFuture = scheduler.scheduleWithFixedDelay(
                { onMain { evaluateConnectionHealth(eventSocketId) } },
                1,
                1,
                TimeUnit.SECONDS,
            )
        }
        stableFuture?.cancel(false)
        stableFuture = schedule(ConnectionHealthPolicy.STABLE_CONNECTION_MS) {
            if (eventSocketId == socketId && !state.needsFreshProjection && !connectionShielded) {
                reconnectBackoff.reset()
            }
        }
    }

    private fun evaluateConnectionHealth(eventSocketId: String) {
        val last = lastAuthenticatedElapsedMs ?: return
        if (eventSocketId != socketId) return
        when (ConnectionHealthPolicy.action(SystemClock.elapsedRealtime() - last)) {
            ConnectionHealthAction.HEALTHY -> Unit
            ConnectionHealthAction.SHIELD -> if (!connectionShielded) {
                state.markConnectionUncertain(eventSocketId)
                connectionShielded = true
                stableFuture?.cancel(false)
                stableFuture = null
                statusMessage = interruptionText(PrivacyInterruption.CONNECTION_UNCERTAIN)
                publish()
                requestFreshProjection(eventSocketId)
            }
            ConnectionHealthAction.DISCONNECT ->
                protectAndReconnect(PrivacyInterruption.CONNECTION_UNCERTAIN)
        }
    }

    private fun handleSocketClosed(eventSocketId: String, code: Int) {
        if (eventSocketId != socketId) return
        handleSocketInterruption(SocketInterruptionPolicy.closed(code))
    }

    private fun handleSocketFailure(eventSocketId: String, failure: SocketFailure) {
        if (eventSocketId != socketId) return
        handleSocketInterruption(SocketInterruptionPolicy.failed(failure))
    }

    private fun handleSocketInterruption(action: SocketInterruptionAction) {
        when (action) {
            SocketInterruptionAction.END_SESSION -> transitionToSessionEnded()
            SocketInterruptionAction.REFRESH_AUTHORITY -> recoverWithResumeCredentialOrExpire()
            SocketInterruptionAction.REFRESH_AUTHORITY_WITH_BACKOFF ->
                recoverWithResumeCredentialOrExpire(useBackoff = true)
            SocketInterruptionAction.RECONNECT_EXISTING_AUTHORITY ->
                protectAndReconnect(PrivacyInterruption.CONNECTION_UNCERTAIN)
            SocketInterruptionAction.FAIL_PROTOCOL -> failProtocol()
        }
    }

    private fun protect(reason: PrivacyInterruption) {
        stopSocketAndTimers()
        pendingCommands.clear()
        state.interrupt(reason)
        statusMessage = interruptionText(reason)
        publish()
    }

    private fun protectAndReconnect(reason: PrivacyInterruption) {
        protect(reason)
        scheduleReconnect()
    }

    private fun scheduleReconnect() {
        if (authority == null || !appActive || manuallyShielded) return
        reconnectFuture?.cancel(false)
        val maximum = reconnectBackoff.nextMaximumDelayMs()
        val delay = if (maximum <= 1) 0 else Random.nextLong(maximum + 1)
        reconnectFuture = schedule(delay) { connect(isRejoin = true) }
    }

    private fun resumeIfPermitted() {
        if (!appActive || manuallyShielded) return
        val activeAuthority = authority
        if (activeAuthority != null && activeAuthority.expiresAtUnixMs > System.currentTimeMillis()) {
            connect(isRejoin = true)
        } else {
            authority = null
            beginCredentialResumeIfNeeded()
        }
    }

    private fun beginCredentialResumeIfNeeded() {
        if (!appActive || manuallyShielded || authority != null || admissionCall != null) return
        var credential = resumeCredential ?: return
        val now = System.currentTimeMillis()
        if (credential.expiresAtUnixMs <= now ||
            credential.lastAuthenticatedUnixMs > now ||
            credential.lastAuthenticatedUnixMs + LOCAL_CREDENTIAL_BACKSTOP_MS <= now
        ) {
            transitionToExpiredOrRevoked()
            return
        }
        state.beginJoin()
        statusMessage = text(R.string.status_recovering)
        publish()
        try {
            if (credential.pendingReplacementToken == null) {
                credential = credential.withReplacement(
                    KeystoreResumeCredentialStore.generateReplacementToken(),
                )
                persistCredential(credential)
            }
            val attempt = nextAdmissionAttempt()
            admissionCall = networkClient.resume(
                credential,
                admissionCallback(attempt) { admission -> acceptAdmission(admission, true) },
            )
        } catch (failure: CompanionFailure) {
            handleResumeFailure(failure)
        }
    }

    private fun admissionCallback(
        attempt: Long,
        success: (ParticipantAdmission) -> Unit,
    ) = object : AdmissionCallback {
        override fun onSuccess(admission: ParticipantAdmission) = onMain {
            if (attempt != admissionAttempt) return@onMain
            admissionCall = null
            success(admission)
        }

        override fun onFailure(failure: CompanionFailure) = onMain {
            if (attempt != admissionAttempt) return@onMain
            admissionCall = null
            if (authority == null && resumeCredential != null) {
                handleResumeFailure(failure)
            } else {
                handleTerminalOrJoinFailure(failure)
            }
        }
    }

    private fun handleResumeFailure(failure: CompanionFailure) {
        if (failure.kind == FailureKind.CONNECTION_UNAVAILABLE) {
            state.interrupt(PrivacyInterruption.CONNECTION_UNCERTAIN)
            statusMessage = text(R.string.status_recovery_waiting)
            publish()
            reconnectFuture?.cancel(false)
            val maximum = reconnectBackoff.nextMaximumDelayMs()
            reconnectFuture = schedule(Random.nextLong(maximum + 1)) {
                beginCredentialResumeIfNeeded()
            }
        } else {
            handleTerminalOrJoinFailure(failure)
        }
    }

    private fun recoverWithResumeCredentialOrExpire(useBackoff: Boolean = false) {
        if (resumeCredential == null) {
            transitionToExpiredOrRevoked()
            return
        }
        stopTransport()
        authority = null
        pendingCommands.clear()
        state.interrupt(PrivacyInterruption.CONNECTION_UNCERTAIN)
        statusMessage = text(R.string.status_refreshing_access)
        publish()
        if (useBackoff) scheduleCredentialResume() else beginCredentialResumeIfNeeded()
    }

    private fun scheduleCredentialResume() {
        reconnectFuture?.cancel(false)
        val maximum = reconnectBackoff.nextMaximumDelayMs()
        val delay = if (maximum <= 1) 0 else Random.nextLong(maximum + 1)
        reconnectFuture = schedule(delay) { beginCredentialResumeIfNeeded() }
    }

    private fun recordAuthenticatedSequence(sequence: Long) {
        val credential = resumeCredential ?: return
        if (sequence < credential.lastServerSequence) {
            throw CompanionFailure(FailureKind.SEQUENCE_REGRESSION)
        }
        persistCredential(
            credential.withAuthenticatedSequence(sequence, System.currentTimeMillis()),
        )
    }

    private fun ensureSequenceIsNotBeforeResume(sequence: Long) {
        if (sequence < (resumeCredential?.lastServerSequence ?: 0)) {
            throw CompanionFailure(FailureKind.SEQUENCE_REGRESSION)
        }
    }

    private fun recordPendingIdempotencyId(identifier: String) {
        val credential = resumeCredential
            ?: throw CompanionFailure(FailureKind.CONNECTION_UNAVAILABLE)
        val pending = (credential.pendingIdempotencyIds + identifier).distinct()
        if (pending.size > 32) throw CompanionFailure(FailureKind.PROTOCOL_VIOLATION)
        persistCredential(credential.withPending(pending))
    }

    private fun removePendingIdempotencyId(identifier: String) {
        val credential = resumeCredential ?: return
        val pending = credential.pendingIdempotencyIds.filter { it != identifier }
        if (pending != credential.pendingIdempotencyIds) {
            persistCredential(credential.withPending(pending))
        }
    }

    private fun persistCredential(credential: StoredResumeCredential) {
        credentialStore.save(credential)
        resumeCredential = credential
    }

    private fun clearCredential() {
        cancelAdmission()
        resumeCredential = null
        credentialStore.delete()
    }

    private fun failProtocol() {
        stopTransport()
        clearCredential()
        authority = null
        pendingCommands.clear()
        state.requireManualRejoin()
        statusMessage = failureText(FailureKind.PROTOCOL_VIOLATION)
        publish()
    }

    private fun handleTerminalOrJoinFailure(failure: CompanionFailure) {
        when (failure.kind) {
            FailureKind.EXPIRED_INVITATION,
            FailureKind.EXPIRED_OR_REVOKED,
            -> transitionToExpiredOrRevoked(failureText(failure))
            FailureKind.SESSION_ENDED -> transitionToSessionEnded()
            FailureKind.INVALID_RESPONSE,
            FailureKind.PROTOCOL_VIOLATION,
            FailureKind.RECIPIENT_BOUNDARY_VIOLATION,
            -> failProtocol()
            else -> {
                state.requireManualRejoin()
                statusMessage = failureText(failure)
                publish()
            }
        }
    }

    private fun transitionToExpiredOrRevoked(message: String? = null) {
        stopTransport()
        clearCredential()
        authority = null
        pendingCommands.clear()
        state.expireOrRevoke()
        statusMessage = message ?: failureText(FailureKind.EXPIRED_OR_REVOKED)
        publish()
    }

    private fun transitionToSessionEnded() {
        stopTransport()
        clearCredential()
        authority = null
        pendingCommands.clear()
        state.endSession()
        statusMessage = failureText(FailureKind.SESSION_ENDED)
        publish()
    }

    private fun stopTransport() {
        cancelAdmission()
        reconnectFuture?.cancel(false)
        reconnectFuture = null
        stopSocketAndTimers()
    }

    private fun stopSocketAndTimers() {
        val previousSocket = socket
        socket = null
        socketId = null
        previousSocket?.cancel()
        listOf(
            negotiationFuture,
            healthFuture,
            projectionHeartbeatFuture,
            settleFuture,
            stableFuture,
        ).forEach { it?.cancel(false) }
        negotiationFuture = null
        healthFuture = null
        projectionHeartbeatFuture = null
        settleFuture = null
        stableFuture = null
        lastAuthenticatedElapsedMs = null
        connectionShielded = false
    }

    private fun publish() {
        snapshot = UiSnapshot(
            phase = state.phase,
            statusMessage = statusMessage,
            projection = state.projection,
            privacyInterruption = state.privacyInterruption,
            gameplayLanguage = gameplayLanguage,
            votePending = pendingCommands.isNotEmpty(),
            insecureDevelopmentTransport = insecureDevelopmentTransport,
        )
    }

    private fun nextAdmissionAttempt(): Long {
        admissionAttempt += 1
        return admissionAttempt
    }

    private fun cancelAdmission() {
        admissionAttempt += 1
        admissionCall?.cancel()
        admissionCall = null
    }

    private fun schedule(delayMs: Long, action: () -> Unit): ScheduledFuture<*> =
        scheduler.schedule({ onMain(action) }, delayMs, TimeUnit.MILLISECONDS)

    private fun onMain(action: () -> Unit) {
        if (Looper.myLooper() == Looper.getMainLooper()) action() else main.post(action)
    }

    private fun assertMainThread() {
        check(Looper.myLooper() == Looper.getMainLooper())
    }

    private fun text(resource: Int): String = appContext.getString(resource)

    private fun failureText(kind: FailureKind): String = text(
        when (kind) {
            FailureKind.INVALID_INVITATION -> R.string.error_invalid_invitation
            FailureKind.EXPIRED_INVITATION -> R.string.error_expired_invitation
            FailureKind.INVALID_DISPLAY_NAME -> R.string.error_invalid_name
            FailureKind.INVALID_RESPONSE,
            FailureKind.PROTOCOL_VIOLATION,
            FailureKind.RECIPIENT_BOUNDARY_VIOLATION,
            FailureKind.SEQUENCE_REGRESSION,
            FailureKind.SEQUENCE_GAP,
            -> R.string.error_unsafe_response
            FailureKind.CONNECTION_UNAVAILABLE -> R.string.error_connection_unavailable
            FailureKind.COMMAND_REJECTED -> R.string.error_command_rejected
            FailureKind.VOTING_CHOICE_UNAVAILABLE -> R.string.voting_choice_unavailable
            FailureKind.UNSUPPORTED_BUILD -> R.string.error_build_unsupported
            FailureKind.JOIN_FAILED -> R.string.error_join_failed
            FailureKind.EXPIRED_OR_REVOKED -> R.string.error_access_ended
            FailureKind.SESSION_ENDED -> R.string.error_session_ended
        },
    )

    private fun failureText(failure: CompanionFailure): String =
        if (failure.safeMessage == failure.kind.defaultMessage) failureText(failure.kind)
        else failure.safeMessage

    private fun interruptionText(reason: PrivacyInterruption): String = text(
        when (reason) {
            PrivacyInterruption.BACKGROUND_OR_LOCK -> R.string.privacy_background
            PrivacyInterruption.CONNECTION_UNCERTAIN -> R.string.privacy_uncertain
            PrivacyInterruption.MANUAL -> R.string.privacy_manual
        },
    )

    companion object {
        private const val LOCAL_CREDENTIAL_BACKSTOP_MS = 24 * 60 * 60 * 1_000L
    }
}
