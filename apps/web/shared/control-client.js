export const PROTOCOL_VERSION = "1.0";
export const PARTICIPANT_PROTOCOL_VERSION = "1.1";
export const CONTROL_SUBPROTOCOL = "guiltyparty.control.v1";
export const DEFAULT_API_ORIGIN = "https://api.test.guiltyparty.app";

export const HOST_BUILD = Object.freeze({
  application_id: "host_web",
  application_version: "0.2.0",
  build_number: 2,
});

export const HOST_PRESENTATION_STATUS_FEATURE = "host_presentation_status_v1";
export const PARTICIPANT_VOTING_FEATURE = "participant_vote_targets_v1";

export const COMPANION_BUILD = Object.freeze({
  application_id: "companion_web",
  application_version: "0.2.0",
  build_number: 2,
});

export class ApiProblem extends Error {
  constructor(status, body) {
    super(body?.title ?? `Request failed with HTTP ${status}`);
    this.name = "ApiProblem";
    this.status = status;
    this.code = body?.code ?? "request_failed";
    this.retryable = body?.retryable === true;
  }
}

export function normalizeApiOrigin(value) {
  const url = new URL(value);
  const local = ["127.0.0.1", "localhost"].includes(url.hostname);
  if (url.origin !== value || (url.protocol !== "https:" && !(local && url.protocol === "http:"))) {
    throw new TypeError("Use an HTTPS API origin, or HTTP only for localhost development.");
  }
  return url.origin;
}

export function configuredApiOrigin(locationValue = globalThis.location) {
  const parameter = new URL(locationValue.href).searchParams.get("api");
  return normalizeApiOrigin(parameter ?? DEFAULT_API_ORIGIN);
}

