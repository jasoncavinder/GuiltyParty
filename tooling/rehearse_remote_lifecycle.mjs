#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

const baseUrl = requiredUrl("GP_REMOTE_BASE_URL");
const bootstrapProof = requiredValue("GP_HOST_BOOTSTRAP_PROOF");
const hostOrigin = process.env.GP_HOST_ORIGIN ?? "https://host.test.guiltyparty.app";
const hibernationIdleMs = 15_000;
const pollIntervalMs = 5_000;
const lifecycleRetentionMs = 30_000;
const responseDateToleranceMs = 5_000;

if (baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
  throw new Error("GP_REMOTE_BASE_URL must be an HTTP(S) origin without a path, query, or fragment");
}
if (new URL(hostOrigin).origin !== hostOrigin || !hostOrigin.startsWith("https://")) {
  throw new Error("GP_HOST_ORIGIN must be an exact HTTPS origin");
}

async function rehearseAuthorityAndHibernation() {
  const host = await createSession("/api/v1/sessions");
  let cleanupError = null;
  try {
    await expectJoinStatus(host, "deliberately-invalid-pairing-proof", 401, "participant");

    const rotated = await hostControl(host.cookie, "/api/v1/session/invitation", "PUT", 200);
    assert.equal(rotated.body.action, "rotate_invitation");
    await expectJoinStatus(host, host.pairingCode, 401, "participant");
    host.pairingCode = rotated.body.pairing_code;

    const stage = await pairStage(host);
    const closed = await hostControl(host.cookie, "/api/v1/session/invitation", "DELETE", 200);
    assert.equal(closed.body.action, "close_invitation");
    await expectJoinStatus(host, host.pairingCode, 401, "participant");

    const firstTicket = await mintTicket(stage.token);
    const firstConnection = await openWebSocket(firstTicket.websocket_subprotocol);
    assert.equal(firstConnection.status, 101);
    const before = await requestProjection(firstConnection.socket, host, stage);

    await delay(hibernationIdleMs);
    const after = await requestProjection(firstConnection.socket, host, stage);
    assert.equal(after.server_sequence, before.server_sequence);
    assert.deepEqual(after.payload.projection, before.payload.projection);
    firstConnection.socket.close();

    assert.equal((await openWebSocket(firstTicket.websocket_subprotocol)).status, 401);

    const tampered = await mintTicket(stage.token);
    tampered.websocket_subprotocol = tamperSignature(tampered.websocket_subprotocol);
    assert.equal((await openWebSocket(tampered.websocket_subprotocol)).status, 401);

    const reconnectTicket = await mintTicket(stage.token);
    const reconnected = await openWebSocket(reconnectTicket.websocket_subprotocol);
    assert.equal(reconnected.status, 101);
    const resumed = await requestProjection(reconnected.socket, host, stage);
    assert.equal(resumed.server_sequence, before.server_sequence);
    assert.deepEqual(resumed.payload.projection, before.payload.projection);
    reconnected.socket.close();

    const expiring = await mintTicket(stage.token);
    await delayUntil(expiring.ticket_expires_at_unix_ms + 1_000);
    assert.equal((await openWebSocket(expiring.websocket_subprotocol)).status, 401);

    const revoked = await mintTicket(stage.token);
    await hostControl(
      host.cookie,
      `/api/v1/session/endpoints/${encodeURIComponent(stage.endpoint_id)}/revoke`,
      "POST",
      200,
    );
    assert.equal((await openWebSocket(revoked.websocket_subprotocol)).status, 401);
  } catch (error) {
    cleanupError = error;
    throw error;
  } finally {
    try {
      await hostControl(host.cookie, "/api/v1/session/end", "POST", 200);
    } catch (error) {
      if (cleanupError === null) {
        throw error;
      }
      console.error("Session cleanup also failed after the lifecycle rehearsal error.");
    }
  }
}

