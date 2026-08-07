const PREFIX = "GP1.";
const MAX_PAYLOAD_LENGTH = 1024;
const SESSION_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{16,128}$/u;
const GAMEPLAY_LANGUAGE_PATTERN = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u;

export function encodeInvitationTransfer({
  sessionId,
  pairingCode,
  expiresAtUnixMs,
  gameplayLanguage,
}) {
  const transfer = {
    version: "1",
    session_id: sessionId,
    pairing_code: pairingCode,
    expires_at_unix_ms: expiresAtUnixMs,
    gameplay_language: gameplayLanguage,
  };
  if (!validInvitationTransfer(transfer)) {
    throw new TypeError("Invalid invitation transfer");
  }
  const encoded = base64UrlEncode(new TextEncoder().encode(JSON.stringify(transfer)));
  const payload = `${PREFIX}${encoded}`;
  if (payload.length > MAX_PAYLOAD_LENGTH) {
    throw new TypeError("Invitation transfer exceeds the supported size");
  }
  return payload;
}

export function decodeInvitationTransfer(payload) {
  if (
    typeof payload !== "string" ||
    payload.length > MAX_PAYLOAD_LENGTH ||
    !/^GP1\.[A-Za-z0-9_-]+$/u.test(payload)
  ) {
    throw new TypeError("Invalid invitation payload");
  }
  try {
    const json = new TextDecoder("utf-8", { fatal: true }).decode(
      base64UrlDecode(payload.slice(PREFIX.length)),
    );
    const value = JSON.parse(json);
    if (!validInvitationTransfer(value)) {
      throw new TypeError("Invalid invitation transfer");
    }
    return value;
  } catch (error) {
    if (error instanceof TypeError && error.message === "Invalid invitation transfer") {
      throw error;
    }
    throw new TypeError("Invalid invitation payload");
  }
}

function validInvitationTransfer(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 5 &&
    value.version === "1" &&
    SESSION_IDENTIFIER_PATTERN.test(value.session_id) &&
    typeof value.pairing_code === "string" &&
    value.pairing_code.length >= 12 &&
    value.pairing_code.length <= 128 &&
    Number.isSafeInteger(value.expires_at_unix_ms) &&
    value.expires_at_unix_ms > 0 &&
    typeof value.gameplay_language === "string" &&
    value.gameplay_language.length <= 63 &&
    GAMEPLAY_LANGUAGE_PATTERN.test(value.gameplay_language)
  );
}

function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlDecode(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