export function decodeInvitationTransfer(payload) {
  if (!/^GP1\.[A-Za-z0-9_-]+$/u.test(payload)) {
    throw new TypeError("Invitation must be a GP1 transfer payload.");
  }
  try {
    const encoded = payload.slice(4).replaceAll("-", "+").replaceAll("_", "/");
    const padding = "=".repeat((4 - (encoded.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(encoded + padding), (character) => character.charCodeAt(0));
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (
      value?.version !== "1" ||
      typeof value.session_id !== "string" ||
      !value.session_id ||
      typeof value.pairing_code !== "string" ||
      value.pairing_code.length < 12 ||
      !Number.isSafeInteger(value.expires_at_unix_ms) ||
      typeof value.gameplay_language !== "string"
    ) {
      throw new TypeError();
    }
    return value;
  } catch {
    throw new TypeError("Invitation payload is malformed or unsupported.");
  }
}

export async function apiRequest(apiOrigin, path, options = {}) {
  const response = await fetch(new URL(path, apiOrigin), {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  let body = null;
  if (response.status !== 204) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  }
  if (!response.ok) throw new ApiProblem(response.status, body);
  return body;
}

export async function recoverContext(apiOrigin, audience) {
  try {
    const context = await apiRequest(apiOrigin, "/api/v1/session/context");
    return context.audience === audience ? context : null;
  } catch (error) {
    if (error instanceof ApiProblem && [401, 403].includes(error.status)) return null;
    throw error;
  }
}

export async function compatibilityProfile(apiOrigin) {
  const value = await apiRequest(apiOrigin, "/api/protocol");
  if (
    !/^1\.[0-9]+$/u.test(value?.preferred_protocol_version ?? "") ||
    value.required_upgrade !== false ||
    !Array.isArray(value.supported_protocol_majors) ||
    !value.supported_protocol_majors.includes(1) ||
    !Array.isArray(value.features) ||
    value.features.length > 128 ||
    !value.features.every((feature) => /^[a-z][a-z0-9_.-]{0,127}$/u.test(feature)) ||
    new Set(value.features).size !== value.features.length
  ) {
    throw new Error("The server compatibility response is not supported.");
  }
  return Object.freeze({
    preferredProtocolVersion: value.preferred_protocol_version,
    features: new Set(value.features),
  });
}

export async function compatibilityFeatures(apiOrigin) {
  return (await compatibilityProfile(apiOrigin)).features;
}

export function sanitizePresentationStatus(value) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !/^[a-z][a-z0-9_.-]{0,127}$/u.test(value.manifest_revision) ||
    typeof value.asset_available !== "boolean" ||
    typeof value.sound_enabled !== "boolean" ||
    !["unknown", "stopped", "starting", "playing", "failed"].includes(value.atmosphere_state) ||
    typeof value.reduced_motion !== "boolean" ||
    (value.atmosphere_state === "unknown" &&
      (value.asset_available || value.sound_enabled || value.reduced_motion))
  ) return null;
  return {
    manifest_revision: value.manifest_revision,
    asset_available: value.asset_available,
    sound_enabled: value.sound_enabled,
    atmosphere_state: value.atmosphere_state,
    reduced_motion: value.reduced_motion,
  };
}

export function identifier(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export class ControlConnection {
  constructor({ apiOrigin, context, protocolVersion = PROTOCOL_VERSION, onProjection, onStatus, onProblem, onPresentationStatus = () => {}, onTerminal = () => {} }) {
    this.apiOrigin = apiOrigin;
    this.context = context;
    this.protocolVersion = protocolVersion;
    this.onProjection = onProjection;
    this.onStatus = onStatus;
    this.onProblem = onProblem;
    this.onPresentationStatus = onPresentationStatus;
    this.onTerminal = onTerminal;
    this.socket = null;
    this.stopped = true;
    this.retryCount = 0;
    this.lastSequence = -1;
    this.pending = new Map();
  }

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.socket?.close(1000, "Client closed");
    this.socket = null;
    for (const pending of this.pending.values()) pending.reject(new Error("Connection closed."));
    this.pending.clear();
  }

  connect() {
    if (this.stopped) return;
    const url = new URL("/ws/v1", this.apiOrigin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    this.onStatus("connecting");
    const socket = new WebSocket(url, CONTROL_SUBPROTOCOL);
    this.socket = socket;
    socket.addEventListener("open", () => {
      this.retryCount = 0;
      this.onStatus("connected");
      this.requestProjection();
    });
    socket.addEventListener("message", (event) => this.receive(event.data));
    socket.addEventListener("error", () => {
      if (this.socket === socket) this.onStatus("disconnected");
    });
    socket.addEventListener("close", (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.stopped) return;
      if ([1000, 1001, 1008].includes(event.code)) {
        this.stopped = true;
        this.onStatus("ended");
        for (const pending of this.pending.values()) pending.reject(new Error("Session authority ended."));
        this.pending.clear();
        this.onTerminal();
        return;
      }
      this.onStatus("reconnecting");
      const delay = [500, 1000, 2000, 5000][Math.min(this.retryCount, 3)];
      this.retryCount += 1;
      setTimeout(() => this.connect(), delay);
    });
  }

  requestProjection() {
    this.send({
      protocol_version: this.protocolVersion,
      type: "get_projection",
      message_id: identifier("msg"),
      session_id: this.context.session_id,
      endpoint_id: this.context.endpoint_id,
      payload: {},
    });
  }

  submit(command) {
    const messageId = identifier("msg");
    const envelope = {
      protocol_version: this.protocolVersion,
      type: "submit_command",
      message_id: messageId,
      session_id: this.context.session_id,
      endpoint_id: this.context.endpoint_id,
      idempotency_id: identifier("cmd"),
      primary_authority_generation: this.context.primary_authority_generation,
      payload: { command },
    };
    return new Promise((resolve, reject) => {
      this.pending.set(messageId, { resolve, reject });
      try {
        this.send(envelope);
      } catch (error) {
        this.pending.delete(messageId);
        reject(error);
        return;
      }
      setTimeout(() => {
        const pending = this.pending.get(messageId);
        if (!pending) return;
        this.pending.delete(messageId);
        pending.reject(new Error("The server did not confirm the action in time."));
      }, 10_000);
    });
  }

  send(envelope) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("The game connection is not ready.");
    }
    this.socket.send(JSON.stringify(envelope));
  }

  receive(encoded) {
    let envelope;
    try {
      envelope = JSON.parse(encoded);
    } catch {
      this.onProblem(new Error("The server sent an unreadable message."));
      return;
    }
    if (
      envelope?.protocol_version !== this.protocolVersion ||
      envelope.session_id !== this.context.session_id ||
      envelope.endpoint_id !== this.context.endpoint_id
    ) {
      this.onProblem(new Error("The server sent a message for the wrong session context."));
      return;
    }
    if (Number.isSafeInteger(envelope.server_sequence)) {
      if (envelope.server_sequence < this.lastSequence) return;
      this.lastSequence = envelope.server_sequence;
    }
    if (envelope.type === "projection") {
      this.onProjection(envelope.payload?.projection, envelope.server_sequence);
      return;
    }
    if (envelope.type === "command_result") {
      const pending = this.pending.get(envelope.correlation_id);
      if (!pending) return;
      this.pending.delete(envelope.correlation_id);
      if (envelope.payload?.status === "accepted") pending.resolve(envelope);
      else pending.reject(new Error(envelope.payload?.title ?? "The server rejected that action."));
      return;
    }
    if (envelope.type === "presentation_status") {
      if (this.context.audience !== "host") {
        this.onProblem(new Error("The server sent a Host-only message to this player connection."));
        return;
      }
      const status = sanitizePresentationStatus(envelope.payload);
      if (status) this.onPresentationStatus(status);
      else this.onProblem(new Error("The server sent an invalid Stage presentation status."));
      return;
    }
    if (envelope.type === "error") {
      const pending = this.pending.get(envelope.correlation_id);
      if (pending) {
        this.pending.delete(envelope.correlation_id);
        pending.reject(new Error(envelope.payload?.title ?? "The server rejected that action."));
      } else {
        this.onProblem(new Error(envelope.payload?.title ?? "The game connection reported an error."));
      }
    }
  }
}
