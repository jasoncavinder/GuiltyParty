import {
  COMPATIBILITY_RESPONSE,
  CONTROL_SUBPROTOCOL,
  FRIENDS_MVP_PROFILE,
  INVITATION_DURATION_MS,
  MAX_REQUEST_BODY_BYTES,
  PROTOCOL_VERSION,
  SESSION_ACTIVE_DURATION_MS,
  SESSION_RETENTION_MS,
  WEBSOCKET_TICKET_DURATION_MS,
  WEBSOCKET_TICKET_SUBPROTOCOL_PREFIX,
} from "./constants.js";
import {
  authorityCookie,
  clearAuthorityCookie,
  issueAuthorityToken,
  issueWebSocketTicket,
  offeredSubprotocols,
  requestOriginAllowed,
  resolveFriendsAuthority,
  resolvePackagedStageAuthority,
  sha256Hex,
  verifyBootstrapProof,
  verifyWebSocketTicket,
  webSocketTicketFromSubprotocols,
  webSocketTicketSubprotocol,
} from "./friends-auth.js";
import { jsonResponse, methodNotAllowed, problemResponse } from "./http.js";

const SESSION_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const FEATURE_IDENTIFIER_PATTERN = /^[a-z][a-z0-9_.-]{0,127}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && isCredentialedApiPath(url.pathname)) {
      return corsPreflight(request, env);
    }

    if (url.pathname === "/health") {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }
      const friendsProfile = env.ENVIRONMENT_PROFILE === FRIENDS_MVP_PROFILE;
      return jsonResponse({
        service: "guilty-party-remote",
        status: env.EMERGENCY_DISABLED === "true"
          ? "disabled"
          : friendsProfile
            ? "test-gated"
            : "development-only",
        profile: env.ENVIRONMENT_PROFILE ?? "unconfigured",
      });
    }

    if (url.pathname === "/api/protocol") {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }
      return jsonResponse(COMPATIBILITY_RESPONSE);
    }

    if (url.pathname === "/api/v1/sessions") {
      if (request.method !== "POST") {
        return withCors(methodNotAllowed("POST"), request, env);
      }
      return withCors(await createSession(request, env), request, env);
    }

    if (url.pathname === "/api/v1/join") {
      if (request.method !== "POST") {
        return withCors(methodNotAllowed("POST"), request, env);
      }
      return withCors(await joinSession(request, env), request, env);
    }

    if (url.pathname === "/api/v1/websocket-tickets") {
      if (request.method !== "POST") {
        return withCors(methodNotAllowed("POST"), request, env);
      }
      return withCors(await createWebSocketTicket(request, env), request, env);
    }

    if (url.pathname === "/api/v1/session/invitation") {
      if (request.method === "PUT") {
        return withCors(await controlSession(request, env, "rotate_invitation"), request, env);
      }
      if (request.method === "DELETE") {
        return withCors(await controlSession(request, env, "close_invitation"), request, env);
      }
      return withCors(methodNotAllowed("PUT or DELETE"), request, env);
    }

    if (url.pathname === "/api/v1/session/end") {
      if (request.method !== "POST") {
        return withCors(methodNotAllowed("POST"), request, env);
      }
      return withCors(await controlSession(request, env, "end_session"), request, env);
    }

    const revokeMatch = url.pathname.match(/^\/api\/v1\/session\/endpoints\/([^/]+)\/revoke$/u);
    if (revokeMatch) {
      if (request.method !== "POST") {
        return withCors(methodNotAllowed("POST"), request, env);
      }
      return withCors(
        await controlSession(request, env, "revoke_endpoint", revokeMatch[1]),
        request,
        env,
      );
    }

    if (url.pathname === "/ws/v1") {
      return handleWebSocket(request, env);
    }

    return problemResponse(404, "not_found", "Endpoint not found");
  },
};

