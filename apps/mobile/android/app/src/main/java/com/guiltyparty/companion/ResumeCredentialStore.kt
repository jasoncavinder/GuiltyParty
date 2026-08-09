package com.guiltyparty.companion

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.KeyStore
import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

interface ResumeCredentialStore {
    fun load(): StoredResumeCredential?
    fun save(credential: StoredResumeCredential)
    fun delete()
}

class KeystoreResumeCredentialStore(context: Context) : ResumeCredentialStore {
    private val directory = context.noBackupFilesDir
    private val file = File(directory, FILE_NAME)

    override fun load(): StoredResumeCredential? {
        if (!file.exists()) return null
        return try {
            if (file.length() !in (HEADER_SIZE + GCM_TAG_SIZE).toLong()..MAXIMUM_FILE_BYTES) {
                error("invalid")
            }
            val bytes = file.readBytes()
            if (bytes.size <= HEADER_SIZE || bytes[0] != FORMAT_VERSION) error("invalid")
            val iv = bytes.copyOfRange(1, HEADER_SIZE)
            val encrypted = bytes.copyOfRange(HEADER_SIZE, bytes.size)
            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, requireKey(), GCMParameterSpec(128, iv))
            decodeCredential(cipher.doFinal(encrypted).toString(Charsets.UTF_8))
        } catch (_: Exception) {
            delete()
            null
        }
    }

    override fun save(credential: StoredResumeCredential) {
        directory.mkdirs()
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, requireKey())
        if (cipher.iv.size != IV_SIZE) throw CompanionFailure(FailureKind.CONNECTION_UNAVAILABLE)
        val plaintext = encodeCredential(credential).toByteArray(Charsets.UTF_8)
        val encrypted = cipher.doFinal(plaintext)
        val bytes = byteArrayOf(FORMAT_VERSION) + cipher.iv + encrypted
        val temporary = File(directory, "$FILE_NAME.tmp")
        FileOutputStream(temporary).use { stream ->
            stream.write(bytes)
            stream.fd.sync()
        }
        try {
            Files.move(
                temporary.toPath(),
                file.toPath(),
                StandardCopyOption.ATOMIC_MOVE,
                StandardCopyOption.REPLACE_EXISTING,
            )
        } catch (_: Exception) {
            temporary.delete()
            throw CompanionFailure(FailureKind.CONNECTION_UNAVAILABLE)
        }
    }

    override fun delete() {
        file.delete()
        File(directory, "$FILE_NAME.tmp").delete()
        runCatching {
            val keyStore = keyStore()
            if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS)
        }
    }

    private fun requireKey(): SecretKey {
        val keyStore = keyStore()
        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .setUnlockedDeviceRequired(true)
                .build(),
        )
        return generator.generateKey()
    }

    private fun keyStore(): KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val KEY_ALIAS = "com.guiltyparty.companion.participant_resume.v1"
        private const val FILE_NAME = "participant-resume-v1.bin"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
        private const val FORMAT_VERSION: Byte = 1
        private const val IV_SIZE = 12
        private const val HEADER_SIZE = 1 + IV_SIZE
        private const val GCM_TAG_SIZE = 16
        private const val MAXIMUM_FILE_BYTES = 65_536L

        fun generateReplacementToken(): String {
            val bytes = ByteArray(32)
            SecureRandom().nextBytes(bytes)
            return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
        }

        internal fun encodeCredential(value: StoredResumeCredential): String = JSONObject().apply {
            put("version", 1)
            put("token", value.token)
            put("pending_replacement_token", value.pendingReplacementToken ?: JSONObject.NULL)
            put("session_id", value.sessionId)
            put("endpoint_id", value.endpointId)
            put("participant_id", value.participantId)
            put("expires_at_unix_ms", value.expiresAtUnixMs)
            put("primary_authority_generation", value.primaryAuthorityGeneration)
            put("last_server_sequence", value.lastServerSequence)
            put("last_authenticated_unix_ms", value.lastAuthenticatedUnixMs)
            put("pending_idempotency_ids", JSONArray(value.pendingIdempotencyIds))
            put("gameplay_language", value.gameplayLanguage)
            put("server_origin", value.serverOrigin)
        }.toString()

        internal fun decodeCredential(text: String): StoredResumeCredential {
            val value = JSONObject(text)
            if (value.length() != 13 || value.getInt("version") != 1) {
                throw CompanionFailure(FailureKind.INVALID_RESPONSE)
            }
            val pending = value.getJSONArray("pending_idempotency_ids")
            if (pending.length() > 32) throw CompanionFailure(FailureKind.INVALID_RESPONSE)
            return StoredResumeCredential(
                token = value.getString("token"),
                pendingReplacementToken = if (value.isNull("pending_replacement_token")) null
                    else value.getString("pending_replacement_token"),
                sessionId = value.getString("session_id"),
                endpointId = value.getString("endpoint_id"),
                participantId = value.getString("participant_id"),
                expiresAtUnixMs = value.getLong("expires_at_unix_ms"),
                primaryAuthorityGeneration = value.getLong("primary_authority_generation"),
                lastServerSequence = value.getLong("last_server_sequence"),
                lastAuthenticatedUnixMs = value.getLong("last_authenticated_unix_ms"),
                pendingIdempotencyIds = List(pending.length()) { pending.getString(it) }.also {
                    if (it.toSet().size != it.size) throw CompanionFailure(FailureKind.INVALID_RESPONSE)
                },
                gameplayLanguage = value.getString("gameplay_language"),
                serverOrigin = value.getString("server_origin"),
            )
        }
    }
}
