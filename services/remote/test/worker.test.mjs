import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

import worker from "../src/gateway.js";
import {
  CONTROL_SUBPROTOCOL,
  INVITATION_DURATION_MS,
  LIFECYCLE_REHEARSAL_ACTIVE_DURATION_MS,
  LIFECYCLE_REHEARSAL_INVITATION_DURATION_MS,
  LIFECYCLE_REHEARSAL_RETENTION_MS,
  SESSION_ACTIVE_DURATION_MS,
  SESSION_RETENTION_MS,
  WEBSOCKET_TICKET_SUBPROTOCOL_PREFIX,
} from "../src/constants.js";
import { issueAuthorityToken, sha256Hex } from "../src/friends-auth.js";
import { decodeInvitationTransfer } from "../src/invitation-transfer.js";
import schema from "../../../contracts/control-plane/v1/control-plane.schema.json" with { type: "json" };
import openapi from "../../../contracts/http/v1/openapi.json" with { type: "json" };

globalThis.crypto ??= webcrypto;

const signingKey = "synthetic-authority-signing-key-at-least-32-characters";
const bootstrapProof = "synthetic-host-bootstrap-proof-for-tests";
const allowedOrigin = "https://host.example.test";

function binding(handler) {
  return {
    idFromName(name) {
      return name;
    },
    get(name) {
      return { fetch: (input, init) => handler(name, new Request(input, init)) };
    },
  };
}

function rateLimiter(success = true, consumedKeys = null) {
  return {
    async limit({ key }) {
      consumedKeys?.push(key);
      return { success };
    },
  };
}

async function friendsEnvironment(handler, pairingHandler = handler) {
  return {
    ENVIRONMENT_PROFILE: "friends-mvp-development",
    AUTHORITY_SIGNING_KEY: signingKey,
    HOST_BOOTSTRAP_TOKEN_SHA256: await sha256Hex(bootstrapProof),
    ALLOWED_ORIGINS: allowedOrigin,
    GAME_SESSIONS: binding(handler),
    STAGE_PAIRINGS: binding(pairingHandler),
    SESSION_CREATE_RATE_LIMITER: rateLimiter(),
    SESSION_JOIN_RATE_LIMITER: rateLimiter(),
    STAGE_PAIRING_RATE_LIMITER: rateLimiter(),
  };
}

test("health response is non-private, test-gated, and disables caching", async () => {
  const response = await worker.fetch(new Request("https://example.test/health"), {
    ENVIRONMENT_PROFILE: "friends-mvp-development",
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    service: "guilty-party-remote",
    status: "test-gated",
    profile: "friends-mvp-development",
  });
});

test("compatibility response conforms to the canonical v1 schema", async () => {
  const response = await worker.fetch(new Request("https://example.test/api/protocol"), {});
  const value = await response.json();
  const ajv = new Ajv2020({ strict: true, strictRequired: false });
  ajv.addSchema(schema);
  const validate = ajv.getSchema(`${schema.$id}#/$defs/CompatibilityResponse`);
  assert.ok(validate);
  assert.equal(validate(value), true, JSON.stringify(validate.errors));
});

test("OpenAPI declares the session admission failures returned at runtime", () => {
  const createResponses = openapi.paths["/api/v1/sessions"].post.responses;
  const joinResponses = openapi.paths["/api/v1/join"].post.responses;

  assert.ok(createResponses["413"]);
  assert.ok(createResponses["409"]);
  assert.ok(createResponses["429"]);
  for (const status of ["404", "409", "413", "429", "503"]) {
    assert.ok(joinResponses[status], `missing join response ${status}`);
  }
  assert.equal(joinResponses["500"], undefined);
  assert.ok(openapi.paths["/api/v1/websocket-tickets"].post.responses["200"]);
  assert.ok(openapi.paths["/api/v1/rehearsals/lifecycle/sessions"].post.responses["201"]);
  assert.ok(openapi.paths["/api/v1/stage-pairings"].post.responses["201"]);
  assert.ok(openapi.paths["/api/v1/stage-pairings/{pairing_code}/approve"].post.responses["200"]);
  assert.ok(openapi.paths["/api/v1/stage-pairings/{pairing_code}/redeem"].post.responses["202"]);
});