async function createSession(request, env) {
  const unavailable = friendsServiceUnavailable(env);
  if (unavailable) {
    return unavailable;
  }
  if (!requestOriginAllowed(request, env.ALLOWED_ORIGINS)) {
    return problemResponse(403, "origin_not_allowed", "Origin not allowed", { retryable: false });
  }
  const origin = request.headers.get("Origin");
  if (origin === null) {
    return problemResponse(400, "browser_origin_required", "Browser origin required", {
      retryable: false,
    });
  }
  const bootstrap = await verifyBootstrapProof(request, env.HOST_BOOTSTRAP_TOKEN_SHA256);
  if (!bootstrap.ok) {
    return problemResponse(bootstrap.status, bootstrap.code, "Invalid Host bootstrap proof", {
      retryable: false,
    });
  }

  const parsed = await readJsonObject(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  if (!validCreateSessionRequest(parsed.value)) {
    return problemResponse(400, "invalid_session_request", "Invalid session request", {
      retryable: false,
    });
  }
  const edgeLimit = await consumeEdgeLimit(
    env.SESSION_CREATE_RATE_LIMITER,
    "authenticated-host",
  );
  if (!edgeLimit.ok) {
    return edgeLimit.response;
  }

  const now = Date.now();
  const sessionId = randomIdentifier("ses");
  const endpointId = randomIdentifier("end");
  const roomId = randomIdentifier("room");
  const pairingCode = randomSecret(12);
  const invitationExpiresAt = now + INVITATION_DURATION_MS;
  const sessionExpiresAt = now + SESSION_ACTIVE_DURATION_MS;
  const deleteAt = sessionExpiresAt + SESSION_RETENTION_MS;

  const stub = sessionStub(env, sessionId);
  const internalResponse = await stub.fetch("https://session.internal/internal/session/create", {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify({
      session_id: sessionId,
      host_endpoint_id: endpointId,
      host_room_id: roomId,
      host_origin: origin,
      endpoint: parsed.value.endpoint,
      invitation_digest: await sha256Hex(pairingCode),
      invitation_expires_at_unix_ms: invitationExpiresAt,
      session_expires_at_unix_ms: sessionExpiresAt,
      delete_at_unix_ms: deleteAt,
      created_at_unix_ms: now,
    }),
  });
  if (!internalResponse.ok) {
    return safeInternalFailure(internalResponse, "session_creation_failed", "Session creation failed");
  }

  const token = await issueAuthorityToken(
    {
      sessionId,
      endpointId,
      audience: "host",
      participantId: null,
      authorityGeneration: 1,
      expiresAtUnixMs: sessionExpiresAt,
      origin,
    },
    env.AUTHORITY_SIGNING_KEY,
  );
  return jsonResponse(
    {
      protocol_version: PROTOCOL_VERSION,
      session_id: sessionId,
      endpoint_id: endpointId,
      room_id: roomId,
      authority_transport: "cookie",
      pairing_code: pairingCode,
      pairing_expires_at_unix_ms: invitationExpiresAt,
      session_expires_at_unix_ms: sessionExpiresAt,
      maximum_participants: 8,
    },
    {
      status: 201,
      headers: { "Set-Cookie": authorityCookie(token, sessionExpiresAt) },
    },
  );
}

async function joinSession(request, env) {
  const unavailable = friendsServiceUnavailable(env);
  if (unavailable) {
    return unavailable;
  }
  const sessionId = request.headers.get("X-GP-Session-ID") ?? "";
  if (!SESSION_IDENTIFIER_PATTERN.test(sessionId)) {
    return problemResponse(400, "invalid_session_context", "Invalid session context", {
      retryable: false,
    });
  }
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Pairing ")) {
    return problemResponse(401, "invalid_pairing_proof", "Invalid pairing proof", {
      retryable: false,
    });
  }
  const pairingCode = authorization.slice("Pairing ".length);
  if (pairingCode.length < 12 || pairingCode.length > 128) {
    return problemResponse(401, "invalid_pairing_proof", "Invalid pairing proof", {
      retryable: false,
    });
  }

  const parsed = await readJsonObject(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  if (!validJoinRequest(parsed.value)) {
    return problemResponse(400, "invalid_join_request", "Invalid join request", {
      retryable: false,
    });
  }

  const requestOrigin = request.headers.get("Origin");
  const packagedStage = isPackagedStageJoin(parsed.value, requestOrigin);
  const browser = requestOrigin !== null && requestOrigin !== "null";
  if (
    (!packagedStage && !requestOriginAllowed(request, env.ALLOWED_ORIGINS)) ||
    (requestOrigin === "null" && !packagedStage)
  ) {
    return problemResponse(403, "origin_not_allowed", "Origin not allowed", { retryable: false });
  }
  if (requestOrigin === null && parsed.value.kind === "stage") {
    return problemResponse(
      400,
      "packaged_stage_origin_required",
      "Packaged Stage origin required",
      { retryable: false },
    );
  }
  const edgeLimit = await consumeEdgeLimit(
    env.SESSION_JOIN_RATE_LIMITER,
    await sha256Hex(sessionId),
  );
  if (!edgeLimit.ok) {
    return edgeLimit.response;
  }

  const authorityOrigin = browser ? requestOrigin : null;
  const stub = sessionStub(env, sessionId);
  const internalResponse = await stub.fetch("https://session.internal/internal/session/join", {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify({
      pairing_digest: await sha256Hex(pairingCode),
      origin: authorityOrigin,
      join: parsed.value,
      now_unix_ms: Date.now(),
    }),
  });
  if (!internalResponse.ok) {
    return safeInternalFailure(internalResponse, "join_failed", "Unable to join session");
  }
  const admission = await internalResponse.json();
  const token = await issueAuthorityToken(
    {
      sessionId,
      endpointId: admission.endpoint_id,
      audience: admission.audience,
      participantId: admission.participant_id,
      authorityGeneration: admission.authority_generation,
      expiresAtUnixMs: admission.expires_at_unix_ms,
      origin: authorityOrigin,
    },
    env.AUTHORITY_SIGNING_KEY,
  );
  const websocketTransport = packagedStage
    ? "ticket_subprotocol"
    : browser
      ? "cookie"
      : "authorization_header";
  return jsonResponse(
    {
      protocol_version: PROTOCOL_VERSION,
      ...(!browser ? { token } : {}),
      session_id: sessionId,
      endpoint_id: admission.endpoint_id,
      room_id: admission.room_id,
      participant_id: admission.participant_id,
      authority_transport: browser ? "cookie" : "bearer",
      websocket_transport: websocketTransport,
      ...(packagedStage
        ? { websocket_ticket_endpoint: "/api/v1/websocket-tickets" }
        : {}),
      authority_expires_at_unix_ms: admission.expires_at_unix_ms,
      primary_authority_generation: admission.authority_generation,
    },
    {
      status: 200,
      headers: browser
        ? { "Set-Cookie": authorityCookie(token, admission.expires_at_unix_ms) }
        : undefined,
    },
  );
}

async function createWebSocketTicket(request, env) {
  const unavailable = friendsServiceUnavailable(env);
  if (unavailable) {
    return unavailable;
  }
  const resolved = await resolvePackagedStageAuthority(request, env);
  if (!resolved.ok) {
    const title = resolved.status === 401 ? "Invalid authority" : "Packaged Stage unavailable";
    return problemResponse(resolved.status, resolved.code, title, { retryable: false });
  }

  const now = Date.now();
  const authority = resolved.authority;
  const ticketExpiresAtUnixMs = Math.min(
    now + WEBSOCKET_TICKET_DURATION_MS,
    authority.expiresAtUnixMs,
  );
  if (ticketExpiresAtUnixMs <= now) {
    return problemResponse(401, "authority_expired", "Invalid authority", { retryable: false });
  }
  const ticket = await issueWebSocketTicket(
    {
      ticketId: randomIdentifier("wst"),
      sessionId: authority.sessionId,
      endpointId: authority.endpointId,
      audience: authority.audience,
      participantId: authority.participantId,
      authorityGeneration: authority.authorityGeneration,
      authorityExpiresAtUnixMs: authority.expiresAtUnixMs,
      ticketExpiresAtUnixMs,
    },
    env.AUTHORITY_SIGNING_KEY,
  );
  const stub = sessionStub(env, authority.sessionId);
  const registration = await stub.fetch(
    "https://session.internal/internal/session/websocket-ticket",
    {
      method: "POST",
      headers: internalAuthorityHeaders(authority),
      body: JSON.stringify({
        ticket_digest: await sha256Hex(ticket),
        ticket_expires_at_unix_ms: ticketExpiresAtUnixMs,
        now_unix_ms: now,
      }),
    },
  );
  if (!registration.ok) {
    return safeInternalFailure(
      registration,
      "websocket_ticket_failed",
      "WebSocket ticket unavailable",
    );
  }
  return jsonResponse({
    protocol_version: PROTOCOL_VERSION,
    websocket_subprotocol: webSocketTicketSubprotocol(ticket),
    ticket_expires_at_unix_ms: ticketExpiresAtUnixMs,
  });
}

async function handleWebSocket(request, env) {
  if (request.method !== "GET") {
    return methodNotAllowed("GET");
  }
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return problemResponse(426, "websocket_upgrade_required", "WebSocket upgrade required");
  }
  const protocols = offeredSubprotocols(request.headers.get("Sec-WebSocket-Protocol"));
  if (!protocols.includes(CONTROL_SUBPROTOCOL)) {
    return problemResponse(426, "websocket_subprotocol_required", "Control subprotocol required", {
      detail: `Offer ${CONTROL_SUBPROTOCOL} in Sec-WebSocket-Protocol.`,
    });
  }
  const offeredTicket = webSocketTicketFromSubprotocols(protocols);
  const hasTicketProtocol = protocols.some((protocol) =>
    protocol.startsWith(WEBSOCKET_TICKET_SUBPROTOCOL_PREFIX),
  );
  if (!hasTicketProtocol && !requestOriginAllowed(request, env.ALLOWED_ORIGINS)) {
    return problemResponse(403, "origin_not_allowed", "Origin not allowed", { retryable: false });
  }
  if (
    hasTicketProtocol &&
    (
      offeredTicket === null ||
      request.headers.get("Origin") !== "null" ||
      request.headers.has("Authorization") ||
      request.headers.has("Cookie")
    )
  ) {
    return problemResponse(401, "invalid_websocket_ticket", "Invalid WebSocket ticket", {
      retryable: false,
    });
  }
  const unavailable = friendsServiceUnavailable(env);
  if (unavailable) {
    return unavailable;
  }

  let authority;
  let ticketDigest = null;
  if (hasTicketProtocol) {
    const verified = await verifyWebSocketTicket(offeredTicket, env.AUTHORITY_SIGNING_KEY);
    if (!verified.ok) {
      return problemResponse(401, verified.code, "Invalid WebSocket ticket", { retryable: false });
    }
    authority = {
      sessionId: verified.claims.sessionId,
      endpointId: verified.claims.endpointId,
      audience: verified.claims.audience,
      participantId: verified.claims.participantId,
      authorityGeneration: verified.claims.authorityGeneration,
      expiresAtUnixMs: verified.claims.authorityExpiresAtUnixMs,
      origin: null,
    };
    ticketDigest = await sha256Hex(offeredTicket);
  } else {
    const resolved = await resolveFriendsAuthority(request, env);
    if (!resolved.ok) {
      const title = resolved.status === 401 ? "Invalid authority" : "Remote gameplay unavailable";
      return problemResponse(resolved.status, resolved.code, title, { retryable: false });
    }
    authority = resolved.authority;
  }
  const session = sessionStub(env, authority.sessionId);
  const forwardedHeaders = internalHeaders({
    Upgrade: "websocket",
    "Sec-WebSocket-Protocol": CONTROL_SUBPROTOCOL,
    "X-GP-Session-ID": authority.sessionId,
    "X-GP-Endpoint-ID": authority.endpointId,
    "X-GP-Projection-Audience": authority.audience,
    "X-GP-Authority-Generation": String(authority.authorityGeneration),
    "X-GP-Authority-Expires": String(authority.expiresAtUnixMs),
  });
  if (authority.participantId) {
    forwardedHeaders.set("X-GP-Participant-ID", authority.participantId);
  }
  if (authority.origin) {
    forwardedHeaders.set("X-GP-Authority-Origin", authority.origin);
  }
  if (ticketDigest !== null) {
    forwardedHeaders.set("X-GP-WebSocket-Ticket-Digest", ticketDigest);
  }

  return session.fetch("https://session.internal/internal/session/ws", {
    method: "GET",
    headers: forwardedHeaders,
  });
}

