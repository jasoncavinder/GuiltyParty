import { DurableObject } from "cloudflare:workers";

import {
  CONTROL_SUBPROTOCOL,
  JOIN_RATE_WINDOW_MS,
  MAX_PARTICIPANTS,
  MAX_JOIN_ATTEMPTS_PER_WINDOW,
  MAX_MESSAGES_PER_WINDOW,
  MAX_RESUME_ROTATIONS_PER_ENDPOINT,
  MAX_WEBSOCKET_TICKETS_PER_ENDPOINT,
  MAX_WEBSOCKET_MESSAGE_BYTES,
  MESSAGE_RATE_WINDOW_MS,
  PROTOCOL_VERSION,
} from "./constants.js";
import { validClientBuild } from "./client-build.js";
import { offeredSubprotocols } from "./friends-auth.js";
import { scenarioEngine } from "./scenario-engine.js";
import { SessionCore, SessionFault } from "./session-core.js";
import { SqliteSessionStore } from "./sqlite-session-store.js";
import { fanOutWebSockets } from "./websocket-fanout.js";

const INTERNAL_PREFIX = "/internal/session/";

export class GameSession extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.store = new SqliteSessionStore(this.ctx.storage);
    this.operationTail = Promise.resolve();
    this.messageRates = new Map();
    this.ready = this.ctx.blockConcurrencyWhile(async () => {
      this.store.initializeSchema();
    });
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);
    if (!url.pathname.startsWith(INTERNAL_PREFIX) || request.headers.get("X-GP-Internal-Route") !== "1") {
      return internalProblem(404, "not_found", "Not found");
    }

    if (url.pathname === `${INTERNAL_PREFIX}create`) {
      return this.createSession(request);
    }
    if (url.pathname === `${INTERNAL_PREFIX}join`) {
      return this.joinSession(request);
    }
    if (url.pathname === `${INTERNAL_PREFIX}resume`) {
      return this.resumeParticipant(request);
    }
    if (url.pathname === `${INTERNAL_PREFIX}stage-pair`) {
      return this.pairApprovedStage(request);
    }
    if (url.pathname === `${INTERNAL_PREFIX}authorize-stage-pairing`) {
      return this.authorizeStagePairing(request);
    }
    if (url.pathname === `${INTERNAL_PREFIX}authorize`) {
      return this.authorizeEndpoint(request);
    }
    if (url.pathname === `${INTERNAL_PREFIX}endpoints`) {
      return this.listEndpoints(request);
    }
    if (url.pathname === `${INTERNAL_PREFIX}control`) {
      return this.controlSession(request);
    }
    if (url.pathname === `${INTERNAL_PREFIX}websocket-ticket`) {
      return this.registerWebSocketTicket(request);
    }
    if (url.pathname === `${INTERNAL_PREFIX}ws`) {
      return this.acceptWebSocket(request);
    }
    return internalProblem(404, "not_found", "Not found");
  }

  async createSession(request) {
    if (request.method !== "POST") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const value = await safeJson(request);
    if (!validSessionConfiguration(value)) {
      return internalProblem(400, "invalid_session_configuration", "Invalid session configuration");
    }
    const result = this.store.createFriendsSession({
      sessionId: value.session_id,
      hostEndpointId: value.host_endpoint_id,
      hostRoomId: value.host_room_id,
      hostOrigin: value.host_origin,
      gameplayLanguage: value.gameplay_language,
      endpoint: value.endpoint,
      invitationDigest: value.invitation_digest,
      invitationExpiresAtUnixMs: value.invitation_expires_at_unix_ms,
      sessionExpiresAtUnixMs: value.session_expires_at_unix_ms,
      deleteAtUnixMs: value.delete_at_unix_ms,
      createdAtUnixMs: value.created_at_unix_ms,
    });
    if (!result.ok) {
      return internalProblem(result.status, result.code, result.title);
    }
    await this.ctx.storage.setAlarm(value.session_expires_at_unix_ms);
    return internalJson({ created: true }, 201);
  }

  async joinSession(request) {
    if (request.method !== "POST") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const value = await safeJson(request);
    if (!validAdmissionRequest(value)) {
      return internalProblem(400, "invalid_join_request", "Invalid join request");
    }
    const result = await this.serializeOperation(async () => {
      const participant = value.join.kind === "participant";
      const endpointId = randomIdentifier("end");
      const participantId = participant ? randomIdentifier("par") : null;
      const roomId = randomIdentifier("room");
      const journal = await this.store.loadJournal();
      const canonicalEntries = participant
        ? admissionEntries({
            journal,
            participantId,
            endpointId,
            displayName: value.join.display_name,
            capabilities: value.join.endpoint.capabilities,
            timestampUnixMs: value.now_unix_ms,
          })
        : [];
      if (canonicalEntries.length > 0) {
        const replay = scenarioEngine.project([...journal, ...canonicalEntries], {
          audience: "host",
          participantId: null,
        });
        if (!replay.ok) {
          return {
            ok: false,
            status: 503,
            code: "engine_replay_failed",
            title: "Session engine unavailable",
          };
        }
      }
      return this.store.admitGuest({
        sessionId: this.store.sessionMetadata()?.session_id ?? "",
        pairingDigest: value.pairing_digest,
        kind: value.join.kind,
        displayName: participant ? value.join.display_name : null,
        endpoint: value.join.endpoint,
        origin: value.origin,
        endpointId,
        participantId,
        roomId,
        nowUnixMs: value.now_unix_ms,
        maximumParticipants: MAX_PARTICIPANTS,
        canonicalEntries,
        rateWindowMs: JOIN_RATE_WINDOW_MS,
        maximumAttemptsPerWindow: MAX_JOIN_ATTEMPTS_PER_WINDOW,
        resumeCredentialDigest: value.resume_credential_digest ?? null,
        resumeCredentialFamilyId: value.resume_credential_family_id ?? null,
      });
    });
    if (!result.ok) {
      return internalProblem(result.status, result.code, result.title);
    }
    // Admission is canonical scenario state. Notify already-connected Host,
    // Stage, and participant endpoints without making a successful join
    // response depend on any one existing socket remaining writable.
    this.ctx.waitUntil(this.broadcastProjections());
    return internalJson({
      audience: result.audience,
      endpoint_id: result.endpointId,
      participant_id: result.participantId,
      room_id: result.roomId,
      authority_generation: result.authorityGeneration,
      expires_at_unix_ms: result.expiresAtUnixMs,
      server_sequence: result.serverSequence,
    });
  }

  async resumeParticipant(request) {
    if (request.method !== "POST") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const value = await safeJson(request);
    if (!validParticipantResume(value)) {
      return internalProblem(400, "invalid_resume_request", "Invalid resume request");
    }
    const result = await this.serializeOperation(async () =>
      this.store.resumeParticipant({
        credentialDigest: value.credential_digest,
        replacementCredentialDigest: value.replacement_credential_digest,
        sessionId: value.resume.session_id,
        endpointId: value.resume.endpoint_id,
        participantId: value.resume.participant_id,
        authorityGeneration: value.resume.primary_authority_generation,
        lastServerSequence: value.resume.last_server_sequence,
        pendingIdempotencyIds: value.resume.pending_idempotency_ids,
        nowUnixMs: value.now_unix_ms,
        maximumRotationsPerEndpoint: MAX_RESUME_ROTATIONS_PER_ENDPOINT,
      }),
    );
    if (result.closeEndpoint && result.endpointId) {
      for (const socket of this.ctx.getWebSockets(`endpoint:${result.endpointId}`)) {
        socket.close(1008, result.ok ? "Endpoint authority rotated" : "Resume authority revoked");
      }
    }
    if (!result.ok) {
      return internalProblem(result.status, result.code, result.title);
    }
    return internalJson({
      endpoint_id: result.endpointId,
      participant_id: result.participantId,
      room_id: result.roomId,
      authority_generation: result.authorityGeneration,
      expires_at_unix_ms: result.expiresAtUnixMs,
      resume_expires_at_unix_ms: result.resumeExpiresAtUnixMs,
      server_sequence: result.serverSequence,
      pending_command_results: result.pendingCommandResults,
    });
  }

  async pairApprovedStage(request) {
    if (request.method !== "POST") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const value = await safeJson(request);
    if (!validApprovedStagePairing(value)) {
      return internalProblem(400, "invalid_stage_pairing", "Invalid Stage pairing");
    }
    const result = await this.serializeOperation(async () =>
      this.store.admitApprovedStage({
        transactionId: value.transaction_id,
        endpoint: value.endpoint,
        endpointId: randomIdentifier("end"),
        roomId: randomIdentifier("room"),
        nowUnixMs: value.now_unix_ms,
      }),
    );
    if (!result.ok) {
      return internalProblem(result.status, result.code, result.title);
    }
    return internalJson({
      audience: "stage",
      endpoint_id: result.endpointId,
      participant_id: null,
      room_id: result.roomId,
      authority_generation: result.authorityGeneration,
      expires_at_unix_ms: result.expiresAtUnixMs,
      duplicate: result.duplicate,
    });
  }

  async authorizeStagePairing(request) {
    if (request.method !== "POST") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const authority = authorityFromInternalRequest(request);
    if (!authority || authority.audience !== "host") {
      return internalProblem(403, "host_authority_required", "Host authority required");
    }
    const validation = this.store.validateAuthority(authority, Date.now());
    if (!validation.ok) {
      return internalProblem(401, validation.code, "Invalid authority");
    }
    return internalJson({ authorized: true });
  }

  async authorizeEndpoint(request) {
    if (request.method !== "POST") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const authority = authorityFromInternalRequest(request);
    if (!authority) {
      return internalProblem(400, "invalid_authority_context", "Invalid authority context");
    }
    const validation = this.store.validateAuthority(authority, Date.now());
    if (!validation.ok) {
      return internalProblem(401, validation.code, "Invalid authority");
    }
    return internalJson({ authorized: true });
  }

  async listEndpoints(request) {
    if (request.method !== "GET") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const authority = authorityFromInternalRequest(request);
    if (!authority) {
      return internalProblem(400, "invalid_authority_context", "Invalid authority context");
    }
    const result = this.store.listHostEndpoints(authority, Date.now());
    if (!result.ok) {
      return internalProblem(result.status, result.code, result.title);
    }
    return internalJson({ endpoints: result.endpoints });
  }

  async acceptWebSocket(request) {
    if (request.method !== "GET") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return internalProblem(426, "websocket_upgrade_required", "Expected WebSocket upgrade");
    }
    if (!offeredSubprotocols(request.headers.get("Sec-WebSocket-Protocol")).includes(CONTROL_SUBPROTOCOL)) {
      return internalProblem(426, "websocket_subprotocol_required", "Required subprotocol not offered");
    }

    const authority = authorityFromInternalRequest(request);
    if (!authority) {
      return internalProblem(400, "invalid_authority_context", "Invalid authority context");
    }
    const ticketDigest = request.headers.get("X-GP-WebSocket-Ticket-Digest");
    const valid = ticketDigest === null
      ? this.store.validateAuthority(authority, Date.now())
      : this.store.consumeWebSocketTicket({
          authority,
          ticketDigest,
          nowUnixMs: Date.now(),
        });
    if (!valid.ok) {
      return internalProblem(401, valid.code, "Invalid authority");
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [CONTROL_SUBPROTOCOL, `endpoint:${authority.endpointId}`]);
    server.serializeAttachment({
      protocolMajor: 1,
      endpointId: authority.endpointId,
      audience: authority.audience,
      participantId: authority.participantId,
      sessionId: authority.sessionId,
      authorityGeneration: authority.authorityGeneration,
      expiresAtUnixMs: authority.expiresAtUnixMs,
      origin: authority.origin,
      connectionId: crypto.randomUUID(),
    });
    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: { "Sec-WebSocket-Protocol": CONTROL_SUBPROTOCOL },
    });
  }

  async registerWebSocketTicket(request) {
    if (request.method !== "POST") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const authority = authorityFromInternalRequest(request);
    const value = await safeJson(request);
    if (!authority || !validWebSocketTicketRegistration(value)) {
      return internalProblem(400, "invalid_websocket_ticket", "Invalid WebSocket ticket");
    }
    const result = this.store.registerWebSocketTicket({
      authority,
      ticketDigest: value.ticket_digest,
      ticketExpiresAtUnixMs: value.ticket_expires_at_unix_ms,
      nowUnixMs: value.now_unix_ms,
      maximumTicketsPerEndpoint: MAX_WEBSOCKET_TICKETS_PER_ENDPOINT,
    });
    if (!result.ok) {
      return internalProblem(result.status, result.code, result.title);
    }
    return internalJson({ registered: true }, 201);
  }

  async controlSession(request) {
    if (request.method !== "POST") {
      return internalProblem(405, "method_not_allowed", "Method not allowed");
    }
    const authority = authorityFromInternalRequest(request);
    const value = await safeJson(request);
    if (!authority || !value || typeof value.action !== "string") {
      return internalProblem(400, "invalid_control_request", "Invalid control request");
    }
    const now = Date.now();
    let result;
    if (
      value.action === "rotate_invitation" &&
      /^[a-f0-9]{64}$/u.test(value.invitation_digest) &&
      Number.isSafeInteger(value.invitation_expires_at_unix_ms)
    ) {
      result = this.store.rotateInvitation(
        authority,
        value.invitation_digest,
        value.invitation_expires_at_unix_ms,
        now,
      );
    } else if (value.action === "close_invitation") {
      result = this.store.closeInvitation(authority, now);
    } else if (value.action === "revoke_endpoint" && validIdentifier(value.endpoint_id)) {
      result = this.store.revokeEndpoint(authority, value.endpoint_id, now);
      if (result.ok) {
        for (const socket of this.ctx.getWebSockets(`endpoint:${value.endpoint_id}`)) {
          socket.close(1008, "Endpoint revoked");
        }
      }
    } else if (value.action === "end_session") {
      result = this.store.endSession(authority, now);
      if (result.ok) {
        await this.ctx.storage.setAlarm(result.deleteAtUnixMs);
        for (const socket of this.ctx.getWebSockets()) {
          socket.close(1000, "Session ended");
        }
      }
    } else {
      return internalProblem(400, "invalid_control_request", "Invalid control request");
    }
    if (!result.ok) {
      return internalProblem(result.status, result.code, result.title);
    }
    return internalJson({
      ok: true,
      ...(result.expiresAtUnixMs ? { invitation_expires_at_unix_ms: result.expiresAtUnixMs } : {}),
      ...(result.gameplayLanguage ? { gameplay_language: result.gameplayLanguage } : {}),
      ...(typeof result.duplicate === "boolean" ? { duplicate: result.duplicate } : {}),
      ...(result.deleteAtUnixMs ? { delete_at_unix_ms: result.deleteAtUnixMs } : {}),
    });
  }

  async webSocketMessage(socket, message) {
    const attachment = socket.deserializeAttachment();
    if (!validAttachment(attachment)) {
      socket.close(1011, "Connection context unavailable");
      return;
    }
    const authority = {
      sessionId: attachment.sessionId,
      endpointId: attachment.endpointId,
      audience: attachment.audience,
      participantId: attachment.participantId,
      authorityGeneration: attachment.authorityGeneration,
      expiresAtUnixMs: attachment.expiresAtUnixMs,
      origin: attachment.origin,
    };
    if (!this.store.validateAuthority(authority, Date.now()).ok) {
      socket.close(1008, "Authority no longer valid");
      return;
    }
    if (typeof message !== "string") {
      socket.close(1003, "Binary messages are not supported");
      return;
    }
    if (new TextEncoder().encode(message).byteLength > MAX_WEBSOCKET_MESSAGE_BYTES) {
      socket.close(1009, "Message too large");
      return;
    }
    let envelope;
    try {
      envelope = JSON.parse(message);
    } catch {
      socket.close(1007, "Invalid JSON");
      return;
    }
    if (!this.allowEndpointMessage(attachment.endpointId, Date.now())) {
      sendError(socket, attachment, envelope?.message_id, "message_rate_limited", "Too many messages");
      return;
    }
    if (!validEnvelopeContext(envelope, attachment)) {
      sendError(socket, attachment, envelope?.message_id, "invalid_envelope_context", "Invalid message context");
      return;
    }
    if (envelope.type === "get_projection") {
      await this.sendProjection(socket, attachment, envelope.message_id);
      return;
    }
    if (envelope.type === "submit_command") {
      await this.submitCommand(socket, attachment, envelope);
      return;
    }
    if (envelope.type === "request_ai_suggestion") {
      sendError(
        socket,
        attachment,
        envelope.message_id,
        "ai_unavailable",
        "AI Stage Manager is not enabled for the Remote Friends MVP",
      );
      return;
    }
    sendError(socket, attachment, envelope.message_id, "unsupported_message_type", "Unsupported message type");
  }

  async sendProjection(socket, attachment, correlationId) {
    const journal = await this.store.loadJournal();
    const result = scenarioEngine.project(journal, attachment);
    if (!result.ok) {
      sendError(socket, attachment, correlationId, result.code, result.title);
      return;
    }
    if (!this.store.validateAuthority(authorityFromAttachment(attachment), Date.now()).ok) {
      socket.close(1008, "Authority no longer valid");
      return;
    }
    socket.send(JSON.stringify({
      protocol_version: PROTOCOL_VERSION,
      type: "projection",
      message_id: crypto.randomUUID(),
      correlation_id: correlationId,
      session_id: attachment.sessionId,
      endpoint_id: attachment.endpointId,
      server_sequence: result.server_sequence,
      payload: { projection: projectionWithLanguage(result.projection, this.store.gameplayLanguage()) },
    }));
  }

  async submitCommand(socket, attachment, envelope) {
    if (!validSubmitEnvelope(envelope, attachment)) {
      sendError(socket, attachment, envelope.message_id, "invalid_command", "Invalid command");
      return;
    }
    let result;
    try {
      result = await this.serializeOperation(async () => {
        const journal = await this.store.loadJournal();
        const core = new SessionCore({
          ...scenarioEngine.scenarioReference,
          store: this.store,
        });
        await core.load(async () => {});
        return core.commitCommand({
          endpointId: attachment.endpointId,
          idempotencyId: envelope.idempotency_id,
          command: envelope.payload.command,
          timestampUnixMs: Date.now(),
          assertCommitAllowed: () => {
            const validation = this.store.validateAuthority(
              authorityFromAttachment(attachment),
              Date.now(),
            );
            if (!validation.ok) {
              throw new SessionFault(validation.code, "Authority no longer valid");
            }
          },
          createEvent: async (command) => {
            const event = eventForCommand(command, attachment);
            const candidate = journalEntry(journal.length + 1, Date.now(), event);
            const replay = scenarioEngine.project([...journal, candidate], attachment);
            if (!replay.ok) {
              throw new SessionFault("command_rejected", "Command is not valid in the current state");
            }
            return event;
          },
        });
      });
    } catch (error) {
      const code = error instanceof SessionFault ? error.code : "command_failed";
      sendCommandResult(socket, attachment, envelope, {
        status: "rejected",
        code,
        title: "Command rejected",
        server_sequence: this.store.currentSequence(),
      });
      return;
    }

    sendCommandResult(socket, attachment, envelope, result);
    await this.broadcastProjections();
  }

  async broadcastProjections() {
    const journal = await this.store.loadJournal();
    await fanOutWebSockets(this.ctx.getWebSockets(), async (socket) => {
      const attachment = socket.deserializeAttachment();
      if (!validAttachment(attachment)) {
        socket.close(1011, "Connection context unavailable");
        return;
      }
      const authority = authorityFromAttachment(attachment);
      if (!this.store.validateAuthority(authority, Date.now()).ok) {
        socket.close(1008, "Authority no longer valid");
        return;
      }
      const result = scenarioEngine.project(journal, attachment);
      if (!result.ok) {
        socket.close(1011, "Projection unavailable");
        return;
      }
      socket.send(JSON.stringify({
        protocol_version: PROTOCOL_VERSION,
        type: "projection",
        message_id: crypto.randomUUID(),
        session_id: attachment.sessionId,
        endpoint_id: attachment.endpointId,
        server_sequence: result.server_sequence,
        payload: { projection: projectionWithLanguage(result.projection, this.store.gameplayLanguage()) },
      }));
    });
  }

  serializeOperation(operation) {
    const pending = this.operationTail.then(operation);
    this.operationTail = pending.catch(() => {});
    return pending;
  }

  allowEndpointMessage(endpointId, nowUnixMs) {
    const current = this.messageRates.get(endpointId);
    if (!current || nowUnixMs - current.windowStartedAtUnixMs >= MESSAGE_RATE_WINDOW_MS) {
      this.messageRates.set(endpointId, { windowStartedAtUnixMs: nowUnixMs, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= MAX_MESSAGES_PER_WINDOW;
  }

  async webSocketError(socket) {
    socket.close(1011, "WebSocket failure");
  }

  async alarm() {
    await this.ready;
    const result = this.store.expireSession(Date.now());
    if (result.state === "empty" || result.state === "delete") {
      for (const socket of this.ctx.getWebSockets()) {
        socket.close(1001, "Session data expired");
      }
      await this.ctx.storage.deleteAll();
      this.store.initializeSchema();
      return;
    }
    for (const socket of this.ctx.getWebSockets()) {
      socket.close(1008, "Session expired");
    }
    await this.ctx.storage.setAlarm(result.nextAlarmUnixMs);
  }
}

function authorityFromInternalRequest(request) {
  const authorityGeneration = Number(request.headers.get("X-GP-Authority-Generation"));
  const expiresAtUnixMs = Number(request.headers.get("X-GP-Authority-Expires"));
  const audience = request.headers.get("X-GP-Projection-Audience");
  const participantId = request.headers.get("X-GP-Participant-ID");
  const authority = {
    sessionId: request.headers.get("X-GP-Session-ID"),
    endpointId: request.headers.get("X-GP-Endpoint-ID"),
    audience,
    participantId,
    authorityGeneration,
    expiresAtUnixMs,
    origin: request.headers.get("X-GP-Authority-Origin"),
  };
  return validAuthority(authority) ? authority : null;
}

function validAuthority(value) {
  return (
    value &&
    validIdentifier(value.sessionId) &&
    validIdentifier(value.endpointId) &&
    ["host", "stage", "participant"].includes(value.audience) &&
    Number.isSafeInteger(value.authorityGeneration) &&
    value.authorityGeneration >= 1 &&
    Number.isSafeInteger(value.expiresAtUnixMs) &&
    (value.participantId === null || validIdentifier(value.participantId)) &&
    (value.audience === "participant") === (value.participantId !== null)
  );
}

function validAttachment(value) {
  return (
    value &&
    value.protocolMajor === 1 &&
    validAuthority({
      sessionId: value.sessionId,
      endpointId: value.endpointId,
      audience: value.audience,
      participantId: value.participantId,
      authorityGeneration: value.authorityGeneration,
      expiresAtUnixMs: value.expiresAtUnixMs,
      origin: value.origin,
    }) &&
    validIdentifier(value.connectionId)
  );
}

function validEnvelopeContext(envelope, attachment) {
  return (
    envelope &&
    typeof envelope === "object" &&
    !Array.isArray(envelope) &&
    envelope.protocol_version === PROTOCOL_VERSION &&
    validIdentifier(envelope.message_id) &&
    envelope.session_id === attachment.sessionId &&
    envelope.endpoint_id === attachment.endpointId &&
    typeof envelope.type === "string" &&
    envelope.payload &&
    typeof envelope.payload === "object" &&
    !Array.isArray(envelope.payload)
  );
}

function validSubmitEnvelope(envelope, attachment) {
  return (
    validIdentifier(envelope.idempotency_id) &&
    Number.isSafeInteger(envelope.primary_authority_generation) &&
    envelope.primary_authority_generation === attachment.authorityGeneration &&
    envelope.payload.command &&
    typeof envelope.payload.command === "object" &&
    !Array.isArray(envelope.payload.command)
  );
}

function eventForCommand(command, authority) {
  if (authority.audience === "host") {
    if (
      command.type === "assign_character" &&
      validIdentifier(command.participant_id) &&
      validIdentifier(command.character_id)
    ) {
      return {
        type: "character_assigned",
        participant_id: command.participant_id,
        character_id: command.character_id,
      };
    }
    if (command.type === "advance_scene" && validIdentifier(command.scene_id)) {
      return { type: "scene_advanced", scene_id: command.scene_id };
    }
    if (command.type === "reveal_clue" && validIdentifier(command.clue_id)) {
      return { type: "clue_revealed", clue_id: command.clue_id };
    }
    if (command.type === "open_voting") {
      return { type: "voting_opened" };
    }
    if (command.type === "close_voting") {
      return { type: "voting_closed" };
    }
  }
  if (
    authority.audience === "participant" &&
    command.type === "cast_vote" &&
    validIdentifier(command.target_character_id)
  ) {
    return {
      type: "vote_cast",
      participant_id: authority.participantId,
      target_character_id: command.target_character_id,
    };
  }
  throw new SessionFault("command_forbidden", "The endpoint cannot perform this command");
}

function admissionEntries({
  journal,
  participantId,
  endpointId,
  displayName,
  capabilities,
  timestampUnixMs,
}) {
  return [
    journalEntry(journal.length + 1, timestampUnixMs, {
      type: "participant_joined",
      participant_id: participantId,
      name: displayName,
    }),
    journalEntry(journal.length + 2, timestampUnixMs, {
      type: "endpoint_registered",
      endpoint_id: endpointId,
      participant_id: participantId,
      capabilities,
    }),
  ];
}

function journalEntry(sequenceNumber, timestampUnixMs, event) {
  const reference = scenarioEngine.scenarioReference;
  return {
    scenario_id: reference.scenarioId,
    scenario_version: reference.scenarioVersion,
    event_version: 1,
    sequence_number: sequenceNumber,
    timestamp_unix_ms: timestampUnixMs,
    event,
  };
}

function authorityFromAttachment(attachment) {
  return {
    sessionId: attachment.sessionId,
    endpointId: attachment.endpointId,
    audience: attachment.audience,
    participantId: attachment.participantId,
    authorityGeneration: attachment.authorityGeneration,
    expiresAtUnixMs: attachment.expiresAtUnixMs,
    origin: attachment.origin,
  };
}

function sendCommandResult(socket, attachment, envelope, result) {
  const accepted = result.status === "accepted";
  socket.send(JSON.stringify({
    protocol_version: PROTOCOL_VERSION,
    type: "command_result",
    message_id: crypto.randomUUID(),
    correlation_id: envelope.message_id,
    session_id: attachment.sessionId,
    endpoint_id: attachment.endpointId,
    server_sequence: result.server_sequence,
    payload: {
      idempotency_id: envelope.idempotency_id,
      status: accepted ? "accepted" : "rejected",
      primary_authority_generation: attachment.authorityGeneration,
      ...(!accepted ? { code: result.code, title: result.title } : {}),
    },
  }));
}

function sendError(socket, attachment, correlationId, code, title, detail) {
  socket.send(JSON.stringify({
    protocol_version: PROTOCOL_VERSION,
    type: "error",
    message_id: crypto.randomUUID(),
    ...(validIdentifier(correlationId) ? { correlation_id: correlationId } : {}),
    session_id: attachment.sessionId,
    endpoint_id: attachment.endpointId,
    payload: { code, title, ...(detail ? { detail } : {}), retryable: false },
  }));
}

async function safeJson(request) {
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

function validSessionConfiguration(value) {
  return (
    value &&
    validIdentifier(value.session_id) &&
    validIdentifier(value.host_endpoint_id) &&
    validIdentifier(value.host_room_id) &&
    validHttpsOrigin(value.host_origin) &&
    validGameplayLanguage(value.gameplay_language) &&
    validEndpoint(value.endpoint) &&
    /^[a-f0-9]{64}$/u.test(value.invitation_digest) &&
    validTimeline(value.created_at_unix_ms, value.invitation_expires_at_unix_ms) &&
    validTimeline(value.created_at_unix_ms, value.session_expires_at_unix_ms) &&
    validTimeline(value.session_expires_at_unix_ms, value.delete_at_unix_ms)
  );
}

function validAdmissionRequest(value) {
  const hasResumeCredential =
    /^[a-f0-9]{64}$/u.test(value?.resume_credential_digest ?? "") &&
    validIdentifier(value?.resume_credential_family_id);
  return (
    value &&
    /^[a-f0-9]{64}$/u.test(value.pairing_digest) &&
    (value.origin === null || validHttpsOrigin(value.origin)) &&
    Number.isSafeInteger(value.now_unix_ms) &&
    value.now_unix_ms > 0 &&
    value.join &&
    ["stage", "participant"].includes(value.join.kind) &&
    validEndpoint(value.join.endpoint) &&
    (value.join.kind === "stage" || validDisplayName(value.join.display_name)) &&
    (
      hasResumeCredential
        ? value.join.kind === "participant" && value.origin === null
        : value.resume_credential_digest === undefined &&
          value.resume_credential_family_id === undefined
    )
  );
}

function validParticipantResume(value) {
  const resume = value?.resume;
  return (
    value &&
    /^[a-f0-9]{64}$/u.test(value.credential_digest) &&
    /^[a-f0-9]{64}$/u.test(value.replacement_credential_digest) &&
    value.credential_digest !== value.replacement_credential_digest &&
    Number.isSafeInteger(value.now_unix_ms) &&
    value.now_unix_ms > 0 &&
    resume &&
    resume.protocol_version === PROTOCOL_VERSION &&
    validIdentifier(resume.session_id) &&
    validIdentifier(resume.endpoint_id) &&
    validIdentifier(resume.participant_id) &&
    Number.isSafeInteger(resume.last_server_sequence) &&
    resume.last_server_sequence >= 0 &&
    Number.isSafeInteger(resume.primary_authority_generation) &&
    resume.primary_authority_generation >= 1 &&
    Array.isArray(resume.pending_idempotency_ids) &&
    resume.pending_idempotency_ids.length <= 32 &&
    new Set(resume.pending_idempotency_ids).size === resume.pending_idempotency_ids.length &&
    resume.pending_idempotency_ids.every(validIdentifier) &&
    validClientBuild(resume.client_build)
  );
}

function validWebSocketTicketRegistration(value) {
  return (
    value &&
    /^[a-f0-9]{64}$/u.test(value.ticket_digest) &&
    Number.isSafeInteger(value.now_unix_ms) &&
    value.now_unix_ms > 0 &&
    Number.isSafeInteger(value.ticket_expires_at_unix_ms) &&
    value.ticket_expires_at_unix_ms > value.now_unix_ms
  );
}

function validApprovedStagePairing(value) {
  return (
    value &&
    validIdentifier(value.transaction_id) &&
    Number.isSafeInteger(value.now_unix_ms) &&
    value.now_unix_ms > 0 &&
    validEndpoint(value.endpoint) &&
    value.endpoint.platform === "webos" &&
    value.endpoint.capabilities.includes("public_display")
  );
}

function validEndpoint(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.platform === "string" &&
    Array.isArray(value.capabilities) &&
    value.capabilities.length <= 32 &&
    value.capabilities.every((item) => typeof item === "string" && item.length <= 128)
  );
}

function validGameplayLanguage(value) {
  return (
    typeof value === "string" &&
    value.length <= 63 &&
    /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u.test(value)
  );
}

function projectionWithLanguage(projection, gameplayLanguage) {
  return { ...projection, gameplay_language: gameplayLanguage };
}

function validDisplayName(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= 80;
}

function validTimeline(earlier, later) {
  return Number.isSafeInteger(earlier) && Number.isSafeInteger(later) && earlier > 0 && later > earlier;
}

function validHttpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value;
  } catch {
    return false;
  }
}

function validIdentifier(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= 128;
}

function internalJson(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function internalProblem(status, code, title) {
  return internalJson({ status, code, title }, status);
}

function randomIdentifier(prefix) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const value = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
  return `${prefix}_${value}`;
}