test("Host creates a bounded session and receives HttpOnly cookie authority", async () => {
  let captured;
  const env = await friendsEnvironment(async (name, request) => {
    captured = { name, path: new URL(request.url).pathname, body: await request.json() };
    return new Response(JSON.stringify({ created: true }), { status: 201 });
  });
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bootstrapProof}`,
        Origin: allowedOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        protocol_version: "1.0",
        gameplay_language: "en-US",
        endpoint: { platform: "browser", capabilities: ["host_control", "private_display"] },
      }),
    }),
    env,
  );

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), allowedOrigin);
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), "true");
  assert.match(response.headers.get("Set-Cookie"), /^__Host-gp_authority=/);
  assert.match(response.headers.get("Set-Cookie"), /HttpOnly/);
  const body = await response.json();
  const ajv = new Ajv2020({ strict: true, strictRequired: false });
  ajv.addSchema(schema);
  const validate = ajv.getSchema(`${schema.$id}#/$defs/CreateSessionResponse`);
  assert.equal(validate(body), true, JSON.stringify(validate.errors));
  assert.equal(captured.name, body.session_id);
  assert.equal(captured.path, "/internal/session/create");
  assert.equal(captured.body.host_origin, allowedOrigin);
  assert.equal(captured.body.gameplay_language, "en-US");
  assert.equal(captured.body.invitation_digest, await sha256Hex(body.pairing_code));
  assert.equal(JSON.stringify(captured).includes(body.pairing_code), false);
  assert.equal(
    captured.body.invitation_expires_at_unix_ms - captured.body.created_at_unix_ms,
    INVITATION_DURATION_MS,
  );
  assert.equal(
    captured.body.session_expires_at_unix_ms - captured.body.created_at_unix_ms,
    SESSION_ACTIVE_DURATION_MS,
  );
  assert.equal(
    captured.body.delete_at_unix_ms - captured.body.session_expires_at_unix_ms,
    SESSION_RETENTION_MS,
  );
  assert.deepEqual(decodeInvitationTransfer(body.invitation_payload), {
    version: "1",
    session_id: body.session_id,
    pairing_code: body.pairing_code,
    expires_at_unix_ms: body.pairing_expires_at_unix_ms,
    gameplay_language: "en-US",
  });
});

test("operator lifecycle rehearsal uses fixed short windows without changing normal defaults", async () => {
  let captured;
  const before = Date.now();
  const env = await friendsEnvironment(async (_name, request) => {
    captured = await request.json();
    return new Response(JSON.stringify({ created: true }), { status: 201 });
  });
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/rehearsals/lifecycle/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bootstrapProof}`,
        Origin: allowedOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        protocol_version: "1.0",
        endpoint: { platform: "browser", capabilities: ["host_control"] },
      }),
    }),
    env,
  );
  const after = Date.now();

  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.pairing_expires_at_unix_ms >= before + LIFECYCLE_REHEARSAL_INVITATION_DURATION_MS);
  assert.ok(body.pairing_expires_at_unix_ms <= after + LIFECYCLE_REHEARSAL_INVITATION_DURATION_MS);
  assert.ok(body.session_expires_at_unix_ms >= before + LIFECYCLE_REHEARSAL_ACTIVE_DURATION_MS);
  assert.ok(body.session_expires_at_unix_ms <= after + LIFECYCLE_REHEARSAL_ACTIVE_DURATION_MS);
  assert.equal(
    captured.delete_at_unix_ms - captured.session_expires_at_unix_ms,
    LIFECYCLE_REHEARSAL_RETENTION_MS,
  );
});

test("join hashes pairing proof before Durable Object admission and issues native bearer authority", async () => {
  let captured;
  const expiresAt = Date.now() + 60_000;
  const env = await friendsEnvironment(async (name, request) => {
    captured = { name, path: new URL(request.url).pathname, body: await request.json() };
    return Response.json({
      audience: "participant",
      endpoint_id: "end_0123456789abcdef",
      participant_id: "par_0123456789abcdef",
      room_id: "room_0123456789abcdef",
      authority_generation: 1,
      expires_at_unix_ms: expiresAt,
    });
  });
  const pairingProof = "synthetic-pairing-proof";
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/join", {
      method: "POST",
      headers: {
        Authorization: `Pairing ${pairingProof}`,
        "X-GP-Session-ID": "ses_0123456789abcdef",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        protocol_version: "1.0",
        kind: "participant",
        display_name: "Test Guest",
        endpoint: { platform: "ios", capabilities: ["private_display", "touch_input"] },
      }),
    }),
    env,
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.authority_transport, "bearer");
  assert.equal(body.websocket_transport, "authorization_header");
  assert.equal(body.participant_id, "par_0123456789abcdef");
  assert.ok(body.token.startsWith("gp1."));
  const ajv = new Ajv2020({ strict: true, strictRequired: false });
  ajv.addSchema(schema);
  const validate = ajv.getSchema(`${schema.$id}#/$defs/RemoteFriendsJoinResponse`);
  assert.equal(validate(body), true, JSON.stringify(validate.errors));
  assert.equal(captured.name, "ses_0123456789abcdef");
  assert.equal(captured.body.pairing_digest, await sha256Hex(pairingProof));
  assert.equal(JSON.stringify(captured).includes(pairingProof), false);
});