async function controlSession(request, env, action, endpointId = null) {
  const unavailable = friendsServiceUnavailable(env);
  if (unavailable) {
    return unavailable;
  }
  if (!requestOriginAllowed(request, env.ALLOWED_ORIGINS)) {
    return problemResponse(403, "origin_not_allowed", "Origin not allowed", { retryable: false });
  }
  const resolved = await resolveFriendsAuthority(request, env);
  if (!resolved.ok || resolved.authority?.audience !== "host") {
    return problemResponse(403, "host_authority_required", "Host authority required", {
      retryable: false,
    });
  }
  if (endpointId !== null && !SESSION_IDENTIFIER_PATTERN.test(endpointId)) {
    return problemResponse(400, "invalid_endpoint_context", "Invalid endpoint context", {
      retryable: false,
    });
  }

  const authority = resolved.authority;
  const body = { action };
  let pairingCode;
  if (action === "rotate_invitation") {
    pairingCode = randomSecret(12);
    body.invitation_digest = await sha256Hex(pairingCode);
    body.invitation_expires_at_unix_ms = Math.min(
      Date.now() + INVITATION_DURATION_MS,
      authority.expiresAtUnixMs,
    );
  }
  if (endpointId !== null) {
    body.endpoint_id = endpointId;
  }
  const stub = sessionStub(env, authority.sessionId);
  const response = await stub.fetch("https://session.internal/internal/session/control", {
    method: "POST",
    headers: internalAuthorityHeaders(authority),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    return safeInternalFailure(response, "session_control_failed", "Session control failed");
  }
  const result = await response.json();
  return jsonResponse(
    {
      protocol_version: PROTOCOL_VERSION,
      action,
      ...(pairingCode
        ? {
            pairing_code: pairingCode,
            pairing_expires_at_unix_ms: result.invitation_expires_at_unix_ms,
          }
        : {}),
      ...(typeof result.duplicate === "boolean" ? { duplicate: result.duplicate } : {}),
      ...(result.delete_at_unix_ms ? { delete_at_unix_ms: result.delete_at_unix_ms } : {}),
    },
    action === "end_session"
      ? { headers: { "Set-Cookie": clearAuthorityCookie() } }
      : undefined,
  );
}

function friendsServiceUnavailable(env) {
  if (env.EMERGENCY_DISABLED === "true") {
    return problemResponse(503, "service_emergency_disabled", "Remote friends MVP disabled");
  }
  if (env.ENVIRONMENT_PROFILE !== FRIENDS_MVP_PROFILE) {
    return problemResponse(503, "remote_profile_unavailable", "Remote friends MVP unavailable");
  }
  if (
    typeof env.AUTHORITY_SIGNING_KEY !== "string" ||
    env.AUTHORITY_SIGNING_KEY.length < 32
  ) {
    return problemResponse(503, "friends_auth_unconfigured", "Remote friends MVP unavailable");
  }
  if (!env.GAME_SESSIONS) {
    return problemResponse(503, "session_binding_unavailable", "Remote friends MVP unavailable");
  }
  return null;
}

async function consumeEdgeLimit(binding, key) {
  if (!binding || typeof binding.limit !== "function") {
    return {
      ok: false,
      response: problemResponse(
        503,
        "edge_rate_limit_unavailable",
        "Admission protection unavailable",
        { retryable: true },
      ),
    };
  }
  try {
    const result = await binding.limit({ key });
    if (!result || result.success !== true) {
      return {
        ok: false,
        response: problemResponse(429, "edge_rate_limited", "Too many requests", {
          retryable: true,
        }),
      };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      response: problemResponse(
        503,
        "edge_rate_limit_unavailable",
        "Admission protection unavailable",
        { retryable: true },
      ),
    };
  }
}

function sessionStub(env, sessionId) {
  return env.GAME_SESSIONS.get(env.GAME_SESSIONS.idFromName(sessionId));
}

function internalHeaders(initial = {}) {
  const headers = new Headers(initial);
  headers.set("X-GP-Internal-Route", "1");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return headers;
}

function internalAuthorityHeaders(authority, initial = {}) {
  const headers = internalHeaders(initial);
  headers.set("X-GP-Session-ID", authority.sessionId);
  headers.set("X-GP-Endpoint-ID", authority.endpointId);
  headers.set("X-GP-Projection-Audience", authority.audience);
  headers.set("X-GP-Authority-Generation", String(authority.authorityGeneration));
  headers.set("X-GP-Authority-Expires", String(authority.expiresAtUnixMs));
  if (authority.participantId) {
    headers.set("X-GP-Participant-ID", authority.participantId);
  }
  if (authority.origin) {
    headers.set("X-GP-Authority-Origin", authority.origin);
  }
  return headers;
}

function isCredentialedApiPath(pathname) {
  return (
    pathname === "/api/v1/sessions" ||
    pathname === "/api/v1/join" ||
    pathname === "/api/v1/websocket-tickets" ||
    pathname === "/api/v1/session/invitation" ||
    pathname === "/api/v1/session/end" ||
    /^\/api\/v1\/session\/endpoints\/[^/]+\/revoke$/u.test(pathname)
  );
}

function isPackagedStageCorsPath(pathname) {
  return pathname === "/api/v1/join" || pathname === "/api/v1/websocket-tickets";
}

function corsPreflight(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  const packagedStage = origin === "null" && isPackagedStageCorsPath(url.pathname);
  if (!packagedStage && !requestOriginAllowed(request, env.ALLOWED_ORIGINS)) {
    return problemResponse(403, "origin_not_allowed", "Origin not allowed", { retryable: false });
  }
  if (origin === null) {
    return problemResponse(400, "browser_origin_required", "Browser origin required");
  }
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin, {
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-GP-Session-ID",
      "Access-Control-Allow-Methods": "POST, PUT, DELETE, OPTIONS",
      "Access-Control-Max-Age": "600",
    }, !packagedStage),
  });
}

