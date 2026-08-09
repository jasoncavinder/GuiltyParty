import assert from "node:assert/strict";
import test from "node:test";

import { evaluateClientBuild } from "../src/client-build.js";
import {
  decodeInvitationTransfer,
  encodeInvitationTransfer,
} from "../src/invitation-transfer.js";

const transfer = {
  sessionId: "ses_0123456789abcdef",
  pairingCode: "synthetic-pairing-proof",
  expiresAtUnixMs: 2_000_000_000_000,
  gameplayLanguage: "fr-CA",
};

test("GP1 invitation transfer is deterministic, non-URL, and round-trips", () => {
  const first = encodeInvitationTransfer(transfer);
  assert.equal(first, encodeInvitationTransfer(transfer));
  assert.match(first, /^GP1\.[A-Za-z0-9_-]+$/u);
  assert.equal(first.includes("://"), false);
  assert.deepEqual(decodeInvitationTransfer(first), {
    version: "1",
    session_id: transfer.sessionId,
    pairing_code: transfer.pairingCode,
    expires_at_unix_ms: transfer.expiresAtUnixMs,
    gameplay_language: transfer.gameplayLanguage,
  });
});

test("GP1 decoder rejects malformed and semantically invalid payloads", () => {
  for (const payload of ["https://example.test/join", "GP1.***", "GP1.e30"]) {
    assert.throws(() => decodeInvitationTransfer(payload), TypeError);
  }
});

test("client build policy is optional until configured and bounded afterward", () => {
  const build = {
    application_id: "companion_ios",
    application_version: "0.1.0",
    build_number: 12,
  };
  assert.deepEqual(evaluateClientBuild(undefined, undefined), { ok: true });
  const policy = JSON.stringify({
    companion_ios: { minimum_build_number: 10, maximum_build_number: 20 },
  });
  assert.deepEqual(evaluateClientBuild(build, policy), { ok: true });
  assert.equal(evaluateClientBuild({ ...build, build_number: 9 }, policy).status, 409);
  assert.equal(evaluateClientBuild(build, "not-json").status, 503);
});

test("approved Android Companion build is admitted by the friends policy", () => {
  const policy = JSON.stringify({
    companion_android: { minimum_build_number: 1 },
  });
  assert.deepEqual(evaluateClientBuild({
    application_id: "companion_android",
    application_version: "0.1.0",
    build_number: 1,
  }, policy), { ok: true });
});