test("browser Stage join keeps authority out of the response body", async () => {
  const env = await friendsEnvironment(async () => Response.json({
    audience: "stage",
    endpoint_id: "end_0123456789abcdef",
    participant_id: null,
    room_id: "room_0123456789abcdef",
    authority_generation: 1,
    expires_at_unix_ms: Date.now() + 60_000,
  }));
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/join", {
      method: "POST",
      headers: {
        Authorization: "Pairing synthetic-pairing-proof",
        "X-GP-Session-ID": "ses_0123456789abcdef",
        Origin: allowedOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        protocol_version: "1.0",
        kind: "stage",
        endpoint: { platform: "webos", capabilities: ["public_display"] },
      }),
    }),
    env,
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Set-Cookie"), /^__Host-gp_authority=/);
  const body = await response.json();
  assert.equal(body.authority_transport, "cookie");
  assert.equal(body.websocket_transport, "cookie");
  assert.equal("token" in body, false);

  const ajv = new Ajv2020({ strict: true, strictRequired: false });
  ajv.addSchema(schema);
  const validate = ajv.getSchema(`${schema.$id}#/$defs/RemoteFriendsJoinResponse`);
  assert.equal(validate(body), true, JSON.stringify(validate.errors));
});

test("Host-approved packaged Stage pairing issues bearer authority and a WebSocket ticket", async () => {
  const expiresAt = Date.now() + 60_000;
  let ticketRegistration;
  let websocketForward;
  let stagePairingAdmission;
  let stagePairingAuthorization;
  let stagePairingAuthorizationAllowed = false;
  let pairing;
  const env = await friendsEnvironment(async (_name, request) => {
    const path = new URL(request.url).pathname;
    if (path === "/internal/session/authorize-stage-pairing") {
      stagePairingAuthorization = {
        endpointId: request.headers.get("X-GP-Endpoint-ID"),
        audience: request.headers.get("X-GP-Projection-Audience"),
        authorityGeneration: request.headers.get("X-GP-Authority-Generation"),
      };
      if (!stagePairingAuthorizationAllowed) {
        return Response.json({
          status: 401,
          code: "endpoint_revoked",
          title: "Invalid authority",
        }, { status: 401 });
      }
      return Response.json({ authorized: true });
    }
    if (path === "/internal/session/stage-pair") {
      stagePairingAdmission = await request.json();
      return Response.json({
        audience: "stage",
        endpoint_id: "end_0123456789abcdef",
        participant_id: null,
        room_id: "room_0123456789abcdef",
        authority_generation: 1,
        expires_at_unix_ms: expiresAt,
      });
    }
    if (path === "/internal/session/websocket-ticket") {
      ticketRegistration = {
        body: await request.json(),
        endpointId: request.headers.get("X-GP-Endpoint-ID"),
        authorityOrigin: request.headers.get("X-GP-Authority-Origin"),
      };
      return Response.json({ registered: true }, { status: 201 });
    }
    if (path === "/internal/session/ws") {
      websocketForward = {
        ticketDigest: request.headers.get("X-GP-WebSocket-Ticket-Digest"),
        endpointId: request.headers.get("X-GP-Endpoint-ID"),
        authorityOrigin: request.headers.get("X-GP-Authority-Origin"),
      };
      return Response.json({ forwarded: true });
    }
    return Response.json({}, { status: 404 });
  }, async (_name, request) => {
    const path = new URL(request.url).pathname;
    const value = await request.json();
    if (path === "/internal/stage-pairing/create") {
      pairing = { ...value, approved: false };
      return Response.json({ created: true }, { status: 201 });
    }
    if (path === "/internal/stage-pairing/approve") {
      pairing.approved = true;
      pairing.session_id = value.session_id;
      return Response.json({
        approved: true,
        duplicate: false,
        expires_at_unix_ms: pairing.expires_at_unix_ms,
      });
    }
    if (path === "/internal/stage-pairing/redeem") {
      if (value.polling_digest !== pairing.polling_digest) {
        return Response.json({
          status: 401,
          code: "invalid_stage_pairing_secret",
          title: "Invalid Stage pairing secret",
        }, { status: 401 });
      }
      if (!pairing.approved) {
        return Response.json({
          pending: true,
          expires_at_unix_ms: pairing.expires_at_unix_ms,
        }, { status: 202 });
      }
      return Response.json({
        pending: false,
        transaction_id: pairing.transaction_id,
        session_id: pairing.session_id,
        endpoint: pairing.endpoint,
        expires_at_unix_ms: pairing.expires_at_unix_ms,
      });
    }
    return Response.json({}, { status: 404 });
  });

  const directJoin = await worker.fetch(
    new Request("https://example.test/api/v1/join", {
      method: "POST",
      headers: {
        Authorization: "Pairing synthetic-pairing-proof",
        "X-GP-Session-ID": "ses_0123456789abcdef",
        Origin: "null",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        protocol_version: "1.0",
        kind: "stage",
        endpoint: { platform: "webos", capabilities: ["public_display"] },
      }),
    }),
    env,
  );
  assert.equal(directJoin.status, 409);
  assert.equal((await directJoin.json()).code, "stage_pairing_required");

  const create = await worker.fetch(
    new Request("https://example.test/api/v1/stage-pairings", {
      method: "POST",
      headers: { Origin: "null", "Content-Type": "application/json" },
      body: JSON.stringify({
        protocol_version: "1.0",
        endpoint: { platform: "webos", capabilities: ["public_display"] },
      }),
    }),
    env,
  );
  assert.equal(create.status, 201);
  assert.equal(create.headers.get("Access-Control-Allow-Origin"), "null");
  assert.equal(create.headers.get("Access-Control-Allow-Credentials"), null);
  const created = await create.json();
  const ajv = new Ajv2020({ strict: true, strictRequired: false });
  ajv.addSchema(schema);
  const validateCreate = ajv.getSchema(`${schema.$id}#/$defs/StagePairingCreateResponse`);
  assert.equal(validateCreate(created), true, JSON.stringify(validateCreate.errors));
  assert.match(created.pairing_code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/u);
  assert.ok(created.polling_secret.length >= 32);
  assert.equal("session_id" in created, false);
  assert.equal(JSON.stringify(pairing).includes(created.polling_secret), false);
  assert.equal(pairing.polling_digest, await sha256Hex(created.polling_secret));

  const codeAlone = await worker.fetch(
    new Request(`https://example.test${created.redeem_path}`, {
      method: "POST",
      headers: { Origin: "null" },
    }),
    env,
  );
  assert.equal(codeAlone.status, 401);
  assert.equal((await codeAlone.json()).code, "invalid_stage_pairing_secret");

  const wrongSecret = await worker.fetch(
    new Request(`https://example.test${created.redeem_path}`, {
      method: "POST",
      headers: { Origin: "null", Authorization: `StagePairing ${"x".repeat(32)}` },
    }),
    env,
  );
  assert.equal(wrongSecret.status, 401);
  assert.equal((await wrongSecret.json()).code, "invalid_stage_pairing_secret");
  assert.equal(stagePairingAdmission, undefined);

  const unauthorizedApproval = await worker.fetch(
    new Request(
      `https://example.test/api/v1/stage-pairings/${created.pairing_code}/approve`,
      { method: "POST", headers: { Origin: allowedOrigin } },
    ),
    env,
  );
  assert.equal(unauthorizedApproval.status, 403);
  assert.equal(pairing.approved, false);

  const pending = await worker.fetch(
    new Request(`https://example.test${created.redeem_path}`, {
      method: "POST",
      headers: { Origin: "null", Authorization: `StagePairing ${created.polling_secret}` },
    }),
    env,
  );
  assert.equal(pending.status, 202);
  const pendingBody = await pending.json();
  assert.equal(pendingBody.status, "pending");
  const validatePending = ajv.getSchema(`${schema.$id}#/$defs/StagePairingPendingResponse`);
  assert.equal(validatePending(pendingBody), true, JSON.stringify(validatePending.errors));

  const hostToken = await issueAuthorityToken({
    sessionId: "ses_0123456789abcdef",
    endpointId: "end_host0123456789",
    audience: "host",
    participantId: null,
    authorityGeneration: 1,
    expiresAtUnixMs: expiresAt,
    origin: allowedOrigin,
  }, signingKey);
  const revokedApproval = await worker.fetch(
    new Request(
      `https://example.test/api/v1/stage-pairings/${created.pairing_code}/approve`,
      {
        method: "POST",
        headers: { Origin: allowedOrigin, Cookie: `__Host-gp_authority=${hostToken}` },
      },
    ),
    env,
  );
  assert.equal(revokedApproval.status, 401);
  assert.equal((await revokedApproval.json()).code, "endpoint_revoked");
  assert.equal(pairing.approved, false);

  stagePairingAuthorizationAllowed = true;
  const approval = await worker.fetch(
    new Request(
      `https://example.test/api/v1/stage-pairings/${created.pairing_code}/approve`,
      {
        method: "POST",
        headers: { Origin: allowedOrigin, Cookie: `__Host-gp_authority=${hostToken}` },
      },
    ),
    env,
  );
  assert.equal(approval.status, 200);
  const approvalBody = await approval.json();
  assert.equal(approvalBody.status, "approved");
  assert.deepEqual(stagePairingAuthorization, {
    endpointId: "end_host0123456789",
    audience: "host",
    authorityGeneration: "1",
  });
  const validateApproval = ajv.getSchema(`${schema.$id}#/$defs/StagePairingApprovalResponse`);
  assert.equal(validateApproval(approvalBody), true, JSON.stringify(validateApproval.errors));

  const redemption = await worker.fetch(
    new Request(`https://example.test${created.redeem_path}`, {
      method: "POST",
      headers: { Origin: "null", Authorization: `StagePairing ${created.polling_secret}` },
    }),
    env,
  );
  assert.equal(redemption.status, 200);
  assert.equal(redemption.headers.get("Set-Cookie"), null);
  const admission = await redemption.json();
  assert.equal(admission.authority_transport, "bearer");
  assert.equal(admission.websocket_transport, "ticket_subprotocol");
  assert.equal(admission.websocket_ticket_endpoint, "/api/v1/websocket-tickets");
  assert.ok(admission.token.startsWith("gp1."));
  assert.equal(stagePairingAdmission.transaction_id, pairing.transaction_id);
  assert.deepEqual(stagePairingAdmission.endpoint, pairing.endpoint);

  const validateJoin = ajv.getSchema(`${schema.$id}#/$defs/RemoteFriendsJoinResponse`);
  assert.equal(validateJoin(admission), true, JSON.stringify(validateJoin.errors));

  const ticketResponse = await worker.fetch(
    new Request("https://example.test/api/v1/websocket-tickets", {
      method: "POST",
      headers: { Authorization: `Bearer ${admission.token}`, Origin: "null" },
    }),
    env,
  );
  assert.equal(ticketResponse.status, 200);
  assert.equal(ticketResponse.headers.get("Access-Control-Allow-Origin"), "null");
  assert.equal(ticketResponse.headers.get("Access-Control-Allow-Credentials"), null);
  const ticketBody = await ticketResponse.json();
  const validateTicket = ajv.getSchema(`${schema.$id}#/$defs/RealtimeConnectTicketResponse`);
  assert.equal(validateTicket(ticketBody), true, JSON.stringify(validateTicket.errors));
  assert.ok(ticketBody.websocket_subprotocol.startsWith(WEBSOCKET_TICKET_SUBPROTOCOL_PREFIX));
  assert.equal(ticketRegistration.endpointId, admission.endpoint_id);
  assert.equal(ticketRegistration.authorityOrigin, null);

  const signedTicket = ticketBody.websocket_subprotocol.slice(
    WEBSOCKET_TICKET_SUBPROTOCOL_PREFIX.length,
  );
  assert.equal(ticketRegistration.body.ticket_digest, await sha256Hex(signedTicket));
  assert.equal(JSON.stringify(ticketRegistration).includes(signedTicket), false);

  const forwarded = await worker.fetch(
    new Request("https://example.test/ws/v1", {
      headers: {
        Origin: "null",
        Upgrade: "websocket",
        "Sec-WebSocket-Protocol": `${CONTROL_SUBPROTOCOL}, ${ticketBody.websocket_subprotocol}`,
      },
    }),
    env,
  );
  assert.equal(forwarded.status, 200);
  assert.deepEqual(await forwarded.json(), { forwarded: true });
  assert.equal(websocketForward.endpointId, admission.endpoint_id);
  assert.equal(websocketForward.authorityOrigin, null);
  assert.equal(websocketForward.ticketDigest, await sha256Hex(signedTicket));
});

