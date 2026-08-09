import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import test from "node:test";

import {
  AUTHORITY_COOKIE_NAME,
  authorityCookie,
  issueAuthorityToken,
  issueWebSocketTicket,
  resolveFriendsAuthority,
  resolvePackagedStageAuthority,
  resumeCredentialDigest,
  sha256Hex,
  verifyAuthorityToken,
  verifyBootstrapProof,
  verifyWebSocketTicket,
  webSocketTicketFromSubprotocols,
  webSocketTicketSubprotocol,
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

test("resume credentials use a keyed domain-separated digest", async () => {
  const credential = "synthetic-resume-credential-at-least-32-characters";
  const digest = await resumeCredentialDigest(credential, signingKey);
  const otherKeyDigest = await resumeCredentialDigest(
    credential,
    "other-synthetic-signing-key-at-least-32-characters",
  );
  const unrelatedSha256 = await sha256Hex(credential);

  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.notEqual(digest, otherKeyDigest);
  assert.notEqual(digest, unrelatedSha256);
  assert.equal(digest.includes(credential), false);
});

test("tampered and expired authorities fail closed", async () => {
  const token = await issueAuthorityToken(claims(), signingKey);
  const authorityParts = token.split(".");
  authorityParts[2] = `${authorityParts[2][0] === "a" ? "b" : "a"}${authorityParts[2].slice(1)}`;
  const tampered = authorityParts.join(".");
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

test("packaged Stage authority is accepted only through the null-origin bearer flow", async () => {
  const token = await issueAuthorityToken(
    claims({
      audience: "stage",
      participantId: null,
      authorityGeneration: 1,
    }),
    signingKey,
  );
  const env = {
    ENVIRONMENT_PROFILE: "friends-mvp-development",
    AUTHORITY_SIGNING_KEY: signingKey,
  };
  const accepted = await resolvePackagedStageAuthority(
    new Request("https://api.example.test/api/v1/websocket-tickets", {
      headers: { Authorization: `Bearer ${token}`, Origin: "null" },
    }),
    env,
  );
  assert.equal(accepted.ok, true);

  const missingOrigin = await resolvePackagedStageAuthority(
    new Request("https://api.example.test/api/v1/websocket-tickets", {
      headers: { Authorization: `Bearer ${token}` },
    }),
    env,
  );
  assert.equal(missingOrigin.ok, false);
  assert.equal(missingOrigin.code, "packaged_stage_transport_required");

  const participant = await issueAuthorityToken(claims(), signingKey);
  const wrongAudience = await resolvePackagedStageAuthority(
    new Request("https://api.example.test/api/v1/websocket-tickets", {
      headers: { Authorization: `Bearer ${participant}`, Origin: "null" },
    }),
    env,
  );
  assert.equal(wrongAudience.ok, false);
  assert.equal(wrongAudience.code, "packaged_stage_authority_required");
});

test("WebSocket tickets are separately signed, short-lived subprotocol credentials", async () => {
  const now = Date.now();
  const ticket = await issueWebSocketTicket(
    {
      ticketId: "wst_0123456789abcdef",
      sessionId: "ses_0123456789abcdef",
      endpointId: "end_0123456789abcdef",
      audience: "stage",
      participantId: null,
      authorityGeneration: 1,
      authorityExpiresAtUnixMs: now + 60_000,
      ticketExpiresAtUnixMs: now + 30_000,
    },
    signingKey,
  );
  assert.ok(ticket.startsWith("gpt1."));
  assert.equal(ticket.includes(signingKey), false);
  const subprotocol = webSocketTicketSubprotocol(ticket);
  assert.equal(
    webSocketTicketFromSubprotocols(["guiltyparty.control.v1", subprotocol]),
    ticket,
  );
  assert.equal((await verifyWebSocketTicket(ticket, signingKey, now)).ok, true);
  assert.deepEqual(await verifyWebSocketTicket(ticket, signingKey, now + 30_000), {
    ok: false,
    code: "websocket_ticket_expired",
  });

  const ticketParts = ticket.split(".");
  ticketParts[2] = `${ticketParts[2][0] === "a" ? "b" : "a"}${ticketParts[2].slice(1)}`;
  const tampered = ticketParts.join(".");
  assert.deepEqual(await verifyWebSocketTicket(tampered, signingKey, now), {
    ok: false,
    code: "invalid_websocket_ticket",
  });
  assert.equal(webSocketTicketFromSubprotocols([subprotocol, subprotocol]), null);
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
