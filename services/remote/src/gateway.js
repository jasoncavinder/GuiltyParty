import {
  COMPATIBILITY_RESPONSE,
  CONTROL_SUBPROTOCOL,
  DEVELOPMENT_PROFILE,
} from "./constants.js";
import {
  offeredSubprotocols,
  requestOriginAllowed,
  resolveDevelopmentAuthority,
} from "./development-auth.js";
import { jsonResponse, methodNotAllowed, problemResponse } from "./http.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }
      return jsonResponse({
        service: "guilty-party-remote",
        status: "development-only",
        profile: env.ENVIRONMENT_PROFILE ?? "unconfigured",
      });
    }

    if (url.pathname === "/api/protocol") {
      if (request.method !== "GET") {
        return methodNotAllowed("GET");
      }
      return jsonResponse(COMPATIBILITY_RESPONSE);
    }

    if (url.pathname === "/api/v1/join") {
      if (request.method !== "POST") {
        return methodNotAllowed("POST");
      }
      return problemResponse(501, "production_join_unavailable", "Remote join is not enabled", {
        detail: "The synthetic LAN join flow is not a production identity system.",
        retryable: false,
      });
    }

    if (url.pathname === "/ws/v1") {
      return handleWebSocket(request, env);
    }

    return problemResponse(404, "not_found", "Endpoint not found");
  },
};

async function handleWebSocket(request, env) {
  if (request.method !== "GET") {
    return methodNotAllowed("GET");
  }
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return problemResponse(426, "websocket_upgrade_required", "WebSocket upgrade required");
  }
  if (!offeredSubprotocols(request.headers.get("Sec-WebSocket-Protocol")).includes(CONTROL_SUBPROTOCOL)) {
    return problemResponse(426, "websocket_subprotocol_required", "Control subprotocol required", {
      detail: `Offer ${CONTROL_SUBPROTOCOL} in Sec-WebSocket-Protocol.`,
    });
  }
  if (!requestOriginAllowed(request, env.ALLOWED_ORIGINS)) {
    return problemResponse(403, "origin_not_allowed", "Origin not allowed", {
      retryable: false,
    });
  }

  const resolved = await resolveDevelopmentAuthority(request, env);
  if (!resolved.ok) {
    const title = resolved.status === 401 ? "Invalid authority" : "Remote gameplay unavailable";
    return problemResponse(resolved.status, resolved.code, title, { retryable: false });
  }
  if (env.ENVIRONMENT_PROFILE !== DEVELOPMENT_PROFILE || !env.GAME_SESSIONS) {
    return problemResponse(503, "session_binding_unavailable", "Session service unavailable");
  }

  const authority = resolved.authority;
  const id = env.GAME_SESSIONS.idFromName(authority.sessionId);
  const session = env.GAME_SESSIONS.get(id);
  const forwardedHeaders = new Headers();
  forwardedHeaders.set("Upgrade", "websocket");
  forwardedHeaders.set("Sec-WebSocket-Protocol", CONTROL_SUBPROTOCOL);
  forwardedHeaders.set("X-GP-Internal-Route", "1");
  forwardedHeaders.set("X-GP-Session-ID", authority.sessionId);
  forwardedHeaders.set("X-GP-Endpoint-ID", authority.endpointId);
  forwardedHeaders.set("X-GP-Projection-Audience", authority.audience);

  return session.fetch("https://session.internal/internal/session/ws", {
    method: "GET",
    headers: forwardedHeaders,
  });
}