test("Stage pairing fails closed before allocating a coordinator", async () => {
  let called = false;
  const env = await friendsEnvironment(async () => Response.json({}), async () => {
    called = true;
    return Response.json({});
  });
  const request = () => new Request("https://example.test/api/v1/stage-pairings", {
    method: "POST",
    headers: { Origin: "null", "Content-Type": "application/json" },
    body: JSON.stringify({
      protocol_version: "1.0",
      endpoint: { platform: "webos", capabilities: ["public_display"] },
    }),
  });

  env.STAGE_PAIRING_RATE_LIMITER = rateLimiter(false);
  const limited = await worker.fetch(request(), env);
  assert.equal(limited.status, 429);
  assert.equal(called, false);

  env.STAGE_PAIRING_RATE_LIMITER = rateLimiter();
  delete env.STAGE_PAIRINGS;
  const unavailable = await worker.fetch(request(), env);
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).code, "stage_pairing_binding_unavailable");
  assert.equal(called, false);
});

test("websocket route requires the exact v1 subprotocol before authority", async () => {
  const request = new Request("https://example.test/ws/v1", {
    headers: { Upgrade: "websocket", "Sec-WebSocket-Protocol": "guiltyparty.control.v10" },
  });
  const response = await worker.fetch(request, { ENVIRONMENT_PROFILE: "friends-mvp-development" });
  assert.equal(response.status, 426);
  assert.equal((await response.json()).code, "websocket_subprotocol_required");

  const offered = new Request("https://example.test/ws/v1", {
    headers: { Upgrade: "websocket", "Sec-WebSocket-Protocol": CONTROL_SUBPROTOCOL },
  });
  const unauthorized = await worker.fetch(offered, {
    ENVIRONMENT_PROFILE: "friends-mvp-development",
  });
  assert.equal(unauthorized.status, 503);
  assert.equal((await unauthorized.json()).code, "friends_auth_unconfigured");
});

