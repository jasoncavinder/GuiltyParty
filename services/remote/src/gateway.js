import {
  COMPATIBILITY_RESPONSE,
  CONTROL_SUBPROTOCOL,
  FRIENDS_MVP_PROFILE,
  INVITATION_DURATION_MS,
  LIFECYCLE_REHEARSAL_ACTIVE_DURATION_MS,
  LIFECYCLE_REHEARSAL_INVITATION_DURATION_MS,
  LIFECYCLE_REHEARSAL_RETENTION_MS,
  MAX_REQUEST_BODY_BYTES,
  PROTOCOL_VERSION,
  SESSION_ACTIVE_DURATION_MS,
  SESSION_RETENTION_MS,
  STAGE_PAIRING_DURATION_MS,
  STAGE_PAIRING_POLL_AFTER_MS,
  WEBSOCKET_TICKET_DURATION_MS,
  WEBSOCKET_TICKET_SUBPROTOCOL_PREFIX,
} from "./constants.js";
import { evaluateClientBuild, validClientBuild } from "./client-build.js";
import {
  authorityCookie,
  clearAuthorityCookie,
  issueAuthorityToken,
  issueWebSocketTicket,
  offeredSubprotocols,
  requestOriginAllowed,
  resumeCredentialDigest,
  resolveFriendsAuthority,
  resolvePackagedStageAuthority,
  sha256Hex,
  verifyBootstrapProof,
  verifyWebSocketTicket,
  webSocketTicketFromSubprotocols,
  webSocketTicketSubprotocol,
} from "./friends-auth.js";
import { jsonResponse, methodNotAllowed, problemResponse } from "./http.js";
import { encodeInvitationTransfer } from "./invitation-transfer.js";

