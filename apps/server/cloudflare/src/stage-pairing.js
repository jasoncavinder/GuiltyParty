import { DurableObject } from "cloudflare:workers";

import { validClientBuild } from "./client-build.js";
import { supportedProtocolVersion } from "./constants.js";
import { StagePairingStore } from "./stage-pairing-store.js";

const INTERNAL_PREFIX = "/internal/stage-pairing/";
const MAX_REDEMPTION_ATTEMPTS = 120;
const IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{16,128}$/u;
const FEATURE_IDENTIFIER_PATTERN = /^[a-z][a-z0-9_.-]{0,127}$/u;

export class StagePairing extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.store = new StagePairingStore(this.ctx.storage);
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(INTERNAL_PREFIX) || request.headers.get("X-GP-Internal-Route") !== "1") {
      return internalProblem(404, "not_found", "Not found");
    }
    if (url.pathname === `${INTERNAL_PREFIX}create`) {
      return this.create(request);
    }
    if (url.pathname === `${INTERNAL_PREFIX}approve`) {
      return this.approve(request);
    }
    if (url.pathname === `${INTERNAL_PREFIX}redeem`) {
      return this.redeem(request);
    }
    return internalProblem(404, "not_found", "Not found");
  }

  async create(request) {
    if (request.method !== "POST") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const value = await safeJson(request);
    if (!validCreate(value)) {
      return internalProblem(400, "invalid_stage_pairing", "Invalid Stage pairing");
    }
    const result = this.ctx.storage.transactionSync(() => {
      this.store.initializeSchema();
      const current = this.store.current();
      if (current && Number(current.expires_at_unix_ms) > value.created_at_unix_ms) {
        return { ok: false, status: 409, code: "stage_pairing_code_collision", title: "Stage pairing unavailable" };
      }
      this.ctx.storage.sql.exec("DELETE FROM stage_pairing");
      this.ctx.storage.sql.exec(
        `INSERT INTO stage_pairing (
           singleton, protocol_version, transaction_id, polling_digest, endpoint_json,
           created_at_unix_ms, expires_at_unix_ms
         ) VALUES (1, ?, ?, ?, ?, ?, ?)`,
        value.protocol_version,
        value.transaction_id,
        value.polling_digest,
        JSON.stringify(value.endpoint),
        value.created_at_unix_ms,
        value.expires_at_unix_ms,
      );
      return { ok: true };
    });
    if (!result.ok) {
      return internalProblem(result.status, result.code, result.title);
    }
    await this.ctx.storage.setAlarm(value.expires_at_unix_ms);
    return internalJson({ created: true }, 201);
  }

  async approve(request) {
    if (request.method !== "POST") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const value = await safeJson(request);
    if (!validApproval(value)) {
      return internalProblem(400, "invalid_stage_pairing_approval", "Invalid Stage pairing approval");
    }
    const result = this.ctx.storage.transactionSync(() => {
      const current = this.store.current();
      if (!current) {
        return { ok: false, status: 404, code: "stage_pairing_not_found", title: "Stage pairing not found" };
      }
      if (value.now_unix_ms >= Number(current.expires_at_unix_ms)) {
        this.ctx.storage.sql.exec("DELETE FROM stage_pairing");
        return { ok: false, status: 410, code: "stage_pairing_expired", title: "Stage pairing expired" };
      }
      if (current.approved_session_id !== null) {
        const duplicate =
          current.approved_session_id === value.session_id &&
          current.approved_host_endpoint_id === value.host_endpoint_id;
        return duplicate
          ? { ok: true, duplicate: true, expiresAtUnixMs: Number(current.expires_at_unix_ms) }
          : { ok: false, status: 409, code: "stage_pairing_already_approved", title: "Stage pairing already approved" };
      }
      this.ctx.storage.sql.exec(
        `UPDATE stage_pairing
         SET approved_session_id = ?, approved_host_endpoint_id = ?, approved_at_unix_ms = ?
         WHERE singleton = 1`,
        value.session_id,
        value.host_endpoint_id,
        value.now_unix_ms,
      );
      return { ok: true, duplicate: false, expiresAtUnixMs: Number(current.expires_at_unix_ms) };
    });
    return result.ok
      ? internalJson({
          approved: true,
          duplicate: result.duplicate,
          expires_at_unix_ms: result.expiresAtUnixMs,
        })
      : internalProblem(result.status, result.code, result.title);
  }

  async redeem(request) {
    if (request.method !== "POST") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const value = await safeJson(request);
    if (!validRedemption(value)) {
      return internalProblem(400, "invalid_stage_pairing_redemption", "Invalid Stage pairing redemption");
    }
    const result = this.ctx.storage.transactionSync(() => {
      const current = this.store.current();
      if (!current) {
        return { ok: false, status: 404, code: "stage_pairing_not_found", title: "Stage pairing not found" };
      }
      if (value.now_unix_ms >= Number(current.expires_at_unix_ms)) {
        this.ctx.storage.sql.exec("DELETE FROM stage_pairing");
        return { ok: false, status: 410, code: "stage_pairing_expired", title: "Stage pairing expired" };
      }
      const attempts = Number(current.attempt_count) + 1;
      this.ctx.storage.sql.exec(
        "UPDATE stage_pairing SET attempt_count = ? WHERE singleton = 1",
        attempts,
      );
      if (attempts > MAX_REDEMPTION_ATTEMPTS) {
        return { ok: false, status: 429, code: "stage_pairing_rate_limited", title: "Too many Stage pairing attempts" };
      }
      if (!constantTimeEqual(current.polling_digest, value.polling_digest)) {
        return { ok: false, status: 401, code: "invalid_stage_pairing_secret", title: "Invalid Stage pairing secret" };
      }
      if (current.approved_session_id === null) {
        return {
          ok: true,
          pending: true,
          protocolVersion: current.protocol_version,
          expiresAtUnixMs: Number(current.expires_at_unix_ms),
        };
      }
      return {
        ok: true,
        pending: false,
        protocolVersion: current.protocol_version,
        transactionId: current.transaction_id,
        sessionId: current.approved_session_id,
        endpoint: JSON.parse(current.endpoint_json),
        expiresAtUnixMs: Number(current.expires_at_unix_ms),
      };
    });
    if (!result.ok) {
      return internalProblem(result.status, result.code, result.title);
    }
    if (result.pending) {
      return internalJson({
        pending: true,
        protocol_version: result.protocolVersion,
        expires_at_unix_ms: result.expiresAtUnixMs,
      }, 202);
    }
    return internalJson({
      pending: false,
      protocol_version: result.protocolVersion,
      transaction_id: result.transactionId,
      session_id: result.sessionId,
      endpoint: result.endpoint,
      expires_at_unix_ms: result.expiresAtUnixMs,
    });
  }

  async alarm() {
    await this.store.deleteAll();
  }
}

