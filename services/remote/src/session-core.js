import { MAX_IDEMPOTENCY_RECORDS_PER_ENDPOINT } from "./constants.js";

export class SessionFault extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SessionFault";
    this.code = code;
  }
}

export class SessionCore {
  constructor({ scenarioId, scenarioVersion, store, eventVersion = 1 }) {
    if (!isIdentifier(scenarioId) || !Number.isSafeInteger(scenarioVersion) || scenarioVersion < 1) {
      throw new SessionFault("invalid_scenario_reference", "The scenario reference is invalid");
    }
    this.scenarioId = scenarioId;
    this.scenarioVersion = scenarioVersion;
    this.eventVersion = eventVersion;
    this.store = store;
    this.sequence = 0;
    this.loaded = false;
    this.commandTail = Promise.resolve();
  }

  async load(replayEvent) {
    const entries = await this.store.loadJournal();
    let expected = 1;
    for (const entry of entries) {
      validateReplayEntry(entry, {
        expected,
        scenarioId: this.scenarioId,
        scenarioVersion: this.scenarioVersion,
        eventVersion: this.eventVersion,
      });
      await replayEvent(structuredClone(entry.event), entry.sequence_number);
      expected += 1;
    }
    this.sequence = expected - 1;
    this.loaded = true;
    return this.sequence;
  }

  commitCommand(commandContext) {
    const operation = this.commandTail.then(() => this.commitCommandSerial(commandContext));
    this.commandTail = operation.catch(() => {});
    return operation;
  }

  async commitCommandSerial({
    endpointId,
    idempotencyId,
    command,
    createEvent,
    timestampUnixMs = Date.now(),
  }) {
    if (!this.loaded) {
      throw new SessionFault("session_not_loaded", "Replay must complete before mutation");
    }
    if (!isIdentifier(endpointId) || !isIdentifier(idempotencyId)) {
      throw new SessionFault("invalid_command_context", "Command identifiers are invalid");
    }

    const fingerprint = canonicalJson(command);
    const prior = await this.store.getIdempotency(endpointId, idempotencyId);
    if (prior) {
      if (prior.fingerprint !== fingerprint) {
        throw new SessionFault(
          "idempotency_conflict",
          "The idempotency identifier was reused for different content",
        );
      }
      return { ...structuredClone(prior.result), duplicate: true };
    }

    // This callback must validate against a cloned/proposed engine state. It
    // must not mutate canonical in-memory state before appendCommand commits.
    const event = await createEvent(structuredClone(command));
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      throw new SessionFault("invalid_engine_event", "The engine returned an invalid event");
    }

    const sequence = this.sequence + 1;
    const entry = {
      scenario_id: this.scenarioId,
      scenario_version: this.scenarioVersion,
      event_version: this.eventVersion,
      sequence_number: sequence,
      timestamp_unix_ms: timestampUnixMs,
      event: structuredClone(event),
    };
    const result = { status: "accepted", server_sequence: sequence };

    await this.store.appendCommand({
      entry,
      endpointId,
      idempotencyId,
      fingerprint,
      result,
      maximumRecordsPerEndpoint: MAX_IDEMPOTENCY_RECORDS_PER_ENDPOINT,
    });
    this.sequence = sequence;
    return { ...result, duplicate: false };
  }
}

export function canonicalJson(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new SessionFault("invalid_command", "Commands cannot contain non-finite numbers");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  throw new SessionFault("invalid_command", "Commands must be JSON values");
}

function validateReplayEntry(entry, expected) {
  if (
    entry.sequence_number !== expected.expected ||
    entry.scenario_id !== expected.scenarioId ||
    entry.scenario_version !== expected.scenarioVersion ||
    entry.event_version !== expected.eventVersion ||
    !entry.event ||
    typeof entry.event !== "object" ||
    Array.isArray(entry.event)
  ) {
    throw new SessionFault(
      "journal_replay_failed",
      `Journal replay failed at expected sequence ${expected.expected}`,
    );
  }
}

function isIdentifier(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= 128;
}