test("browser origins require an exact allowlist match", async () => {
  const request = new Request("https://example.test/ws/v1", {
    headers: {
      Origin: allowedOrigin,
      Upgrade: "websocket",
      "Sec-WebSocket-Protocol": CONTROL_SUBPROTOCOL,
    },
  });
  const rejected = await worker.fetch(request, {
    ENVIRONMENT_PROFILE: "friends-mvp-development",
    ALLOWED_ORIGINS: "https://different.example.test",
  });
  assert.equal(rejected.status, 403);
  assert.equal((await rejected.json()).code, "origin_not_allowed");
});

test("credentialed browser API preflight is exact-origin and narrowly scoped", async () => {
  const env = await friendsEnvironment(async () => Response.json({}));
  const accepted = await worker.fetch(
    new Request("https://example.test/api/v1/join", {
      method: "OPTIONS",
      headers: {
        Origin: allowedOrigin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type,x-gp-session-id",
      },
    }),
    env,
  );
  assert.equal(accepted.status, 204);
  assert.equal(accepted.headers.get("Access-Control-Allow-Origin"), allowedOrigin);
  assert.equal(accepted.headers.get("Access-Control-Allow-Credentials"), "true");
  assert.match(accepted.headers.get("Access-Control-Allow-Headers"), /X-GP-Session-ID/);

  const rejected = await worker.fetch(
    new Request("https://example.test/api/v1/join", {
      method: "OPTIONS",
      headers: { Origin: "https://untrusted.example.test" },
    }),
    env,
  );
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.get("Access-Control-Allow-Origin"), null);
});