async function rehearseExpiryAndDeletion() {
  const host = await createSession("/api/v1/rehearsals/lifecycle/sessions");
  assert.ok(host.pairingExpiresAtUnixMs < host.sessionExpiresAtUnixMs);

  await delayUntil(host.pairingExpiresAtUnixMs + 1_000);
  await expectJoinStatus(host, host.pairingCode, 401, "participant");

  await delayUntil(host.sessionExpiresAtUnixMs + 1_000);
  await expectJoinStatus(host, host.pairingCode, 410, "participant");

  await waitForDeletion(host, host.sessionExpiresAtUnixMs + 120_000);

  const endedHost = await createSession("/api/v1/rehearsals/lifecycle/sessions");
  const ended = await hostControl(endedHost.cookie, "/api/v1/session/end", "POST", 200);
  const responseDate = Date.parse(ended.headers.get("date") ?? "");
  assert.ok(Number.isFinite(responseDate), "session-end response must include a valid Date header");
  const observedRetentionMs = ended.body.delete_at_unix_ms - responseDate;
  assert.ok(
    Math.abs(observedRetentionMs - lifecycleRetentionMs) <= responseDateToleranceMs,
    `observed retention ${observedRetentionMs}ms must remain near the fixed ${lifecycleRetentionMs}ms window`,
  );
  await expectJoinStatus(endedHost, endedHost.pairingCode, 410, "participant");
  await waitForDeletion(endedHost, ended.body.delete_at_unix_ms + 90_000);
}

async function waitForDeletion(host, deletionDeadline) {
  while (Date.now() < deletionDeadline) {
    const response = await joinResponse(host, host.pairingCode, "participant");
    if (response.status === 404) {
      await response.body?.cancel();
      return;
    }
    if (response.status !== 410) {
      await response.body?.cancel();
      throw new Error(`deletion poll failed with HTTP ${response.status}`);
    }
    await response.body?.cancel();
    await delay(pollIntervalMs);
  }
  throw new Error("active-storage deletion was not observed before the rehearsal deadline");
}

async function createSession(pathname) {
  const response = await fetch(new URL(pathname, baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bootstrapProof}`,
      Origin: hostOrigin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      protocol_version: "1.0",
      endpoint: {
        platform: "browser",
        capabilities: ["host_control", "private_display"],
      },
    }),
  });
  await requireStatus(response, 201, "session creation");
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0] ?? null;
  assert.match(cookie, /^__Host-gp_authority=.+/u);
  const body = await response.json();
  return {
    cookie,
    sessionId: body.session_id,
    endpointId: body.endpoint_id,
    pairingCode: body.pairing_code,
    pairingExpiresAtUnixMs: body.pairing_expires_at_unix_ms,
    sessionExpiresAtUnixMs: body.session_expires_at_unix_ms,
  };
}

async function pairStage(host) {
  const created = await fetch(new URL("/api/v1/stage-pairings", baseUrl), {
    method: "POST",
    headers: { Origin: "null", "Content-Type": "application/json" },
    body: JSON.stringify({
      protocol_version: "1.0",
      endpoint: {
        platform: "webos",
        capabilities: ["public_display"],
        client_build: {
          application_id: "stage_webos",
          application_version: "0.1.0",
          build_number: 1,
        },
      },
    }),
  });
  await requireStatus(created, 201, "packaged Stage pairing creation");
  const pairing = await created.json();

  const codeAlone = await fetch(new URL(pairing.redeem_path, baseUrl), {
    method: "POST",
    headers: { Origin: "null" },
  });
  await requireStatus(codeAlone, 401, "Stage display-code-only rejection");
  await codeAlone.body?.cancel();

  const pending = await redeemStagePairing(pairing);
  await requireStatus(pending, 202, "pending Stage pairing poll");
  const pendingBody = await pending.json();
  assert.equal(pendingBody.status, "pending");
  assert.equal("session_id" in pendingBody, false);
  assert.equal("endpoint_id" in pendingBody, false);

  const approval = await fetch(
    new URL(`/api/v1/stage-pairings/${pairing.pairing_code}/approve`, baseUrl),
    {
      method: "POST",
      headers: { Cookie: host.cookie, Origin: hostOrigin },
    },
  );
  await requireStatus(approval, 200, "Host Stage pairing approval");
  await approval.body?.cancel();

  const redemption = await redeemStagePairing(pairing);
  await requireStatus(redemption, 200, "approved packaged Stage redemption");
  const stage = await redemption.json();
  assert.equal(stage.authority_transport, "bearer");
  assert.equal(stage.websocket_transport, "ticket_subprotocol");

  const retry = await redeemStagePairing(pairing);
  await requireStatus(retry, 200, "idempotent packaged Stage redemption");
  const retriedStage = await retry.json();
  assert.equal(retriedStage.endpoint_id, stage.endpoint_id);
  assert.equal(retriedStage.room_id, stage.room_id);
  return stage;
}

function redeemStagePairing(pairing) {
  return fetch(new URL(pairing.redeem_path, baseUrl), {
    method: "POST",
    headers: {
      Authorization: `StagePairing ${pairing.polling_secret}`,
      Origin: "null",
    },
  });
}

async function expectJoinStatus(host, pairingCode, expectedStatus, kind = "stage") {
  const response = await joinResponse(host, pairingCode, kind);
  await requireStatus(response, expectedStatus, `${kind} join rejection`);
  await response.body?.cancel();
}

function joinResponse(host, pairingCode, kind) {
  const participant = kind === "participant";
  return fetch(new URL("/api/v1/join", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Pairing ${pairingCode}`,
      "X-GP-Session-ID": host.sessionId,
      Origin: participant ? hostOrigin : "null",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      protocol_version: "1.0",
      kind,
      display_name: participant ? "Synthetic Lifecycle Guest" : null,
      endpoint: participant
        ? { platform: "browser", capabilities: ["private_display"] }
        : { platform: "webos", capabilities: ["public_display"] },
    }),
  });
}

