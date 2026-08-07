import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import {
  AUTHORITY_COOKIE_NAME,
  authorityCookie,
  issueAuthorityToken,
  resolveFriendsAuthority,
  sha256Hex,
  verifyAuthorityToken,
  verifyBootstrapProof,
} from "../src/friends-auth.js";

globalThis.crypto ??= webcrypto;

const signingKey = "synthetic-authority-signing-key-at-least-32-characters";

function claims(overrides = {}) {
  return {
    sessionId: "ses_0123456789abcdef",
    endpointId: "end_0123456789abcdef",
    audience: "participant",
    participantId: "par_0123456789abcdef",
    authorityGeneration: 2,
    expiresAtUnixMs: Date.now() + 60_000,
    origin: null,
    ...overrides,
  };
}

test("signed authority round-trips without exposing signing material", async () => {
  const token = await issueAuthorityToken(claims(), signingKey);
  assert.equal(token.includes(signingKey), false);
  assert.deepEqual(await verifyAuthorityToken(token, signingKey), {
    ok: true,
    authority: claims({ expiresAtUnixMs: (await verifyAuthorityToken(token, signingKey)).authority.expiresAtUnixMs }),
  });
});

test("tampered and expired authorities fail closed", async () => {
  const token = await issueAuthorityToken(claims(), signingKey);
  const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  assert.deepEqual(await verifyAuthorityToken(tampered, signingKey), {
    ok: false,
    code: "invalid_authority",
  });

  const expiredAt = Date.now() + 10;
  const expiring = await issueAuthorityToken(claims({ expiresAtUnixMs: expiredAt }), signingKey);
  assert.deepEqual(await verifyAuthorityToken(expiring, signingKey, expiredAt), {
    ok: false,
    code: "authority_expired",
  });
});

test("browser cookie authority is bound to the exact HTTPS origin", async () => {
  const origin = "https://host.example.test";
  const token = await issueAuthorityToken(
    claims({ audience: "host", participantId: null, authorityGeneration: 1, origin }),
    signingKey,
  );
  const cookie = authorityCookie(token, Date.now() + 60_000);
  assert.match(cookie, new RegExp(`^${AUTHORITY_COOKIE_NAME}=`));
  assert.match(cookie, /Secure/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);

  const accepted = await resolveFriendsAuthority(
    new Request("https://api.example.test/ws/v1", {
      headers: { Cookie: cookie.split(";")[0], Origin: origin },
    }),
    { ENVIRONMENT_PROFILE: "friends-mvp-development", AUTHORITY_SIGNING_KEY: signingKey },
  );
  assert.equal(accepted.ok, true);

  const rejected = await resolveFriendsAuthority(
    new Request("https://api.example.test/ws/v1", {
      headers: { Cookie: cookie.split(";")[0], Origin: "https://stage.example.test" },
    }),
    { ENVIRONMENT_PROFILE: "friends-mvp-development", AUTHORITY_SIGNING_KEY: signingKey },
  );
  assert.deepEqual(rejected, {
    ok: false,
    status: 403,
    code: "authority_origin_mismatch",
  });

  const bearerReplayWithoutOrigin = await resolveFriendsAuthority(
    new Request("https://api.example.test/ws/v1", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    { ENVIRONMENT_PROFILE: "friends-mvp-development", AUTHORITY_SIGNING_KEY: signingKey },
  );
  assert.deepEqual(bearerReplayWithoutOrigin, {
    ok: false,
    status: 403,
    code: "browser_origin_required",
  });
});

test("native bearer authority remains valid without an Origin", async () => {
  const token = await issueAuthorityToken(claims(), signingKey);
  const accepted = await resolveFriendsAuthority(
    new Request("https://api.example.test/ws/v1", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    { ENVIRONMENT_PROFILE: "friends-mvp-development", AUTHORITY_SIGNING_KEY: signingKey },
  );

  assert.equal(accepted.ok, true);
  assert.equal(accepted.authority.origin, null);
});

test("Host bootstrap compares the configured digest instead of storing raw proof", async () => {
  const proof = "synthetic-host-bootstrap-proof-for-tests";
  const digest = await sha256Hex(proof);
  const accepted = await verifyBootstrapProof(
    new Request("https://api.example.test/api/v1/sessions", {
      headers: { Authorization: `Bearer ${proof}` },
    }),
    digest,
  );
  assert.deepEqual(accepted, { ok: true });

  const rejected = await verifyBootstrapProof(
    new Request("https://api.example.test/api/v1/sessions", {
      headers: { Authorization: "Bearer definitely-not-the-proof-value" },
    }),
    digest,
  );
  assert.equal(rejected.ok, false);
  assert.equal(rejected.code, "invalid_bootstrap_proof");
});
