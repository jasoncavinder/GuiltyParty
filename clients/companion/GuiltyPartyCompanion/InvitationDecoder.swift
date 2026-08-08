import Foundation

enum InvitationDecoder {
    private static let requiredKeys: Set<String> = [
        "version",
        "session_id",
        "pairing_code",
        "expires_at_unix_ms",
        "gameplay_language"
    ]
    private static let sessionPattern = try! NSRegularExpression(
        pattern: "^[A-Za-z0-9_-]{16,128}$"
    )

    static func decode(
        _ rawValue: String,
        nowUnixMilliseconds: Int64 = Int64(Date().timeIntervalSince1970 * 1_000)
    ) throws -> Invitation {
        let value = rawValue.trimmingCharacters(in: .whitespacesAndNewlines)
        guard value.count <= 1_024,
              value.range(of: "^GP1\\.[A-Za-z0-9_-]+$", options: .regularExpression) != nil
        else {
            throw SessionModelError.invalidInvitation
        }

        let encoded = String(value.dropFirst(4))
        guard encoded.count % 4 != 1 else {
            throw SessionModelError.invalidInvitation
        }
        let standard = encoded
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let padding = String(repeating: "=", count: (4 - standard.count % 4) % 4)
        guard let data = Data(base64Encoded: standard + padding),
              data.count <= 768,
              let object = try? JSONSerialization.jsonObject(with: data),
              let dictionary = object as? [String: Any],
              Set(dictionary.keys) == requiredKeys,
              let transfer = try? JSONDecoder().decode(GPV1InvitationTransfer.self, from: data),
              sessionPattern.firstMatch(
                in: transfer.sessionId.value,
                range: NSRange(transfer.sessionId.value.startIndex..., in: transfer.sessionId.value)
              ) != nil
        else {
            throw SessionModelError.invalidInvitation
        }

        guard transfer.expiresAtUnixMs > nowUnixMilliseconds else {
            throw SessionModelError.expiredInvitation
        }
        return Invitation(
            sessionID: transfer.sessionId.value,
            pairingProof: transfer.pairingCode,
            expiresAtUnixMilliseconds: transfer.expiresAtUnixMs,
            gameplayLanguage: transfer.gameplayLanguage.value
        )
    }
}
