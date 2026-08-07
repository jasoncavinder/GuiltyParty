import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import Ajv2020 from "ajv/dist/2020.js";

import worker from "../src/gateway.js";
import { CONTROL_SUBPROTOCOL } from "../src/constants.js";
import { resolveDevelopmentAuthority } from "../src/development-auth.js";
import schema from "../../../contracts/control-plane/v1/control-plane.schema.json" with { type: "json" };

globalThis.crypto ??= webcrypto;

test("health response is non-private and disables caching", async () => {
  const response = await worker.fetch(new Request("https://example.test/health"), {
    ENVIRONMENT_PROFILE: "development-skeleton",
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    service: "guilty-party-remote",
    status: "development-only",
    profile: "development-skeleton",
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

test("remote join remains explicitly unavailable", async () => {
  const response = await worker.fetch(
    new Request("https://example.test/api/v1/join", { method: "POST" }),
    {},
  );
  assert.equal(response.status, 501);
  assert.match(response.headers.get("Content-Type"), /^application\/problem\+json/);
  assert.equal((await response.json()).code, "production_join_unavailable");
});

test("websocket route requires the exact v1 subprotocol before authority", async () => {
  const request = new Request("https://example.test/ws/v1", {
    headers: { Upgrade: "websocket", "Sec-WebSocket-Protocol": "guiltyparty.control.v10" },
  });
  const response = await worker.fetch(request, { ENVIRONMENT_PROFILE: "development-skeleton" });
  assert.equal(response.status, 426);
  assert.equal((await response.json()).code, "websocket_subprotocol_required");

  const offered = new Request("https://example.test/ws/v1", {
    headers: { Upgrade: "websocket", "Sec-WebSocket-Protocol": CONTROL_SUBPROTOCOL },
  });
  const unauthorized = await worker.fetch(offered, {
    ENVIRONMENT_PROFILE: "development-skeleton",
  });
  assert.equal(unauthorized.status, 503);
  assert.equal((await unauthorized.json()).code, "development_auth_unconfigured");
});

test("browser websocket origins require an exact allowlist match", async () => {
  const request = new Request("https://example.test/ws/v1", {
    headers: {
      Origin: "https://host.example.test",
      Upgrade: "websocket",
      "Sec-WebSocket-Protocol": CONTROL_SUBPROTOCOL,
    },
  });
  const rejected = await worker.fetch(request, {
    ENVIRONMENT_PROFILE: "development-skeleton",
    ALLOWED_ORIGINS: "https://different.example.test",
  });
  assert.equal(rejected.status, 403);
  assert.equal((await rejected.json()).code, "origin_not_allowed");

  const acceptedOrigin = await worker.fetch(request, {
    ENVIRONMENT_PROFILE: "development-skeleton",
    ALLOWED_ORIGINS: "https://host.example.test",
  });
  assert.equal(acceptedOrigin.status, 503);
  assert.equal((await acceptedOrigin.json()).code, "development_auth_unconfigured");
});

test("synthetic development authority validates a token digest and bounded context", async () => {
  const token = "synthetic-token-for-local-tests";
  const digestBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const digest = Buffer.from(digestBytes).toString("hex");
  const request = new Request("https://example.test/ws/v1", {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-GP-Session-ID": "synthetic-session",
      "X-GP-Endpoint-ID": "host-endpoint",
      "X-GP-Projection-Audience": "host",
    },
  });

  const resolved = await resolveDevelopmentAuthority(request, {
    ENVIRONMENT_PROFILE: "development-skeleton",
    DEVELOPMENT_ACCESS_TOKEN_SHA256: digest,
  });
  assert.deepEqual(resolved, {
    ok: true,
    authority: {
      sessionId: "synthetic-session",
      endpointId: "host-endpoint",
      audience: "host",
    },
  });
});
