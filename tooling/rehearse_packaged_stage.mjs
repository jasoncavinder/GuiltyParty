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
    endpoint: {
      platform: "browser",
      capabilities: ["host_control", "private_display"],
    },
  }),
});
await requireStatus(created, 201, "session creation");
const session = await created.json();

const joined = await fetch(new URL("/api/v1/join", baseUrl), {
  method: "POST",
  headers: {
    Authorization: `Pairing ${session.pairing_code}`,
    "X-GP-Session-ID": session.session_id,
    Origin: "null",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    protocol_version: "1.0",
    kind: "stage",
    endpoint: { platform: "webos", capabilities: ["public_display"] },
  }),
});
await requireStatus(joined, 200, "packaged Stage join");
assert.equal(joined.headers.get("set-cookie"), null, "packaged Stage must not receive a cookie");
assert.equal(joined.headers.get("access-control-allow-origin"), "null");
assert.equal(joined.headers.get("access-control-allow-credentials"), null);
const stage = await joined.json();
assert.equal(stage.authority_transport, "bearer");
assert.equal(stage.websocket_transport, "ticket_subprotocol");

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
  "Packaged Stage rehearsal passed: join 200, first upgrade 101, replay 401, tamper 401.",
);

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