test("session creation rejects missing bootstrap proof before allocating an object", async () => {
  let called = false;
  const consumedKeys = [];
  const env = await friendsEnvironment(async () => {
    called = true;
    return Response.json({});
  });
  env.SESSION_CREATE_RATE_LIMITER = rateLimiter(true, consumedKeys);
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/sessions", {
      method: "POST",
      headers: { Origin: allowedOrigin, "Content-Type": "application/json" },
      body: JSON.stringify({
        protocol_version: "1.0",
        endpoint: { platform: "browser", capabilities: [] },
      }),
    }),
    env,
  );
  assert.equal(response.status, 401);
  assert.equal(called, false);
  assert.deepEqual(consumedKeys, []);
});

test("invalid join traffic cannot consume a session-scoped Cloudflare budget", async () => {
  const consumedKeys = [];
  const env = await friendsEnvironment(async () => {
    assert.fail("invalid join traffic must not address a Durable Object");
  });
  env.SESSION_JOIN_RATE_LIMITER = rateLimiter(true, consumedKeys);
  const sessionId = "ses_0123456789abcdef";
  const validBody = JSON.stringify({
    protocol_version: "1.0",
    kind: "participant",
    display_name: "Synthetic Player",
    endpoint: { platform: "browser", capabilities: ["private_display"] },
  });
  const requests = [
    new Request("https://example.test/api/v1/join", { method: "POST" }),
    new Request("https://example.test/api/v1/join", {
      method: "POST",
      headers: { "X-GP-Session-ID": sessionId },
    }),
    new Request("https://example.test/api/v1/join", {
      method: "POST",
      headers: {
        Authorization: "Pairing synthetic-pairing-code",
        "X-GP-Session-ID": sessionId,
        Origin: allowedOrigin,
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
    new Request("https://example.test/api/v1/join", {
      method: "POST",
      headers: {
        Authorization: "Pairing synthetic-pairing-code",
        "X-GP-Session-ID": sessionId,
        Origin: "https://untrusted.example.test",
        "Content-Type": "application/json",
      },
      body: validBody,
    }),
  ];

  for (const request of requests) {
    const response = await worker.fetch(request, env);
    assert.ok(response.status >= 400 && response.status < 500);
  }
  assert.deepEqual(consumedKeys, []);
});

test("Cloudflare edge limits use validated actor and resource scopes before object lookup", async () => {
  let called = false;
  const createKeys = [];
  const joinKeys = [];
  const env = await friendsEnvironment(async () => {
    called = true;
    return Response.json({});
  });
  env.SESSION_CREATE_RATE_LIMITER = rateLimiter(false, createKeys);
  const create = await worker.fetch(
    new Request("https://example.test/api/v1/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bootstrapProof}`,
        Origin: allowedOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        protocol_version: "1.0",
        endpoint: { platform: "browser", capabilities: ["host_control"] },
      }),
    }),
    env,
  );
  assert.equal(create.status, 429);
  assert.equal((await create.json()).code, "edge_rate_limited");
  assert.deepEqual(createKeys, ["authenticated-host"]);
  assert.equal(called, false);

  env.SESSION_CREATE_RATE_LIMITER = rateLimiter();
  env.SESSION_JOIN_RATE_LIMITER = rateLimiter(false, joinKeys);
  const sessionId = "ses_0123456789abcdef";
  const join = await worker.fetch(
    new Request("https://example.test/api/v1/join", {
      method: "POST",
      headers: {
        Authorization: "Pairing synthetic-pairing-code",
        "X-GP-Session-ID": sessionId,
        Origin: allowedOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        protocol_version: "1.0",
        kind: "participant",
        display_name: "Synthetic Player",
        endpoint: { platform: "browser", capabilities: ["private_display"] },
      }),
    }),
    env,
  );
  assert.equal(join.status, 429);
  assert.equal((await join.json()).code, "edge_rate_limited");
  assert.deepEqual(joinKeys, [await sha256Hex(sessionId)]);
  assert.equal(called, false);
});

