export const PROTOCOL_VERSION = "1.0";
export const CONTROL_SUBPROTOCOL = "guiltyparty.control.v1";
export const DEVELOPMENT_PROFILE = "development-skeleton";
export const MAX_IDEMPOTENCY_RECORDS_PER_ENDPOINT = 256;

export const COMPATIBILITY_RESPONSE = Object.freeze({
  supported_protocol_majors: [1],
  preferred_protocol_version: PROTOCOL_VERSION,
  required_upgrade: false,
  features: ["remote_development_skeleton"],
});

export const SECURITY_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});
