import { DurableObject } from "cloudflare:workers";

import { CONTROL_SUBPROTOCOL, PROTOCOL_VERSION } from "./constants.js";
import { offeredSubprotocols } from "./development-auth.js";
import { SqliteSessionStore } from "./sqlite-session-store.js";

const INTERNAL_PATH = "/internal/session/ws";

export class GameSession extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.store = new SqliteSessionStore(this.ctx.storage);
    this.ready = this.ctx.blockConcurrencyWhile(async () => {
      this.store.initializeSchema();
    });
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);
    if (url.pathname !== INTERNAL_PATH || request.headers.get("X-GP-Internal-Route") !== "1") {
      return new Response("Not found", { status: 404 });
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    if (!offeredSubprotocols(request.headers.get("Sec-WebSocket-Protocol")).includes(CONTROL_SUBPROTOCOL)) {
      return new Response("Required WebSocket subprotocol was not offered", { status: 426 });
    }

    const endpointId = request.headers.get("X-GP-Endpoint-ID");
    const audience = request.headers.get("X-GP-Projection-Audience");
    const sessionId = request.headers.get("X-GP-Session-ID");
    if (!endpointId || !audience || !sessionId) {
      return new Response("Missing internal authority context", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [CONTROL_SUBPROTOCOL]);
    server.serializeAttachment({
      protocolMajor: 1,
      endpointId,
      audience,
      sessionId,
      connectionId: crypto.randomUUID(),
    });
    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: { "Sec-WebSocket-Protocol": CONTROL_SUBPROTOCOL },
    });
  }

  async webSocketMessage(socket, message) {
    const attachment = socket.deserializeAttachment();
    if (!validAttachment(attachment)) {
      socket.close(1011, "Connection context unavailable");
      return;
    }
    if (typeof message !== "string") {
      socket.close(1003, "Binary messages are not supported");
      return;
    }
    let envelope;
    try {
      envelope = JSON.parse(message);
    } catch {
      socket.close(1007, "Invalid JSON");
      return;
    }

    const correlationId = validMessageId(envelope?.message_id)
      ? envelope.message_id
      : undefined;
    socket.send(
      JSON.stringify({
        protocol_version: PROTOCOL_VERSION,
        type: "error",
        message_id: crypto.randomUUID(),
        ...(correlationId ? { correlation_id: correlationId } : {}),
        session_id: attachment.sessionId,
        endpoint_id: attachment.endpointId,
        payload: {
          code: "remote_engine_unavailable",
          title: "Remote gameplay is not enabled",
          detail: "The development skeleton has no approved shared engine or production authority.",
          retryable: false,
        },
      }),
    );
  }

  async webSocketClose(socket, code, reason) {
    socket.close(code, reason);
  }

  async webSocketError(socket) {
    socket.close(1011, "WebSocket failure");
  }
}

function validMessageId(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= 128;
}

function validAttachment(value) {
  return (
    value &&
    value.protocolMajor === 1 &&
    validMessageId(value.endpointId) &&
    validMessageId(value.sessionId) &&
    ["host", "stage", "participant"].includes(value.audience)
  );
}
