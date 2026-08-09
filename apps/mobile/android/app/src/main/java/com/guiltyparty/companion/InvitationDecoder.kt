package com.guiltyparty.companion

import guiltyparty.contracts.v1.GPJsonValue
import guiltyparty.contracts.v1.GPV1InvitationTransfer
import java.util.Base64

object InvitationDecoder {
    private val requiredKeys = setOf(
        "version",
        "session_id",
        "pairing_code",
        "expires_at_unix_ms",
        "gameplay_language",
    )
    private val invitationPattern = Regex("^GP1\\.[A-Za-z0-9_-]+$")
    private val sessionPattern = Regex("^[A-Za-z0-9_-]{16,128}$")

    fun decode(
        rawValue: String,
        nowUnixMs: Long = System.currentTimeMillis(),
    ): Invitation {
        val value = rawValue.trim()
        if (value.length > 1_024 || !invitationPattern.matches(value)) {
            throw CompanionFailure(FailureKind.INVALID_INVITATION)
        }
        val encoded = value.drop(4)
        if (encoded.length % 4 == 1) {
            throw CompanionFailure(FailureKind.INVALID_INVITATION)
        }
        val bytes = runCatching { Base64.getUrlDecoder().decode(encoded) }.getOrNull()
            ?: throw CompanionFailure(FailureKind.INVALID_INVITATION)
        if (bytes.size > 768) {
            throw CompanionFailure(FailureKind.INVALID_INVITATION)
        }
        val json = runCatching { ContractJson.parse(ContractJson.decodeUtf8(bytes)) }.getOrNull()
            ?: throw CompanionFailure(FailureKind.INVALID_INVITATION)
        val members = (json as? GPJsonValue.ObjectValue)?.members
            ?: throw CompanionFailure(FailureKind.INVALID_INVITATION)
        if (members.keys != requiredKeys) {
            throw CompanionFailure(FailureKind.INVALID_INVITATION)
        }
        val transfer = runCatching { GPV1InvitationTransfer.from(json) }.getOrNull()
            ?: throw CompanionFailure(FailureKind.INVALID_INVITATION)
        if (!sessionPattern.matches(transfer.sessionId.value)) {
            throw CompanionFailure(FailureKind.INVALID_INVITATION)
        }
        if (transfer.expiresAtUnixMs <= nowUnixMs) {
            throw CompanionFailure(FailureKind.EXPIRED_INVITATION)
        }
        return Invitation(
            sessionId = transfer.sessionId.value,
            pairingProof = transfer.pairingCode,
            expiresAtUnixMs = transfer.expiresAtUnixMs,
            gameplayLanguage = transfer.gameplayLanguage.value,
        )
    }
}
