import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

import worker from "../src/gateway.js";
import { CONTROL_SUBPROTOCOL } from "../src/constants.js";
import { issueAuthorityToken, sha256Hex } from "../src/friends-auth.js";
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

async function friendsEnvironment(handler) {
  return {
    ENVIRONMENT_PROFILE: "friends-mvp-development",
    AUTHORITY_SIGNING_KEY: signingKey,
    HOST_BOOTSTRAP_TOKEN_SHA256: await sha256Hex(bootstrapProof),
    ALLOWED_ORIGINS: allowedOrigin,
    GAME_SESSIONS: binding(handler),
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
  for (const status of ["404", "413", "429", "503"]) {
    assert.ok(joinResponses[status], `missing join response ${status}`);
  }
  assert.equal(joinResponses["500"], undefined);
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
  assert.equal(captured.body.invitation_digest, await sha256Hex(body.pairing_code));
  assert.equal(JSON.stringify(captured).includes(body.pairing_code), false);
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
  assert.equal("token" in body, false);

  const ajv = new Ajv2020({ strict: true, strictRequired: false });
  ajv.addSchema(schema);
  const validate = ajv.getSchema(`${schema.$id}#/$defs/RemoteFriendsJoinResponse`);
  assert.equal(validate(body), true, JSON.stringify(validate.errors));
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
  const env = await friendsEnvironment(async () => {
    called = true;
    return Response.json({});
  });
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
});

test("Host rotates pairing proof without exposing its digest", async () => {
  let captured;
  const env = await friendsEnvironment(async (name, request) => {
    captured = { name, body: await request.json() };
    return Response.json({
      ok: true,
      invitation_expires_at_unix_ms: captured.body.invitation_expires_at_unix_ms,
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
  assert.equal(captured.name, "ses_0123456789abcdef");
  assert.equal(captured.body.invitation_digest, await sha256Hex(body.pairing_code));
  assert.equal(JSON.stringify(captured).includes(body.pairing_code), false);
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
