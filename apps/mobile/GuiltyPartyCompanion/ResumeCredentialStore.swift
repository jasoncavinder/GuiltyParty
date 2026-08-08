import Foundation
import Security

struct StoredResumeCredential: Codable, Equatable, Sendable {
    let token: String
    let sessionID: String
    let endpointID: String
    let participantID: String
    let expiresAtUnixMilliseconds: Int64
    let primaryAuthorityGeneration: Int64
    let lastServerSequence: Int64
    let pendingIdempotencyIDs: [String]
    let gameplayLanguage: String

    func updating(
        lastServerSequence: Int64? = nil,
        pendingIdempotencyIDs: [String]? = nil
    ) -> StoredResumeCredential {
        StoredResumeCredential(
            token: token,
            sessionID: sessionID,
            endpointID: endpointID,
            participantID: participantID,
            expiresAtUnixMilliseconds: expiresAtUnixMilliseconds,
            primaryAuthorityGeneration: primaryAuthorityGeneration,
            lastServerSequence: lastServerSequence ?? self.lastServerSequence,
            pendingIdempotencyIDs: pendingIdempotencyIDs ?? self.pendingIdempotencyIDs,
            gameplayLanguage: gameplayLanguage
        )
    }
}

protocol ResumeCredentialStoring: Sendable {
    func load() throws -> StoredResumeCredential?
    func save(_ credential: StoredResumeCredential) throws
    func delete() throws
}

enum ResumeCredentialStoreError: Error, Equatable {
    case encoding
    case keychain(OSStatus)
}

struct KeychainResumeCredentialStore: ResumeCredentialStoring {
    static let service = "com.guiltyparty.companion.participant-resume.v1"
    static let account = "current-endpoint"

    static func baseQuery() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecAttrSynchronizable as String: kCFBooleanFalse as Any,
        ]
    }

    static func saveAttributes(data: Data) -> [String: Any] {
        [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
    }

    func load() throws -> StoredResumeCredential? {
        var query = Self.baseQuery()
        query[kSecReturnData as String] = kCFBooleanTrue
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound {
            return nil
        }
        guard status == errSecSuccess, let data = result as? Data else {
            throw ResumeCredentialStoreError.keychain(status)
        }
        do {
            return try JSONDecoder().decode(StoredResumeCredential.self, from: data)
        } catch {
            try? delete()
            throw ResumeCredentialStoreError.encoding
        }
    }

    func save(_ credential: StoredResumeCredential) throws {
        let data: Data
        do {
            data = try JSONEncoder().encode(credential)
        } catch {
            throw ResumeCredentialStoreError.encoding
        }

        let attributes = Self.saveAttributes(data: data)
        let updateStatus = SecItemUpdate(
            Self.baseQuery() as CFDictionary,
            attributes as CFDictionary
        )
        if updateStatus == errSecSuccess {
            return
        }
        guard updateStatus == errSecItemNotFound else {
            throw ResumeCredentialStoreError.keychain(updateStatus)
        }

        var insert = Self.baseQuery()
        attributes.forEach { insert[$0.key] = $0.value }
        let insertStatus = SecItemAdd(insert as CFDictionary, nil)
        guard insertStatus == errSecSuccess else {
            throw ResumeCredentialStoreError.keychain(insertStatus)
        }
    }

    func delete() throws {
        let status = SecItemDelete(Self.baseQuery() as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw ResumeCredentialStoreError.keychain(status)
        }
    }
}