function validCreate(value) {
  return (
    value &&
    supportedProtocolVersion(value.protocol_version) &&
    IDENTIFIER_PATTERN.test(value.transaction_id) &&
    /^[a-f0-9]{64}$/u.test(value.polling_digest) &&
    value.endpoint &&
    typeof value.endpoint === "object" &&
    value.endpoint.platform === "webos" &&
    Array.isArray(value.endpoint.capabilities) &&
    value.endpoint.capabilities.length <= 32 &&
    new Set(value.endpoint.capabilities).size === value.endpoint.capabilities.length &&
    value.endpoint.capabilities.every((item) => FEATURE_IDENTIFIER_PATTERN.test(item)) &&
    (value.endpoint.features === undefined ||
      (Array.isArray(value.endpoint.features) &&
        value.endpoint.features.length <= 32 &&
        new Set(value.endpoint.features).size === value.endpoint.features.length &&
        value.endpoint.features.every((item) => FEATURE_IDENTIFIER_PATTERN.test(item)))) &&
    (value.endpoint.client_build === undefined || validClientBuild(value.endpoint.client_build)) &&
    Number.isSafeInteger(value.created_at_unix_ms) &&
    Number.isSafeInteger(value.expires_at_unix_ms) &&
    value.created_at_unix_ms > 0 &&
    value.expires_at_unix_ms > value.created_at_unix_ms
  );
}

function validApproval(value) {
  return (
    value &&
    IDENTIFIER_PATTERN.test(value.session_id) &&
    IDENTIFIER_PATTERN.test(value.host_endpoint_id) &&
    Number.isSafeInteger(value.now_unix_ms) &&
    value.now_unix_ms > 0
  );
}

function validRedemption(value) {
  return (
    value &&
    /^[a-f0-9]{64}$/u.test(value.polling_digest) &&
    Number.isSafeInteger(value.now_unix_ms) &&
    value.now_unix_ms > 0
  );
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function safeJson(request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function internalJson(value, status = 200) {
  return Response.json(value, { status });
}

function internalProblem(status, code, title) {
  return Response.json({ status, code, title }, { status });
}
