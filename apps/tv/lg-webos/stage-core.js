(function (root) {
  "use strict";

  var MAX_SAFE_INTEGER = 9007199254740991;
  var PROTOCOL_VERSION = "1.0";
  var CONTROL_SUBPROTOCOL = "guiltyparty.control.v1";
  var API_ORIGIN = "https://api.test.guiltyparty.app";
  var STAGE_PRESENTATION_FEATURE = "stage_presentation_media_v1";
  var STAGE_BUILD = {
    application_id: "stage_webos",
    application_version: "0.2.0",
    build_number: 3
  };
  var RECONNECT_SECONDS = [1, 2, 4, 8, 15, 30];
  var HEARTBEAT_INTERVAL_MS = 15000;
  var CONNECTION_UNCERTAIN_AFTER_MS = 30000;
  var CONNECTION_DISCONNECT_AFTER_MS = 45000;
  var PRIVATE_KEYS = {
    private_objective: true,
    private_objectives: true,
    private_clue: true,
    private_clues: true,
    has_voted: true,
    individual_vote: true,
    individual_votes: true,
    participant_credential: true,
    participant_credentials: true,
    private_message: true,
    private_messages: true,
    polling_secret: true,
    pairing_proof: true,
    websocket_subprotocol: true,
    token: true
  };
  var PENDING_CONTEXT_KEYS = {
    session_id: true,
    endpoint_id: true,
    room_id: true,
    participant_id: true,
    scenario_id: true,
    scenario_version: true,
    scenario_title: true,
    authority: true,
    authority_transport: true,
    authority_expires_at_unix_ms: true,
    primary_authority_generation: true,
    websocket_transport: true,
    websocket_ticket_endpoint: true,
    token: true
  };
  var PRESENTATION_SOURCE_KEYS = {
    url: true,
    uri: true,
    path: true,
    src: true,
    source: true,
    bytes: true,
    data: true
  };

  function isSafeInteger(value, minimum) {
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value && value >= minimum && value <= MAX_SAFE_INTEGER;
  }

  function isString(value, minimum, maximum) {
    return typeof value === "string" && value.length >= minimum && value.length <= maximum;
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function hasForbiddenKey(value, forbidden) {
    var key;
    var index;
    if (!value || typeof value !== "object") return false;
    if (Array.isArray(value)) {
      for (index = 0; index < value.length; index += 1) {
        if (hasForbiddenKey(value[index], forbidden)) return true;
      }
      return false;
    }
    for (key in value) {
      if (!hasOwn(value, key)) continue;
      if (forbidden[key] || hasForbiddenKey(value[key], forbidden)) return true;
    }
    return false;
  }

  function validLanguage(value) {
    return typeof value === "undefined" || (/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(value) && value.length <= 63);
  }

  function validIdentifier(value) {
    return isString(value, 1, 128);
  }

  function validLogicalIdentifier(value) {
    return typeof value === "string" && /^[a-z][a-z0-9_.-]{0,127}$/.test(value);
  }

  function copyPresentation(value) {
    var output;
    if (!value || typeof value !== "object" || hasForbiddenKey(value, PRESENTATION_SOURCE_KEYS)) return null;
    if (
      !validLogicalIdentifier(value.manifest_revision) ||
      value.audience !== "public_stage" ||
      !validLogicalIdentifier(value.scene_image_id)
    ) return null;
    output = {
      manifest_revision: value.manifest_revision,
      audience: "public_stage",
      scene_image_id: value.scene_image_id
    };
    if (typeof value.atmosphere_audio_id !== "undefined") {
      if (
        !validLogicalIdentifier(value.atmosphere_audio_id) ||
        value.audio_behavior !== "loop_while_scene_active"
      ) return null;
      output.atmosphere_audio_id = value.atmosphere_audio_id;
      output.audio_behavior = "loop_while_scene_active";
    } else if (typeof value.audio_behavior !== "undefined") {
      return null;
    }
    return output;
  }

  function copyScene(value) {
    var output;
    var presentation;
    if (value === null) return null;
    if (!value || typeof value !== "object" || !validIdentifier(value.id) || !isString(value.name, 0, 1000) || !isString(value.public_narrative, 0, 10000)) {
      throw new Error("Invalid public scene");
    }
    output = { id: value.id, name: value.name, public_narrative: value.public_narrative };
    if (typeof value.presentation !== "undefined") {
      presentation = copyPresentation(value.presentation);
      if (presentation) output.presentation = presentation;
    }
    return output;
  }

  function validateCompatibility(value) {
    var index;
    var features = [];
    if (
      !value ||
      value.preferred_protocol_version !== PROTOCOL_VERSION ||
      value.required_upgrade !== false ||
      !Array.isArray(value.supported_protocol_majors) ||
      value.supported_protocol_majors.indexOf(1) < 0 ||
      !Array.isArray(value.features) ||
      value.features.length > 128
    ) throw new Error("Invalid compatibility response");
    for (index = 0; index < value.features.length; index += 1) {
      if (!validLogicalIdentifier(value.features[index]) || features.indexOf(value.features[index]) >= 0) {
        throw new Error("Invalid compatibility feature");
      }
      features.push(value.features[index]);
    }
    return { features: features };
  }

  function copyClues(value) {
    var output = [];
    var index;
    var clue;
    if (!Array.isArray(value) || value.length > 100) throw new Error("Invalid public clues");
    for (index = 0; index < value.length; index += 1) {
      clue = value[index];
      if (!clue || !validIdentifier(clue.id) || !isString(clue.name, 0, 1000) || !isString(clue.description, 0, 10000)) {
        throw new Error("Invalid public clue");
      }
      output.push({ id: clue.id, name: clue.name, description: clue.description });
    }
    return output;
  }

  function copyParticipants(value) {
    var output = [];
    var index;
    var participant;
    if (!Array.isArray(value) || value.length > 8) throw new Error("Invalid public cast");
    for (index = 0; index < value.length; index += 1) {
      participant = value[index];
      if (!participant || !validIdentifier(participant.participant_id) || !isString(participant.name, 1, 80) || !(participant.character_name === null || isString(participant.character_name, 0, 1000))) {
        throw new Error("Invalid public participant");
      }
      output.push({
        participant_id: participant.participant_id,
        name: participant.name,
        character_name: participant.character_name
      });
    }
    return output;
  }

  function copyOutcome(value) {
    if (value === null) return null;
    if (!value || !validIdentifier(value.id) || !isString(value.public_resolution, 0, 10000)) {
      throw new Error("Invalid public outcome");
    }
    return { id: value.id, public_resolution: value.public_resolution };
  }

  function sanitizeProjection(value) {
    if (!value || typeof value !== "object" || hasForbiddenKey(value, PRIVATE_KEYS)) {
      throw new Error("Projection contains forbidden private fields");
    }
    if (
      !validIdentifier(value.scenario_id) ||
      !isSafeInteger(value.scenario_version, 1) ||
      !isString(value.scenario_title, 0, 1000) ||
      !validLanguage(value.gameplay_language) ||
      typeof value.voting_open !== "boolean" ||
      !isSafeInteger(value.votes_cast, 0)
    ) {
      throw new Error("Invalid public projection");
    }
    return {
      scenario_id: value.scenario_id,
      scenario_version: value.scenario_version,
      scenario_title: value.scenario_title,
      gameplay_language: typeof value.gameplay_language === "string" ? value.gameplay_language : "en",
      active_scene: copyScene(value.active_scene),
      revealed_clues: copyClues(value.revealed_clues),
      participants: copyParticipants(value.participants),
      voting_open: value.voting_open,
      votes_cast: value.votes_cast,
      outcome: copyOutcome(value.outcome)
    };
  }

  function validatePairingCreate(value, nowUnixMs) {
    var codePattern = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
    if (
      !value ||
      value.protocol_version !== PROTOCOL_VERSION ||
      !codePattern.test(value.pairing_code) ||
      !isString(value.polling_secret, 32, 128) ||
      value.redeem_path !== "/api/v1/stage-pairings/" + value.pairing_code + "/redeem" ||
      !isSafeInteger(value.expires_at_unix_ms, 1) ||
      value.expires_at_unix_ms <= nowUnixMs ||
      value.expires_at_unix_ms > nowUnixMs + 125000 ||
      !isSafeInteger(value.poll_after_ms, 500) ||
      value.poll_after_ms > 10000
    ) {
      throw new Error("Invalid Stage pairing response");
    }
    return value;
  }

  function validatePending(value, nowUnixMs) {
    if (
      !value ||
      hasForbiddenKey(value, PENDING_CONTEXT_KEYS) ||
      value.protocol_version !== PROTOCOL_VERSION ||
      value.status !== "pending" ||
      !isSafeInteger(value.expires_at_unix_ms, 1) ||
      value.expires_at_unix_ms <= nowUnixMs ||
      !isSafeInteger(value.retry_after_ms, 500) ||
      value.retry_after_ms > 10000
    ) {
      throw new Error("Invalid or context-bearing pending response");
    }
    return value;
  }

  function validateJoin(value, nowUnixMs) {
    if (
      !value ||
      value.protocol_version !== PROTOCOL_VERSION ||
      !isString(value.token, 1, 4096) ||
      !validIdentifier(value.session_id) ||
      !validIdentifier(value.endpoint_id) ||
      !validIdentifier(value.room_id) ||
      value.participant_id !== null ||
      value.authority_transport !== "bearer" ||
      value.websocket_transport !== "ticket_subprotocol" ||
      value.websocket_ticket_endpoint !== "/api/v1/websocket-tickets" ||
      !isSafeInteger(value.authority_expires_at_unix_ms, 1) ||
      value.authority_expires_at_unix_ms <= nowUnixMs ||
      !isSafeInteger(value.primary_authority_generation, 1)
    ) {
      throw new Error("Invalid packaged Stage authority response");
    }
    return value;
  }

  function validateTicket(value, nowUnixMs) {
    if (
      !value ||
      value.protocol_version !== PROTOCOL_VERSION ||
      !isString(value.websocket_subprotocol, 1, 4096) ||
      !/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(value.websocket_subprotocol) ||
      !isSafeInteger(value.ticket_expires_at_unix_ms, 1) ||
      value.ticket_expires_at_unix_ms <= nowUnixMs ||
      value.ticket_expires_at_unix_ms > nowUnixMs + 35000
    ) {
      throw new Error("Invalid WebSocket ticket response");
    }
    return value;
  }

  function validateEnvelope(value, context) {
    var projection;
    if (
      !value ||
      value.protocol_version !== PROTOCOL_VERSION ||
      !isString(value.message_id, 1, 128) ||
      value.session_id !== context.session_id ||
      value.endpoint_id !== context.endpoint_id ||
      !value.payload ||
      typeof value.payload !== "object"
    ) {
      throw new Error("Invalid control-plane envelope context");
    }
    if (value.type === "projection") {
      if (!isSafeInteger(value.server_sequence, 0) || !hasOwn(value.payload, "projection")) {
        throw new Error("Invalid projection envelope");
      }
      projection = sanitizeProjection(value.payload.projection);
      return { type: "projection", sequence: value.server_sequence, projection: projection };
    }
    if (value.type === "error") {
      if (!isString(value.payload.code, 1, 64) || !isString(value.payload.title, 1, 160)) {
        throw new Error("Invalid error envelope");
      }
      return { type: "error", code: value.payload.code, title: value.payload.title };
    }
    throw new Error("Unsupported critical server message");
  }

  function SequenceTracker() {
    this.last = -1;
    this.firstOnConnection = true;
  }

  SequenceTracker.prototype.startConnection = function () {
    this.firstOnConnection = true;
  };

  SequenceTracker.prototype.accept = function (sequence) {
    if (!isSafeInteger(sequence, 0)) return "resync";
    if (this.firstOnConnection) {
      this.firstOnConnection = false;
      if (sequence < this.last) return "resync";
      this.last = sequence;
      return "apply";
    }
    if (sequence === this.last) return "duplicate";
    if (sequence < this.last) return "resync";
    // Projection messages are complete authorized snapshots. Their sequence is
    // the canonical journal position, which may advance by more than one when
    // a single operation appends multiple events or intermediate projections
    // are not delivered to this public endpoint.
    this.last = sequence;
    return "apply";
  };

  SequenceTracker.prototype.reset = function () {
    this.last = -1;
    this.firstOnConnection = true;
  };

  function connectionHealthAction(lastAuthenticatedActivityUnixMs, nowUnixMs) {
    var elapsed;
    if (!isSafeInteger(lastAuthenticatedActivityUnixMs, 0) || !isSafeInteger(nowUnixMs, 0)) {
      return "disconnect";
    }
    elapsed = nowUnixMs - lastAuthenticatedActivityUnixMs;
    if (elapsed < 0) return "disconnect";
    if (elapsed >= CONNECTION_DISCONNECT_AFTER_MS) return "disconnect";
    if (elapsed >= CONNECTION_UNCERTAIN_AFTER_MS) return "uncertain";
    return "healthy";
  }

  function reconnectDelayMs(attempt, randomValue) {
    var index = Math.min(Math.max(0, attempt), RECONNECT_SECONDS.length - 1);
    var random = typeof randomValue === "number" ? randomValue : Math.random();
    if (random < 0) random = 0;
    if (random > 1) random = 1;
    return Math.floor(RECONNECT_SECONDS[index] * 1000 * random);
  }

  function pairingExpired(expiresAtUnixMs, nowUnixMs) {
    return !isSafeInteger(expiresAtUnixMs, 1) || nowUnixMs >= expiresAtUnixMs;
  }

  function terminalHttpStatus(status) {
    return status === 401 || status === 403 || status === 404 || status === 410;
  }

  function terminalSocketClose(code) {
    return code === 1000 || code === 1002 || code === 1008;
  }

  function clearSensitiveState(state) {
    if (state.pairing) state.pairing.polling_secret = null;
    if (state.authority) state.authority.token = null;
    if (state.ticket) state.ticket.websocket_subprotocol = null;
    state.pairing = null;
    state.authority = null;
    state.ticket = null;
    state.projection = null;
    if (state.sequence && typeof state.sequence.reset === "function") state.sequence.reset();
    return state;
  }

  root.GuiltyPartyStageCore = {
    API_ORIGIN: API_ORIGIN,
    CONNECTION_DISCONNECT_AFTER_MS: CONNECTION_DISCONNECT_AFTER_MS,
    CONNECTION_UNCERTAIN_AFTER_MS: CONNECTION_UNCERTAIN_AFTER_MS,
    CONTROL_SUBPROTOCOL: CONTROL_SUBPROTOCOL,
    HEARTBEAT_INTERVAL_MS: HEARTBEAT_INTERVAL_MS,
    PROTOCOL_VERSION: PROTOCOL_VERSION,
    STAGE_BUILD: STAGE_BUILD,
    STAGE_PRESENTATION_FEATURE: STAGE_PRESENTATION_FEATURE,
    SequenceTracker: SequenceTracker,
    clearSensitiveState: clearSensitiveState,
    connectionHealthAction: connectionHealthAction,
    hasForbiddenKey: hasForbiddenKey,
    pairingExpired: pairingExpired,
    reconnectDelayMs: reconnectDelayMs,
    sanitizeProjection: sanitizeProjection,
    terminalHttpStatus: terminalHttpStatus,
    terminalSocketClose: terminalSocketClose,
    validateEnvelope: validateEnvelope,
    validateCompatibility: validateCompatibility,
    validateJoin: validateJoin,
    validatePairingCreate: validatePairingCreate,
    validatePending: validatePending,
    validateTicket: validateTicket
  };
}(typeof globalThis !== "undefined" ? globalThis : this));