test("admission fails closed when the Cloudflare edge limiter is unavailable", async () => {
  const env = await friendsEnvironment(async () => Response.json({}));
  delete env.SESSION_JOIN_RATE_LIMITER;
  const sessionId = "ses_0123456789abcdef";
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/join", {
      method: "POST",
      headers: {
        Authorization: "Pairing synthetic-pairing-code",
        "X-GP-Session-ID": sessionId,
        Origin: allowedOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        protocol_version: "1.0",
        kind: "participant",
        display_name: "Synthetic Player",
        endpoint: { platform: "browser", capabilities: ["private_display"] },
      }),
    }),
    env,
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "edge_rate_limit_unavailable");
});

test("Host rotates pairing proof without exposing its digest", async () => {
  let captured;
  const env = await friendsEnvironment(async (name, request) => {
    captured = { name, body: await request.json() };
    return Response.json({
      ok: true,
      invitation_expires_at_unix_ms: captured.body.invitation_expires_at_unix_ms,
      gameplay_language: "en-US",
    });
  });
  const token = await issueAuthorityToken(
    {
      sessionId: "ses_0123456789abcdef",
      endpointId: "end_0123456789abcdef",
      audience: "host",
      participantId: null,
      authorityGeneration: 1,
      expiresAtUnixMs: Date.now() + 60_000,
      origin: allowedOrigin,
    },
    signingKey,
  );
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/session/invitation", {
      method: "PUT",
      headers: { Origin: allowedOrigin, Cookie: `__Host-gp_authority=${token}` },
    }),
    env,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.action, "rotate_invitation");
  assert.ok(body.pairing_code.length >= 12);
  assert.equal(decodeInvitationTransfer(body.invitation_payload).gameplay_language, "en-US");
  assert.equal(captured.name, "ses_0123456789abcdef");
  assert.equal(captured.body.invitation_digest, await sha256Hex(body.pairing_code));
  assert.equal(JSON.stringify(captured).includes(body.pairing_code), false);
});