function withCors(response, request, env) {
  const origin = request.headers.get("Origin");
  const packagedStage = origin === "null" && isPackagedStageCorsPath(new URL(request.url).pathname);
  if (
    origin === null ||
    (!packagedStage && !requestOriginAllowed(request, env.ALLOWED_ORIGINS))
  ) {
    return response;
  }
  const headers = new Headers(response.headers);
  for (const [name, value] of corsHeaders(origin, {}, !packagedStage)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function corsHeaders(origin, additional = {}, allowCredentials = true) {
  return new Headers({
    "Access-Control-Allow-Origin": origin,
    ...(allowCredentials ? { "Access-Control-Allow-Credentials": "true" } : {}),
    Vary: "Origin",
    ...additional,
  });
}

async function readJsonObject(request) {
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    return {
      ok: false,
      response: problemResponse(413, "request_too_large", "Request body too large"),
    };
  }
  let text;
  try {
    text = await request.text();
  } catch {
    return { ok: false, response: problemResponse(400, "invalid_json", "Invalid JSON") };
  }
  if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BODY_BYTES) {
    return {
      ok: false,
      response: problemResponse(413, "request_too_large", "Request body too large"),
    };
  }
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Expected object");
    }
    return { ok: true, value };
  } catch {
    return { ok: false, response: problemResponse(400, "invalid_json", "Invalid JSON") };
  }
}

