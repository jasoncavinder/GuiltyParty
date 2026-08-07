export const PROTOCOL_VERSION = "1.0";
export const CONTROL_SUBPROTOCOL = "guiltyparty.control.v1";
export const WEBSOCKET_TICKET_SUBPROTOCOL_PREFIX = "guiltyparty.ticket.";
export const FRIENDS_MVP_PROFILE = "friends-mvp-development";
export const MAX_IDEMPOTENCY_RECORDS_PER_ENDPOINT = 256;
export const MAX_REQUEST_BODY_BYTES = 16 * 1024;
export const MAX_WEBSOCKET_MESSAGE_BYTES = 32 * 1024;
export const MAX_PARTICIPANTS = 8;
export const SESSION_ACTIVE_DURATION_MS = 4 * 60 * 60 * 1000;
export const SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const INVITATION_DURATION_MS = 15 * 60 * 1000;
export const JOIN_RATE_WINDOW_MS = 5 * 60 * 1000;
export const MAX_JOIN_ATTEMPTS_PER_WINDOW = 30;
export const MESSAGE_RATE_WINDOW_MS = 10 * 1000;
export const MAX_MESSAGES_PER_WINDOW = 100;
export const WEBSOCKET_TICKET_DURATION_MS = 30 * 1000;
export const MAX_WEBSOCKET_TICKETS_PER_ENDPOINT = 16;

export const COMPATIBILITY_RESPONSE = Object.freeze({
  supported_protocol_majors: [1],
  preferred_protocol_version: PROTOCOL_VERSION,
  required_upgrade: false,
  features: [
    "remote_friends_mvp",
    "guest_pairing",
    "browser_cookie_authority",
    "packaged_stage_websocket_ticket",
    "durable_session_hibernation",
  ],
});

export const SECURITY_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});
