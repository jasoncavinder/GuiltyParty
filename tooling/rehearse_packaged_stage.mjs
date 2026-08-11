import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

const baseUrl = requiredUrl("GP_REMOTE_BASE_URL");
const bootstrapProof = requiredValue("GP_HOST_BOOTSTRAP_PROOF");
const hostOrigin = process.env.GP_HOST_ORIGIN ?? "https://host.test.guiltyparty.app";

if (baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
  throw new Error("GP_REMOTE_BASE_URL must be an HTTP(S) origin without a path, query, or fragment");
}
if (new URL(hostOrigin).origin !== hostOrigin || !hostOrigin.startsWith("https://")) {
  throw new Error("GP_HOST_ORIGIN must be an exact HTTPS origin");
}

const created = await fetch(new URL("/api/v1/sessions", baseUrl), {
  method: "POST",
  headers: {
    Authorization: `Bearer ${bootstrapProof}`,
    Origin: hostOrigin,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    protocol_version: "1.0",
    gameplay_language: "en",
    endpoint: {
      platform: "browser",
      capabilities: ["host_control", "private_display"],
      features: ["host_presentation_status_v1"],
      client_build: {
        application_id: "host_web",
        application_version: "0.2.0",
        build_number: 2,
      },
    },
  }),
});
await requireStatus(created, 201, "session creation");
const setCookie = created.headers.get("set-cookie");
const hostCookie = setCookie?.split(";", 1)[0] ?? null;
let rehearsalError = null;
try {
  assert.match(hostCookie, /^__Host-gp_authority=.+/u, "Host authority cookie is required");
  await created.body?.cancel();

  const pairingResponse = await fetch(new URL("/api/v1/stage-pairings", baseUrl), {
    method: "POST",
    headers: {
      Origin: "null",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      protocol_version: "1.0",
      endpoint: {
        platform: "webos",
        capabilities: ["public_display", "public_audio_output"],
        features: ["stage_presentation_media_v1"],
        client_build: {
          application_id: "stage_webos",
          application_version: "0.2.0",
          build_number: 3,
        },
      },
    }),
  });
  await requireStatus(pairingResponse, 201, "packaged Stage pairing creation");
  const pairing = await pairingResponse.json();
  assert.match(pairing.pairing_code, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/u);
  assert.ok(pairing.expires_at_unix_ms - Date.now() <= 120_000);

  const pending = await fetch(new URL(pairing.redeem_path, baseUrl), {
    method: "POST",
    headers: {
      Authorization: `StagePairing ${pairing.polling_secret}`,
      Origin: "null",
    },
  });
  await requireStatus(pending, 202, "pending Stage pairing poll");
  await pending.body?.cancel();

  const approved = await fetch(
    new URL(`/api/v1/stage-pairings/${pairing.pairing_code}/approve`, baseUrl),
    {
      method: "POST",
      headers: { Cookie: hostCookie, Origin: hostOrigin },
    },
  );
  await requireStatus(approved, 200, "Host Stage pairing approval");
  await approved.body?.cancel();

  const joined = await fetch(new URL(pairing.redeem_path, baseUrl), {
    method: "POST",
    headers: {
      Authorization: `StagePairing ${pairing.polling_secret}`,
      Origin: "null",
    },
  });
  await requireStatus(joined, 200, "approved packaged Stage redemption");
  assert.equal(joined.headers.get("set-cookie"), null, "packaged Stage must not receive a cookie");
  assert.equal(joined.headers.get("access-control-allow-origin"), "null");
  assert.equal(joined.headers.get("access-control-allow-credentials"), null);
  const stage = await joined.json();
  assert.equal(stage.authority_transport, "bearer");
  assert.equal(stage.websocket_transport, "ticket_subprotocol");

  const retriedRedemption = await fetch(new URL(pairing.redeem_path, baseUrl), {
    method: "POST",
    headers: {
      Authorization: `StagePairing ${pairing.polling_secret}`,
      Origin: "null",
    },
  });
  await requireStatus(retriedRedemption, 200, "idempotent Stage redemption retry");
  const retriedStage = await retriedRedemption.json();
  assert.equal(retriedStage.endpoint_id, stage.endpoint_id);
  assert.equal(retriedStage.room_id, stage.room_id);
  assert.equal(
    retriedStage.primary_authority_generation,
    stage.primary_authority_generation,
  );

  async function mintTicket() {
    const response = await fetch(new URL("/api/v1/websocket-tickets", baseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${stage.token}`, Origin: "null" },
    });
    await requireStatus(response, 200, "connect-ticket issuance");
    return response.json();
  }

  const ticket = await mintTicket();
  assert.equal(await upgrade(ticket.websocket_subprotocol), 101);
  assert.equal(await upgrade(ticket.websocket_subprotocol), 401);

  const tampered = await mintTicket();
  const prefixLength = tampered.websocket_subprotocol.lastIndexOf(".") + 1;
  const signature = tampered.websocket_subprotocol.slice(prefixLength);
  tampered.websocket_subprotocol = `${tampered.websocket_subprotocol.slice(0, prefixLength)}${
    signature[0] === "a" ? "b" : "a"
  }${signature.slice(1)}`;
  assert.equal(await upgrade(tampered.websocket_subprotocol), 401);

  console.log(
    "Packaged Stage rehearsal passed: Host approval 200, idempotent redemption, first upgrade 101, replay 401, tamper 401.",
  );
} catch (error) {
  rehearsalError = error;
  throw error;
} finally {
  if (hostCookie !== null) {
    try {
      await endSession(hostCookie);
    } catch (cleanupError) {
      if (rehearsalError === null) {
        throw cleanupError;
      }
      console.error("Session cleanup also failed after the rehearsal error.");
    }
  }
}

async function endSession(hostCookie) {
  const response = await fetch(new URL("/api/v1/session/end", baseUrl), {
    method: "POST",
    headers: { Cookie: hostCookie, Origin: hostOrigin },
  });
  await requireStatus(response, 200, "session cleanup");
  await response.body?.cancel();
  console.log("Session cleanup passed: end 200.");
}

async function upgrade(ticketSubprotocol) {
  const secure = baseUrl.protocol === "https:";
  const port = Number(baseUrl.port || (secure ? 443 : 80));
  const key = randomBytes(16).toString("base64");
  return new Promise((resolve, reject) => {
    const options = { host: baseUrl.hostname, port };
    const socket = secure
      ? tls.connect({ ...options, servername: baseUrl.hostname })
      : net.createConnection(options);
    let response = "";
    socket.setTimeout(10_000);
    socket.on(secure ? "secureConnect" : "connect", () => {
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
    socket.on("data", (chunk) => {
      response += chunk.toString("latin1");
      if (response.includes("\r\n\r\n")) {
        socket.destroy();
        resolve(Number(response.match(/^HTTP\/1\.1 (\d{3})/u)?.[1] ?? 0));
      }
    });
    socket.on("timeout", () => socket.destroy(new Error("WebSocket upgrade timed out")));
    socket.on("error", reject);
  });
}

async function requireStatus(response, expected, operation) {
  if (response.status !== expected) {
    await response.body?.cancel();
    throw new Error(`${operation} failed with HTTP ${response.status}`);
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
