#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const baseUrl = requiredUrl("GP_REMOTE_BASE_URL");
const expiryGraceMs = 2_000;
const expectedRateLimit = 120;
const maximumLiveAttempts = expectedRateLimit * 2;

if (baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
  throw new Error("GP_REMOTE_BASE_URL must be an HTTP(S) origin without a path, query, or fragment");
}

const pairing = await createStagePairing();
assert.ok(pairing.expires_at_unix_ms - Date.now() <= 120_000);
assert.ok(pairing.expires_at_unix_ms > Date.now());

const pending = await redeem(pairing.pairing_code, pairing.polling_secret);
await requireStatus(pending, 202, "pending Stage pairing poll");
const pendingBody = await pending.json();
assert.equal(pendingBody.status, "pending");
assert.equal("session_id" in pendingBody, false);
assert.equal("endpoint_id" in pendingBody, false);

await delayUntil(pairing.expires_at_unix_ms + expiryGraceMs);
assert.ok(Date.now() >= pairing.expires_at_unix_ms);
const expired = await redeem(pairing.pairing_code, pairing.polling_secret);
await requireStatusIn(expired, [404, 410], "expired Stage pairing redemption");
await expired.body?.cancel();

const unknownCode = randomPairingCode();
const unknownSecret = randomBytes(24).toString("base64url");
let limitedAt = null;
for (let attempt = 1; attempt <= maximumLiveAttempts; attempt += 1) {
  const response = await redeem(unknownCode, unknownSecret);
  if (response.status === 429) {
    limitedAt = attempt;
    await response.body?.cancel();
    break;
  }
  await requireStatus(response, 404, `unknown Stage pairing attempt ${attempt}`);
  await response.body?.cancel();
}
assert.notEqual(
  limitedAt,
  null,
  `Stage pairing edge limit must return 429 within ${maximumLiveAttempts} attempts`,
);

console.log(
  "Stage pairing boundary rehearsal passed: pending privacy, 120-second expiry, " +
  `unknown-code deallocation path, and live edge limit at attempt ${limitedAt}.`,
);

async function createStagePairing() {
  const response = await fetch(new URL("/api/v1/stage-pairings", baseUrl), {
    method: "POST",
    headers: { Origin: "null", "Content-Type": "application/json" },
    body: JSON.stringify({
      protocol_version: "1.0",
      endpoint: {
        platform: "webos",
        capabilities: ["public_display", "public_audio_output"],
        features: ["stage_presentation_media_v1"],
        client_build: {
          application_id: "stage_webos",
          application_version: "0.2.1",
          build_number: 4,
        },
      },
    }),
  });
  await requireStatus(response, 201, "Stage pairing creation");
  return response.json();
}

function redeem(pairingCode, pollingSecret) {
  return fetch(
    new URL(`/api/v1/stage-pairings/${encodeURIComponent(pairingCode)}/redeem`, baseUrl),
    {
      method: "POST",
      headers: {
        Authorization: `StagePairing ${pollingSecret}`,
        Origin: "null",
      },
    },
  );
}

async function requireStatus(response, expected, operation) {
  if (response.status === expected) {
    return;
  }
  let code = "unknown";
  try {
    code = (await response.json()).code ?? code;
  } catch {
    await response.body?.cancel();
  }
  throw new Error(`${operation} failed with HTTP ${response.status} (${code})`);
}

async function requireStatusIn(response, expected, operation) {
  if (expected.includes(response.status)) {
    return;
  }
  let code = "unknown";
  try {
    code = (await response.json()).code ?? code;
  } catch {
    await response.body?.cancel();
  }
  throw new Error(
    `${operation} failed with HTTP ${response.status} (${code}); expected ${expected.join(" or ")}`,
  );
}

function randomPairingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const characters = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `${characters.slice(0, 4).join("")}-${characters.slice(4).join("")}`;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function delayUntil(timestampUnixMs) {
  const remaining = timestampUnixMs - Date.now();
  if (remaining > 0) {
    await delay(remaining);
  }
}

function requiredValue(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required and must be supplied through the process environment`);
  }
  return value;
}

function requiredUrl(name) {
  const url = new URL(requiredValue(name));
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${name} must use HTTP or HTTPS`);
  }
  return url;
}