function validCreateSessionRequest(value) {
  return value.protocol_version === PROTOCOL_VERSION && validEndpoint(value.endpoint);
}

function validJoinRequest(value) {
  if (value.protocol_version !== PROTOCOL_VERSION || !validEndpoint(value.endpoint)) {
    return false;
  }
  if (value.kind === "stage") {
    return value.display_name === undefined || value.display_name === null;
  }
  return value.kind === "participant" && validDisplayName(value.display_name);
}

function isPackagedStageJoin(value, origin) {
  return value.kind === "stage" && value.endpoint.platform === "webos" && origin === "null";
}

function validEndpoint(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    FEATURE_IDENTIFIER_PATTERN.test(value.platform) &&
    Array.isArray(value.capabilities) &&
    value.capabilities.length <= 32 &&
    new Set(value.capabilities).size === value.capabilities.length &&
    value.capabilities.every((capability) => FEATURE_IDENTIFIER_PATTERN.test(capability))
  );
}

function validDisplayName(value) {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 80 &&
    !/[\u0000-\u001F\u007F-\u009F]/u.test(value)
  );
}

async function safeInternalFailure(response, fallbackCode, fallbackTitle) {
  try {
    const body = await response.json();
    if (
      typeof body.code === "string" &&
      typeof body.title === "string" &&
      Number.isInteger(body.status)
    ) {
      return problemResponse(response.status, body.code, body.title, {
        detail: typeof body.detail === "string" ? body.detail : undefined,
        retryable: false,
      });
    }
  } catch {
    // Never forward an untrusted internal body.
  }
  return problemResponse(503, fallbackCode, fallbackTitle, { retryable: true });
}

function randomIdentifier(prefix) {
  return `${prefix}_${randomSecret(16)}`;
}

function randomSecret(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}
