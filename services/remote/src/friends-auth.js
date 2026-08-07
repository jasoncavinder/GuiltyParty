import { FRIENDS_MVP_PROFILE } from "./constants.js";

export const AUTHORITY_COOKIE_NAME = "__Host-gp_authority";

const TOKEN_PREFIX = "gp1";
const TOKEN_MAXIMUM_LENGTH = 4096;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const AUDIENCES = new Set(["host", "stage", "participant"]);

export async function issueAuthorityToken(claims, signingKey) {
  validateSigningKey(signingKey);
  validateClaims(claims, { allowExpired: false });
  const encodedPayload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify({
      v: 1,
      sid: claims.sessionId,
      eid: claims.endpointId,
      aud: claims.audience,
      pid: claims.participantId ?? null,
      gen: claims.authorityGeneration,
      exp: claims.expiresAtUnixMs,
      org: claims.origin ?? null,
    })),
  );
  const signingInput = `${TOKEN_PREFIX}.${encodedPayload}`;
  const signature = await sign(signingInput, signingKey);
  return `${signingInput}.${encodeBase64Url(signature)}`;
}

export async function verifyAuthorityToken(token, signingKey, nowUnixMs = Date.now()) {
  try {
    validateSigningKey(signingKey);
    if (typeof token !== "string" || token.length < 32 || token.length > TOKEN_MAXIMUM_LENGTH) {
      return { ok: false, code: "invalid_authority" };
    }
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
      return { ok: false, code: "invalid_authority" };
    }
    const signingInput = `${parts[0]}.${parts[1]}`;
    const validSignature = await verify(signingInput, decodeBase64Url(parts[2]), signingKey);
    if (!validSignature) {
      return { ok: false, code: "invalid_authority" };
    }
    const raw = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
    const claims = {
      sessionId: raw.sid,
      endpointId: raw.eid,
      audience: raw.aud,
      participantId: raw.pid ?? null,
      authorityGeneration: raw.gen,
      expiresAtUnixMs: raw.exp,
      origin: raw.org ?? null,
    };
    if (raw.v !== 1) {
      return { ok: false, code: "invalid_authority" };
    }
    validateClaims(claims, { allowExpired: true });
    if (claims.expiresAtUnixMs <= nowUnixMs) {
      return { ok: false, code: "authority_expired" };
    }
    return { ok: true, authority: claims };
  } catch {
    return { ok: false, code: "invalid_authority" };
  }
}

export async function resolveFriendsAuthority(request, env, nowUnixMs = Date.now()) {
  if (env.ENVIRONMENT_PROFILE !== FRIENDS_MVP_PROFILE) {
    return { ok: false, status: 503, code: "remote_profile_unavailable" };
  }
  if (!validSigningKey(env.AUTHORITY_SIGNING_KEY)) {
    return { ok: false, status: 503, code: "friends_auth_unconfigured" };
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const bearerToken = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const cookieToken = readCookie(request.headers.get("Cookie"), AUTHORITY_COOKIE_NAME);
  const token = bearerToken ?? cookieToken;
  if (!token) {
    return { ok: false, status: 401, code: "invalid_authority" };
  }

  const verified = await verifyAuthorityToken(token, env.AUTHORITY_SIGNING_KEY, nowUnixMs);
  if (!verified.ok) {
    return { ok: false, status: 401, code: verified.code };
  }

  const requestOrigin = request.headers.get("Origin");
  const authorityOrigin = verified.authority.origin;
  if (authorityOrigin !== null) {
    if (requestOrigin === null) {
      return { ok: false, status: 403, code: "browser_origin_required" };
    }
    if (requestOrigin !== authorityOrigin) {
      return { ok: false, status: 403, code: "authority_origin_mismatch" };
    }
  } else if (requestOrigin !== null) {
    return { ok: false, status: 403, code: "authority_origin_mismatch" };
  } else if (cookieToken && !bearerToken) {
    return { ok: false, status: 403, code: "browser_origin_required" };
  }

  return verified;
}

export async function verifyBootstrapProof(request, expectedDigest) {
  if (typeof expectedDigest !== "string" || !/^[a-f0-9]{64}$/.test(expectedDigest)) {
    return { ok: false, status: 503, code: "host_bootstrap_unconfigured" };
  }
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) {
    return { ok: false, status: 401, code: "invalid_bootstrap_proof" };
  }
  const token = authorization.slice("Bearer ".length);
  if (token.length < 24 || token.length > TOKEN_MAXIMUM_LENGTH) {
    return { ok: false, status: 401, code: "invalid_bootstrap_proof" };
  }
  const digest = await sha256Hex(token);
  if (!constantTimeEqual(digest, expectedDigest)) {
    return { ok: false, status: 401, code: "invalid_bootstrap_proof" };
  }
  return { ok: true };
}

export function authorityCookie(token, expiresAtUnixMs) {
  const maximumAgeSeconds = Math.max(0, Math.floor((expiresAtUnixMs - Date.now()) / 1000));
  return [
    `${AUTHORITY_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${maximumAgeSeconds}`,
    "Secure",
    "HttpOnly",
    "SameSite=Strict",
  ].join("; ");
}

export function clearAuthorityCookie() {
  return `${AUTHORITY_COOKIE_NAME}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict`;
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

export function offeredSubprotocols(header) {
  if (!header) {
    return [];
  }
  return header.split(",").map((value) => value.trim()).filter(Boolean);
}

export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function validateClaims(claims, { allowExpired }) {
  if (
    !claims ||
    !IDENTIFIER_PATTERN.test(claims.sessionId) ||
    !IDENTIFIER_PATTERN.test(claims.endpointId) ||
    !AUDIENCES.has(claims.audience) ||
    !Number.isSafeInteger(claims.authorityGeneration) ||
    claims.authorityGeneration < 1 ||
    !Number.isSafeInteger(claims.expiresAtUnixMs) ||
    (!allowExpired && claims.expiresAtUnixMs <= Date.now()) ||
    (claims.participantId !== null && !IDENTIFIER_PATTERN.test(claims.participantId)) ||
    (claims.audience === "participant") !== (claims.participantId !== null) ||
    (claims.origin !== null && !validOrigin(claims.origin))
  ) {
    throw new Error("Invalid authority claims");
  }
}

function validOrigin(value) {
  try {
    const url = new URL(value);
    return url.origin === value && url.protocol === "https:";
  } catch {
    return false;
  }
}

function validSigningKey(value) {
  return typeof value === "string" && value.length >= 32 && value.length <= 4096;
}

function validateSigningKey(value) {
  if (!validSigningKey(value)) {
    throw new Error("Authority signing key is unavailable");
  }
}

async function hmacKey(signingKey, usage) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

async function sign(value, signingKey) {
  const key = await hmacKey(signingKey, "sign");
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function verify(value, signature, signingKey) {
  const key = await hmacKey(signingKey, "verify");
  return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(value));
}

function readCookie(header, name) {
  if (!header) {
    return null;
  }
  for (const pair of header.split(";")) {
    const separator = pair.indexOf("=");
    if (separator === -1) {
      continue;
    }
    if (pair.slice(0, separator).trim() === name) {
      return pair.slice(separator + 1).trim() || null;
    }
  }
  return null;
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error("Invalid base64url");
  }
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/") + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
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