async function hostControl(cookie, pathname, method, expectedStatus) {
  const response = await fetch(new URL(pathname, baseUrl), {
    method,
    headers: { Cookie: cookie, Origin: hostOrigin },
  });
  await requireStatus(response, expectedStatus, `${method} ${pathname}`);
  return { body: await response.json(), headers: response.headers };
}

async function mintTicket(token) {
  const response = await fetch(new URL("/api/v1/websocket-tickets", baseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Origin: "null" },
  });
  await requireStatus(response, 200, "connect-ticket issuance");
  return response.json();
}

async function requestProjection(socket, host, stage) {
  const messageId = identifier("msg");
  socket.sendJson({
    protocol_version: "1.0",
    type: "get_projection",
    message_id: messageId,
    session_id: host.sessionId,
    endpoint_id: stage.endpoint_id,
    payload: {},
  });
  return socket.nextJson(
    (message) => message.type === "projection" && message.correlation_id === messageId,
  );
}

function openWebSocket(ticketSubprotocol) {
  const secure = baseUrl.protocol === "https:";
  const port = Number(baseUrl.port || (secure ? 443 : 80));
  const key = randomBytes(16).toString("base64");
  return new Promise((resolve, reject) => {
    const options = { host: baseUrl.hostname, port };
    const socket = secure
      ? tls.connect({ ...options, servername: baseUrl.hostname })
      : net.createConnection(options);
    let response = Buffer.alloc(0);
    socket.setTimeout(10_000);
    socket.once(secure ? "secureConnect" : "connect", () => {
      socket.write([
        "GET /ws/v1 HTTP/1.1",
        `Host: ${baseUrl.host}`,
        "Connection: Upgrade",
        "Upgrade: websocket",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "Origin: null",
        `Sec-WebSocket-Protocol: guiltyparty.control.v1, ${ticketSubprotocol}`,
        "",
        "",
      ].join("\r\n"));
    });
    const onData = (chunk) => {
      response = Buffer.concat([response, chunk]);
      const boundary = response.indexOf("\r\n\r\n");
      if (boundary < 0) {
        return;
      }
      socket.off("data", onData);
      const head = response.subarray(0, boundary).toString("latin1");
      const status = Number(head.match(/^HTTP\/1\.1 (\d{3})/u)?.[1] ?? 0);
      if (status !== 101) {
        socket.destroy();
        resolve({ status, socket: null });
        return;
      }
      socket.setTimeout(0);
      const webSocket = new RawWebSocket(socket, response.subarray(boundary + 4));
      resolve({ status, socket: webSocket });
    };
    socket.on("data", onData);
    socket.on("timeout", () => socket.destroy(new Error("WebSocket operation timed out")));
    socket.on("error", reject);
  });
}