const SESSION_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const FEATURE_IDENTIFIER_PATTERN = /^[a-z][a-z0-9_.-]{0,127}$/;
const GAMEPLAY_LANGUAGE_PATTERN = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u;

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

    if (url.pathname === "/api/v1/rehearsals/lifecycle/sessions") {
      if (request.method !== "POST") {
        return withCors(methodNotAllowed("POST"), request, env);
      }
      return withCors(
        await createSession(request, env, { lifecycleRehearsal: true }),
        request,
        env,
      );
    }

    if (url.pathname === "/api/v1/join") {
      if (request.method !== "POST") {
        return withCors(methodNotAllowed("POST"), request, env);
      }
      return withCors(await joinSession(request, env), request, env);
    }

    if (url.pathname === "/api/v1/resume") {
      if (request.method !== "POST") {
        return methodNotAllowed("POST");
      }
      return resumeParticipant(request, env);
    }

    if (url.pathname === "/api/v1/stage-pairings") {
      if (request.method !== "POST") {
        return withCors(methodNotAllowed("POST"), request, env);
      }
      return withCors(await createStagePairing(request, env), request, env);
    }

    const stagePairingApproval = url.pathname.match(
      /^\/api\/v1\/stage-pairings\/([A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4})\/approve$/u,
    );
    if (stagePairingApproval) {
      if (request.method !== "POST") {
        return withCors(methodNotAllowed("POST"), request, env);
      }
      return withCors(
        await approveStagePairing(request, env, stagePairingApproval[1]),
        request,
        env,
      );
    }

    const stagePairingRedemption = url.pathname.match(
      /^\/api\/v1\/stage-pairings\/([A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4})\/redeem$/u,
    );
    if (stagePairingRedemption) {
      if (request.method !== "POST") {
        return withCors(methodNotAllowed("POST"), request, env);
      }
      return withCors(
        await redeemStagePairing(request, env, stagePairingRedemption[1]),
        request,
        env,
      );
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

    if (url.pathname === "/api/v1/session/context") {
      if (request.method !== "GET") {
        return withCors(methodNotAllowed("GET"), request, env);
      }
      return withCors(await getSessionContext(request, env), request, env);
    }

    if (url.pathname === "/api/v1/session/endpoints") {
      if (request.method !== "GET") {
        return withCors(methodNotAllowed("GET"), request, env);
      }
      return withCors(await listSessionEndpoints(request, env), request, env);
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

async function createSession(request, env, { lifecycleRehearsal = false } = {}) {
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
  const buildAdmission = clientBuildAdmission(parsed.value.endpoint.client_build, env);
  if (buildAdmission) {
    return buildAdmission;
  }
  const gameplayLanguage = parsed.value.gameplay_language ?? "en";

  const now = Date.now();
  const sessionId = randomIdentifier("ses");
  const endpointId = randomIdentifier("end");
  const roomId = randomIdentifier("room");
  const pairingCode = randomSecret(12);
  const invitationDuration = lifecycleRehearsal
    ? LIFECYCLE_REHEARSAL_INVITATION_DURATION_MS
    : INVITATION_DURATION_MS;
  const activeDuration = lifecycleRehearsal
    ? LIFECYCLE_REHEARSAL_ACTIVE_DURATION_MS
    : SESSION_ACTIVE_DURATION_MS;
  const retentionDuration = lifecycleRehearsal
    ? LIFECYCLE_REHEARSAL_RETENTION_MS
    : SESSION_RETENTION_MS;
  const invitationExpiresAt = now + invitationDuration;
  const sessionExpiresAt = now + activeDuration;
  const deleteAt = sessionExpiresAt + retentionDuration;

  const stub = sessionStub(env, sessionId);
  const internalResponse = await stub.fetch("https://session.internal/internal/session/create", {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify({
      session_id: sessionId,
      host_endpoint_id: endpointId,
      host_room_id: roomId,
      host_origin: origin,
      gameplay_language: gameplayLanguage,
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
      gameplay_language: gameplayLanguage,
      pairing_code: pairingCode,
      invitation_payload: encodeInvitationTransfer({
        sessionId,
        pairingCode,
        expiresAtUnixMs: invitationExpiresAt,
        gameplayLanguage,
      }),
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
  if (request.headers.get("Origin") === "null") {
    return problemResponse(409, "stage_pairing_required", "Host-approved Stage pairing required", {
      retryable: false,
    });
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
  const buildAdmission = clientBuildAdmission(parsed.value.endpoint.client_build, env);
  if (buildAdmission) {
    return buildAdmission;
  }
  const edgeLimit = await consumeEdgeLimit(
    env.SESSION_JOIN_RATE_LIMITER,
    await sha256Hex(sessionId),
  );
  if (!edgeLimit.ok) {
    return edgeLimit.response;
  }

  const authorityOrigin = browser ? requestOrigin : null;
  const nativeParticipant = !browser && parsed.value.kind === "participant";
  const resumeToken = nativeParticipant ? randomSecret(32) : null;
  const resumeCredentialFamilyId = nativeParticipant ? randomIdentifier("rsf") : null;
  const stub = sessionStub(env, sessionId);
  const internalResponse = await stub.fetch("https://session.internal/internal/session/join", {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify({
      pairing_digest: await sha256Hex(pairingCode),
      origin: authorityOrigin,
      join: parsed.value,
      now_unix_ms: Date.now(),
      ...(nativeParticipant
        ? {
            resume_credential_digest: await resumeCredentialDigest(
              resumeToken,
              env.AUTHORITY_SIGNING_KEY,
            ),
            resume_credential_family_id: resumeCredentialFamilyId,
          }
        : {}),
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
      ...(nativeParticipant
        ? {
            resume_token: resumeToken,
            resume_expires_at_unix_ms: admission.expires_at_unix_ms,
            server_sequence: admission.server_sequence,
          }
        : {}),
    },
    {
      status: 200,
      headers: browser
        ? { "Set-Cookie": authorityCookie(token, admission.expires_at_unix_ms) }
        : undefined,
    },
  );
}

async function resumeParticipant(request, env) {
  const unavailable = friendsServiceUnavailable(env);
  if (unavailable) {
    return unavailable;
  }
  if (request.headers.get("Origin") !== null || request.headers.has("Cookie")) {
    return problemResponse(403, "native_resume_required", "Native resume required", {
      retryable: false,
    });
  }
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Resume ")) {
    return problemResponse(401, "invalid_resume_credential", "Invalid resume credential", {
      retryable: false,
    });
  }
  const resumeToken = authorization.slice("Resume ".length);
  if (resumeToken.length < 32 || resumeToken.length > 128) {
    return problemResponse(401, "invalid_resume_credential", "Invalid resume credential", {
      retryable: false,
    });
  }

  const parsed = await readJsonObject(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  if (!validParticipantResumeRequest(parsed.value)) {
    return problemResponse(400, "invalid_resume_request", "Invalid resume request", {
      retryable: false,
    });
  }
  const buildAdmission = clientBuildAdmission(parsed.value.client_build, env);
  if (buildAdmission) {
    return buildAdmission;
  }
  const edgeLimit = await consumeEdgeLimit(
    env.SESSION_JOIN_RATE_LIMITER,
    `resume:${await sha256Hex(parsed.value.session_id)}`,
  );
  if (!edgeLimit.ok) {
    return edgeLimit.response;
  }

  const replacementResumeToken = request.headers.get("X-GP-Replacement-Resume") ?? "";
  if (
    replacementResumeToken.length < 32 ||
    replacementResumeToken.length > 128 ||
    replacementResumeToken === resumeToken
  ) {
    return problemResponse(400, "invalid_replacement_resume_credential", "Invalid replacement resume credential", {
      retryable: false,
    });
  }
  const response = await sessionStub(env, parsed.value.session_id).fetch(
    "https://session.internal/internal/session/resume",
    {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({
        credential_digest: await resumeCredentialDigest(
          resumeToken,
          env.AUTHORITY_SIGNING_KEY,
        ),
        replacement_credential_digest: await resumeCredentialDigest(
          replacementResumeToken,
          env.AUTHORITY_SIGNING_KEY,
        ),
        resume: parsed.value,
        now_unix_ms: Date.now(),
      }),
    },
  );
  if (!response.ok) {
    return safeInternalFailure(response, "resume_failed", "Unable to resume session");
  }
  const resumed = await response.json();
  const token = await issueAuthorityToken(
    {
      sessionId: parsed.value.session_id,
      endpointId: resumed.endpoint_id,
      audience: "participant",
      participantId: resumed.participant_id,
      authorityGeneration: resumed.authority_generation,
      expiresAtUnixMs: resumed.expires_at_unix_ms,
      origin: null,
    },
    env.AUTHORITY_SIGNING_KEY,
  );
  return jsonResponse({
    protocol_version: PROTOCOL_VERSION,
    token,
    resume_token: replacementResumeToken,
    session_id: parsed.value.session_id,
    endpoint_id: resumed.endpoint_id,
    room_id: resumed.room_id,
    participant_id: resumed.participant_id,
    authority_transport: "bearer",
    websocket_transport: "authorization_header",
    authority_expires_at_unix_ms: resumed.expires_at_unix_ms,
    resume_expires_at_unix_ms: resumed.resume_expires_at_unix_ms,
    primary_authority_generation: resumed.authority_generation,
    server_sequence: resumed.server_sequence,
    pending_command_results: resumed.pending_command_results,
  });
}

async function createStagePairing(request, env) {
  const unavailable = stagePairingServiceUnavailable(env);
  if (unavailable) {
    return unavailable;
  }
  if (
    request.headers.get("Origin") !== "null" ||
    request.headers.has("Cookie") ||
    request.headers.has("Authorization")
  ) {
    return problemResponse(403, "packaged_stage_transport_required", "Packaged Stage transport required", {
      retryable: false,
    });
  }
  const parsed = await readJsonObject(request);
  if (!parsed.ok) {
    return parsed.response;
  }
  if (!validStagePairingRequest(parsed.value)) {
    return problemResponse(400, "invalid_stage_pairing_request", "Invalid Stage pairing request", {
      retryable: false,
    });
  }
  const buildAdmission = clientBuildAdmission(parsed.value.endpoint.client_build, env);
  if (buildAdmission) {
    return buildAdmission;
  }
  const edgeLimit = await consumeEdgeLimit(env.STAGE_PAIRING_RATE_LIMITER, "create");
  if (!edgeLimit.ok) {
    return edgeLimit.response;
  }
  const now = Date.now();
  const expiresAtUnixMs = now + STAGE_PAIRING_DURATION_MS;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const pairingCode = randomStagePairingCode();
    const pollingSecret = randomSecret(24);
    const response = await stagePairingStub(env, pairingCode).fetch(
      "https://stage-pairing.internal/internal/stage-pairing/create",
      {
        method: "POST",
        headers: internalHeaders(),
        body: JSON.stringify({
          transaction_id: randomIdentifier("stp"),
          polling_digest: await sha256Hex(pollingSecret),
          endpoint: parsed.value.endpoint,
          created_at_unix_ms: now,
          expires_at_unix_ms: expiresAtUnixMs,
        }),
      },
    );
    if (response.status === 409) {
      continue;
    }
    if (!response.ok) {
      return safeInternalFailure(response, "stage_pairing_failed", "Stage pairing unavailable");
    }
    return jsonResponse(
      {
        protocol_version: PROTOCOL_VERSION,
        pairing_code: pairingCode,
        polling_secret: pollingSecret,
        redeem_path: `/api/v1/stage-pairings/${pairingCode}/redeem`,
        expires_at_unix_ms: expiresAtUnixMs,
        poll_after_ms: STAGE_PAIRING_POLL_AFTER_MS,
      },
      { status: 201 },
    );
  }
  return problemResponse(503, "stage_pairing_code_unavailable", "Stage pairing unavailable", {
    retryable: true,
  });
}

async function approveStagePairing(request, env, pairingCode) {
  const unavailable = stagePairingServiceUnavailable(env);
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
  const edgeLimit = await consumeEdgeLimit(
    env.STAGE_PAIRING_RATE_LIMITER,
    `approve:${await sha256Hex(resolved.authority.sessionId)}`,
  );
  if (!edgeLimit.ok) {
    return edgeLimit.response;
  }
  const authorityResponse = await sessionStub(env, resolved.authority.sessionId).fetch(
    "https://session.internal/internal/session/authorize-stage-pairing",
    {
      method: "POST",
      headers: internalAuthorityHeaders(resolved.authority),
    },
  );
  if (!authorityResponse.ok) {
    return safeInternalFailure(
      authorityResponse,
      "stage_pairing_approval_failed",
      "Stage pairing approval failed",
    );
  }
  const response = await stagePairingStub(env, pairingCode).fetch(
    "https://stage-pairing.internal/internal/stage-pairing/approve",
    {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({
        session_id: resolved.authority.sessionId,
        host_endpoint_id: resolved.authority.endpointId,
        now_unix_ms: Date.now(),
      }),
    },
  );
  if (!response.ok) {
    return safeInternalFailure(response, "stage_pairing_approval_failed", "Stage pairing approval failed");
  }
  const result = await response.json();
  return jsonResponse({
    protocol_version: PROTOCOL_VERSION,
    action: "approve_stage_pairing",
    pairing_code: pairingCode,
    status: "approved",
    duplicate: result.duplicate === true,
    expires_at_unix_ms: result.expires_at_unix_ms,
  });
}

async function redeemStagePairing(request, env, pairingCode) {
  const unavailable = stagePairingServiceUnavailable(env);
  if (unavailable) {
    return unavailable;
  }
  if (request.headers.get("Origin") !== "null" || request.headers.has("Cookie")) {
    return problemResponse(403, "packaged_stage_transport_required", "Packaged Stage transport required", {
      retryable: false,
    });
  }
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("StagePairing ")) {
    return problemResponse(401, "invalid_stage_pairing_secret", "Invalid Stage pairing secret", {
      retryable: false,
    });
  }
  const pollingSecret = authorization.slice("StagePairing ".length);
  if (pollingSecret.length < 32 || pollingSecret.length > 128) {
    return problemResponse(401, "invalid_stage_pairing_secret", "Invalid Stage pairing secret", {
      retryable: false,
    });
  }
  const edgeLimit = await consumeEdgeLimit(
    env.STAGE_PAIRING_RATE_LIMITER,
    `redeem:${await sha256Hex(pairingCode)}`,
  );
  if (!edgeLimit.ok) {
    return edgeLimit.response;
  }
  const response = await stagePairingStub(env, pairingCode).fetch(
    "https://stage-pairing.internal/internal/stage-pairing/redeem",
    {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({
        polling_digest: await sha256Hex(pollingSecret),
        now_unix_ms: Date.now(),
      }),
    },
  );
  if (response.status === 202) {
    const result = await response.json();
    return jsonResponse(
      {
        protocol_version: PROTOCOL_VERSION,
        status: "pending",
        expires_at_unix_ms: result.expires_at_unix_ms,
        retry_after_ms: STAGE_PAIRING_POLL_AFTER_MS,
      },
      { status: 202, headers: { "Retry-After": "2" } },
    );
  }
  if (!response.ok) {
    return safeInternalFailure(response, "stage_pairing_redemption_failed", "Stage pairing failed");
  }
  const approved = await response.json();
  const buildAdmission = clientBuildAdmission(approved.endpoint.client_build, env);
  if (buildAdmission) {
    return buildAdmission;
  }
  const admissionNow = Date.now();
  if (admissionNow >= approved.expires_at_unix_ms) {
    return problemResponse(410, "stage_pairing_expired", "Stage pairing expired", {
      retryable: false,
    });
  }
  const sessionResponse = await sessionStub(env, approved.session_id).fetch(
    "https://session.internal/internal/session/stage-pair",
    {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({
        transaction_id: approved.transaction_id,
        endpoint: approved.endpoint,
        now_unix_ms: admissionNow,
      }),
    },
  );
  if (!sessionResponse.ok) {
    return safeInternalFailure(sessionResponse, "stage_pairing_admission_failed", "Stage pairing failed");
  }
  const admission = await sessionResponse.json();
  const token = await issueAuthorityToken(
    {
      sessionId: approved.session_id,
      endpointId: admission.endpoint_id,
      audience: "stage",
      participantId: null,
      authorityGeneration: admission.authority_generation,
      expiresAtUnixMs: admission.expires_at_unix_ms,
      origin: null,
    },
    env.AUTHORITY_SIGNING_KEY,
  );
  return jsonResponse({
    protocol_version: PROTOCOL_VERSION,
    token,
    session_id: approved.session_id,
    endpoint_id: admission.endpoint_id,
    room_id: admission.room_id,
    participant_id: null,
    authority_transport: "bearer",
    websocket_transport: "ticket_subprotocol",
    websocket_ticket_endpoint: "/api/v1/websocket-tickets",
    authority_expires_at_unix_ms: admission.expires_at_unix_ms,
    primary_authority_generation: admission.authority_generation,
  });
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
            invitation_payload: encodeInvitationTransfer({
              sessionId: authority.sessionId,
              pairingCode,
              expiresAtUnixMs: result.invitation_expires_at_unix_ms,
              gameplayLanguage: result.gameplay_language,
            }),
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

async function listSessionEndpoints(request, env) {
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
  const response = await sessionStub(env, resolved.authority.sessionId).fetch(
    "https://session.internal/internal/session/endpoints",
    {
      method: "GET",
      headers: internalAuthorityHeaders(resolved.authority),
    },
  );
  if (!response.ok) {
    return safeInternalFailure(response, "endpoint_roster_failed", "Endpoint roster unavailable");
  }
  const result = await response.json();
  return jsonResponse({ protocol_version: PROTOCOL_VERSION, endpoints: result.endpoints });
}

async function getSessionContext(request, env) {
  const unavailable = friendsServiceUnavailable(env);
  if (unavailable) {
    return unavailable;
  }
  if (!requestOriginAllowed(request, env.ALLOWED_ORIGINS)) {
    return problemResponse(403, "origin_not_allowed", "Origin not allowed", { retryable: false });
  }
  const resolved = await resolveFriendsAuthority(request, env);
  if (!resolved.ok) {
    return problemResponse(resolved.status, resolved.code, "Valid session authority required", {
      retryable: false,
    });
  }
  const authority = resolved.authority;
  const response = await sessionStub(env, authority.sessionId).fetch(
    "https://session.internal/internal/session/authorize",
    {
      method: "POST",
      headers: internalAuthorityHeaders(authority),
    },
  );
  if (!response.ok) {
    return safeInternalFailure(response, "invalid_authority", "Valid session authority required");
  }
  await response.body?.cancel();
  return jsonResponse({
    protocol_version: PROTOCOL_VERSION,
    session_id: authority.sessionId,
    endpoint_id: authority.endpointId,
    audience: authority.audience,
    participant_id: authority.participantId,
    primary_authority_generation: authority.authorityGeneration,
    authority_expires_at_unix_ms: authority.expiresAtUnixMs,
  });
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

function stagePairingServiceUnavailable(env) {
  const unavailable = friendsServiceUnavailable(env);
  if (unavailable) {
    return unavailable;
  }
  if (!env.STAGE_PAIRINGS) {
    return problemResponse(503, "stage_pairing_binding_unavailable", "Stage pairing unavailable");
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

function stagePairingStub(env, pairingCode) {
  return env.STAGE_PAIRINGS.get(env.STAGE_PAIRINGS.idFromName(pairingCode));
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
    pathname === "/api/v1/rehearsals/lifecycle/sessions" ||
    pathname === "/api/v1/join" ||
    pathname === "/api/v1/stage-pairings" ||
    /^\/api\/v1\/stage-pairings\/[^/]+\/(approve|redeem)$/u.test(pathname) ||
    pathname === "/api/v1/websocket-tickets" ||
    pathname === "/api/v1/session/invitation" ||
    pathname === "/api/v1/session/context" ||
    pathname === "/api/v1/session/endpoints" ||
    pathname === "/api/v1/session/end" ||
    /^\/api\/v1\/session\/endpoints\/[^/]+\/revoke$/u.test(pathname)
  );
}

function isPackagedStageCorsPath(pathname) {
  return (
    pathname === "/api/v1/join" ||
    pathname === "/api/v1/websocket-tickets" ||
    pathname === "/api/v1/stage-pairings" ||
    /^\/api\/v1\/stage-pairings\/[^/]+\/redeem$/u.test(pathname)
  );
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
  return (
    value.protocol_version === PROTOCOL_VERSION &&
    (value.gameplay_language === undefined ||
      (typeof value.gameplay_language === "string" &&
        value.gameplay_language.length <= 63 &&
        GAMEPLAY_LANGUAGE_PATTERN.test(value.gameplay_language))) &&
    validEndpoint(value.endpoint)
  );
}

function validStagePairingRequest(value) {
  return (
    value &&
    value.protocol_version === PROTOCOL_VERSION &&
    validEndpoint(value.endpoint) &&
    value.endpoint.platform === "webos" &&
    value.endpoint.capabilities.includes("public_display")
  );
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

function validParticipantResumeRequest(value) {
  return (
    value &&
    value.protocol_version === PROTOCOL_VERSION &&
    SESSION_IDENTIFIER_PATTERN.test(value.session_id) &&
    SESSION_IDENTIFIER_PATTERN.test(value.endpoint_id) &&
    SESSION_IDENTIFIER_PATTERN.test(value.participant_id) &&
    Number.isSafeInteger(value.last_server_sequence) &&
    value.last_server_sequence >= 0 &&
    Number.isSafeInteger(value.primary_authority_generation) &&
    value.primary_authority_generation >= 1 &&
    Array.isArray(value.pending_idempotency_ids) &&
    value.pending_idempotency_ids.length <= 32 &&
    new Set(value.pending_idempotency_ids).size === value.pending_idempotency_ids.length &&
    value.pending_idempotency_ids.every((identifier) => SESSION_IDENTIFIER_PATTERN.test(identifier)) &&
    validClientBuild(value.client_build)
  );
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
    value.capabilities.every((capability) => FEATURE_IDENTIFIER_PATTERN.test(capability)) &&
    (value.client_build === undefined || validClientBuild(value.client_build))
  );
}

function clientBuildAdmission(clientBuild, env) {
  const result = evaluateClientBuild(clientBuild, env.CLIENT_BUILD_POLICY_JSON);
  if (result.ok) {
    return null;
  }
  return problemResponse(
    result.status,
    result.code,
    result.status === 409 ? "Client upgrade required" : "Client build policy unavailable",
    { retryable: result.status !== 409 },
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

function randomStagePairingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const characters = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `${characters.slice(0, 4).join("")}-${characters.slice(4).join("")}`;
}
