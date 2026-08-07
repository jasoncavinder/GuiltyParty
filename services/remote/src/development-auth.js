import { DEVELOPMENT_PROFILE } from "./constants.js";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const AUDIENCES = new Set(["host", "stage", "participant"]);

export async function resolveDevelopmentAuthority(request, env) {
  if (env.ENVIRONMENT_PROFILE !== DEVELOPMENT_PROFILE) {
    return { ok: false, status: 503, code: "remote_profile_unavailable" };
  }

  const expectedDigest = env.DEVELOPMENT_ACCESS_TOKEN_SHA256;
  if (!isSha256Hex(expectedDigest)) {
    return { ok: false, status: 503, code: "development_auth_unconfigured" };
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return { ok: false, status: 401, code: "invalid_authority" };
  }
  const token = authorization.slice("Bearer ".length);
  if (token.length < 16 || token.length > 4096) {
    return { ok: false, status: 401, code: "invalid_authority" };
  }

  const actualDigest = await sha256Hex(token);
  if (!constantTimeEqual(actualDigest, expectedDigest)) {
    return { ok: false, status: 401, code: "invalid_authority" };
  }

  const sessionId = request.headers.get("X-GP-Session-ID") ?? "";
  const endpointId = request.headers.get("X-GP-Endpoint-ID") ?? "";
  const audience = request.headers.get("X-GP-Projection-Audience") ?? "";
  if (
    !IDENTIFIER_PATTERN.test(sessionId) ||
    !IDENTIFIER_PATTERN.test(endpointId) ||
    !AUDIENCES.has(audience)
  ) {
    return { ok: false, status: 400, code: "invalid_development_context" };
  }

  return {
    ok: true,
    authority: { sessionId, endpointId, audience },
  };
}

export function offeredSubprotocols(header) {
  if (!header) {
    return [];
  }
  return header
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function requestOriginAllowed(request, allowedOriginsValue = "") {
  const origin = request.headers.get("Origin");
  if (origin === null) {
    return true;
  }
  const allowedOrigins = new Set(
    allowedOriginsValue
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return allowedOrigins.has(origin);
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function isSha256Hex(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