class RawWebSocket {
  constructor(socket, initialData) {
    this.socket = socket;
    this.buffer = initialData;
    this.messages = [];
    this.waiters = [];
    this.socket.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.parseFrames();
    });
    this.socket.on("error", (error) => this.rejectWaiters(error));
    this.socket.on("close", () => this.rejectWaiters(new Error("WebSocket closed")));
    this.parseFrames();
  }

  sendJson(value) {
    this.sendFrame(0x1, Buffer.from(JSON.stringify(value)));
  }

  close() {
    if (!this.socket.destroyed) {
      this.sendFrame(0x8, Buffer.from([0x03, 0xe8]));
      this.socket.end();
    }
  }

  nextJson(predicate, timeoutMs = 10_000) {
    const index = this.messages.findIndex(predicate);
    if (index >= 0) {
      return Promise.resolve(this.messages.splice(index, 1)[0]);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const waiterIndex = this.waiters.findIndex((entry) => entry.resolve === resolve);
        if (waiterIndex >= 0) {
          this.waiters.splice(waiterIndex, 1);
        }
        reject(new Error("Timed out waiting for WebSocket JSON"));
      }, timeoutMs);
      this.waiters.push({ predicate, resolve, reject, timer });
    });
  }

  sendFrame(opcode, payload) {
    const mask = randomBytes(4);
    let header;
    if (payload.length < 126) {
      header = Buffer.from([0x80 | opcode, 0x80 | payload.length]);
    } else if (payload.length <= 0xffff) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(payload.length, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(payload.length), 2);
    }
    const masked = Buffer.from(payload);
    for (let index = 0; index < masked.length; index += 1) {
      masked[index] ^= mask[index % 4];
    }
    this.socket.write(Buffer.concat([header, mask, masked]));
  }

  parseFrames() {
    while (this.buffer.length >= 2) {
      const opcode = this.buffer[0] & 0x0f;
      const masked = (this.buffer[1] & 0x80) !== 0;
      let length = this.buffer[1] & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        const wideLength = this.buffer.readBigUInt64BE(2);
        if (wideLength > BigInt(Number.MAX_SAFE_INTEGER)) {
          this.socket.destroy(new Error("WebSocket frame is too large"));
          return;
        }
        length = Number(wideLength);
        offset = 10;
      }
      const maskLength = masked ? 4 : 0;
      if (this.buffer.length < offset + maskLength + length) return;
      const mask = masked ? this.buffer.subarray(offset, offset + 4) : null;
      offset += maskLength;
      const payload = Buffer.from(this.buffer.subarray(offset, offset + length));
      this.buffer = this.buffer.subarray(offset + length);
      if (mask) {
        for (let index = 0; index < payload.length; index += 1) {
          payload[index] ^= mask[index % 4];
        }
      }
      if (opcode === 0x1) {
        this.receiveJson(payload.toString("utf8"));
      } else if (opcode === 0x8) {
        this.socket.end();
      } else if (opcode === 0x9) {
        this.sendFrame(0xA, payload);
      }
    }
  }

  receiveJson(text) {
    let message;
    try {
      message = JSON.parse(text);
    } catch {
      return;
    }
    const index = this.waiters.findIndex((entry) => entry.predicate(message));
    if (index >= 0) {
      const [waiter] = this.waiters.splice(index, 1);
      clearTimeout(waiter.timer);
      waiter.resolve(message);
      return;
    }
    this.messages.push(message);
  }

  rejectWaiters(error) {
    for (const waiter of this.waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }
}

function tamperSignature(subprotocol) {
  const signatureOffset = subprotocol.lastIndexOf(".") + 1;
  const current = subprotocol[signatureOffset];
  return `${subprotocol.slice(0, signatureOffset)}${current === "a" ? "b" : "a"}${subprotocol.slice(signatureOffset + 1)}`;
}

async function requireStatus(response, expected, operation) {
  if (response.status !== expected) {
    let code = "unknown";
    try {
      code = (await response.json()).code ?? code;
    } catch {
      await response.body?.cancel();
    }
    throw new Error(`${operation} failed with HTTP ${response.status} (${code})`);
  }
}

function identifier(prefix) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
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

await rehearseAuthorityAndHibernation();
await rehearseExpiryAndDeletion();

console.log(
  "Remote lifecycle rehearsal passed: invitation boundaries, ticket boundaries, " +
  "hibernation/reactivation, reconnect, end/expiry, and active-storage deletion.",
);