test("configured client build policy rejects unsupported builds before allocation", async () => {
  let called = false;
  const env = await friendsEnvironment(async () => {
    called = true;
    return Response.json({});
  });
  env.CLIENT_BUILD_POLICY_JSON = JSON.stringify({
    host_web: { minimum_build_number: 10 },
  });
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bootstrapProof}`,
        Origin: allowedOrigin,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        protocol_version: "1.0",
        gameplay_language: "en",
        endpoint: {
          platform: "browser",
          capabilities: ["host_control"],
          client_build: {
            application_id: "host_web",
            application_version: "0.1.0",
            build_number: 9,
          },
        },
      }),
    }),
    env,
  );
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "client_build_unsupported");
  assert.equal(called, false);
});

test("participant authority cannot invoke Host session controls", async () => {
  let called = false;
  const env = await friendsEnvironment(async () => {
    called = true;
    return Response.json({});
  });
  const token = await issueAuthorityToken(
    {
      sessionId: "ses_0123456789abcdef",
      endpointId: "end_0123456789abcdef",
      audience: "participant",
      participantId: "par_0123456789abcdef",
      authorityGeneration: 1,
      expiresAtUnixMs: Date.now() + 60_000,
      origin: null,
    },
    signingKey,
  );
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/session/end", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
    env,
  );
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "host_authority_required");
  assert.equal(called, false);
});

test("ending a session clears browser Host authority immediately", async () => {
  const deleteAt = Date.now() + 60_000;
  const env = await friendsEnvironment(async () => Response.json({
    ok: true,
    delete_at_unix_ms: deleteAt,
  }));
  const token = await issueAuthorityToken(
    {
      sessionId: "ses_0123456789abcdef",
      endpointId: "end_0123456789abcdef",
      audience: "host",
      participantId: null,
      authorityGeneration: 1,
      expiresAtUnixMs: Date.now() + 60_000,
      origin: allowedOrigin,
    },
    signingKey,
  );
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/session/end", {
      method: "POST",
      headers: { Origin: allowedOrigin, Cookie: `__Host-gp_authority=${token}` },
    }),
    env,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("Set-Cookie"), /^__Host-gp_authority=;/);
  assert.match(response.headers.get("Set-Cookie"), /Max-Age=0/);
  assert.equal((await response.json()).delete_at_unix_ms, deleteAt);
});

test("emergency disable blocks stateful entry points but keeps health available", async () => {
  const health = await worker.fetch(new Request("https://example.test/health"), {
    ENVIRONMENT_PROFILE: "friends-mvp-development",
    EMERGENCY_DISABLED: "true",
  });
  assert.equal((await health.json()).status, "disabled");

  const response = await worker.fetch(
    new Request("https://example.test/api/v1/join", { method: "POST" }),
    { ENVIRONMENT_PROFILE: "friends-mvp-development", EMERGENCY_DISABLED: "true" },
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "service_emergency_disabled");
});
