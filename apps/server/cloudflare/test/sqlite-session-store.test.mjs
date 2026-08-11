import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import { SqliteSessionStore } from "../src/sqlite-session-store.js";

class TestSqlStorage {
  constructor() {
    this.database = new DatabaseSync(":memory:");
    this.sql = {
      exec: (query, ...bindings) => {
        if (bindings.length === 0 && query.includes(";")) {
          this.database.exec(query);
          return [];
        }
        const statement = this.database.prepare(query);
        if (/^\s*(SELECT|PRAGMA|WITH)\b/iu.test(query)) {
          return statement.all(...bindings);
        }
        statement.run(...bindings);
        return [];
      },
    };
  }

  transactionSync(operation) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = operation();
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

function configuredStore({ participantProtocolVersion = "1.0", participantFeatures = [] } = {}) {
  const storage = new TestSqlStorage();
  const store = new SqliteSessionStore(storage);
  store.initializeSchema();
  const now = 1_000;
  const expires = 100_000;
  assert.equal(store.createFriendsSession({
    sessionId: "ses_0123456789abcdef",
    hostEndpointId: "end_host_0123456789abcdef",
    hostRoomId: "room_host_0123456789abcdef",
    hostOrigin: "https://host.example.test",
    gameplayLanguage: "en",
    scenarioId: "the-stolen-artifact",
    scenarioVersion: 2,
    endpoint: {
      platform: "browser",
      capabilities: ["host_control"],
      features: ["host_presentation_status_v1"],
      client_build: { application_id: "host_web", application_version: "0.2.0", build_number: 2 },
    },
    invitationDigest: "f".repeat(64),
    invitationExpiresAtUnixMs: 50_000,
    sessionExpiresAtUnixMs: expires,
    deleteAtUnixMs: 200_000,
    createdAtUnixMs: now,
  }).ok, true);
  const admitted = store.admitGuest({
    sessionId: "ses_0123456789abcdef",
    protocolVersion: participantProtocolVersion,
    pairingDigest: "f".repeat(64),
    kind: "participant",
    displayName: "Synthetic Player",
    endpoint: {
      platform: "ios_companion",
      capabilities: ["private_display"],
      features: participantFeatures,
    },
    origin: null,
    endpointId: "end_player_0123456789abcdef",
    participantId: "par_0123456789abcdef",
    roomId: "room_player_0123456789abcdef",
    nowUnixMs: now + 1,
    maximumParticipants: 8,
    rateWindowMs: 60_000,
    maximumAttemptsPerWindow: 30,
    resumeCredentialDigest: "a".repeat(64),
    resumeCredentialFamilyId: "rsf_0123456789abcdef",
  });
  assert.equal(admitted.ok, true);
  return { store, expires };
}

function resume(store, overrides = {}) {
  return store.resumeParticipant({
    credentialDigest: "a".repeat(64),
    replacementCredentialDigest: "b".repeat(64),
    sessionId: "ses_0123456789abcdef",
    endpointId: "end_player_0123456789abcdef",
    participantId: "par_0123456789abcdef",
    authorityGeneration: 1,
    lastServerSequence: 0,
    pendingIdempotencyIds: [],
    nowUnixMs: 2_000,
    maximumRotationsPerEndpoint: 64,
    ...overrides,
  });
}

test("participant resume preserves identity, rotates generation, and resolves pending command IDs", async () => {
  const { store, expires } = configuredStore();
  await store.appendCommand({
    entry: {
      sequence_number: 1,
      scenario_id: "scenario-synthetic",
      scenario_version: 1,
      event_version: 1,
      timestamp_unix_ms: 1_500,
      event: { type: "vote_cast", participant_id: "par_0123456789abcdef" },
    },
    endpointId: "end_player_0123456789abcdef",
    idempotencyId: "idem_0123456789abcdef",
    fingerprint: "synthetic",
    result: { status: "accepted", server_sequence: 1 },
    maximumRecordsPerEndpoint: 256,
    assertCommitAllowed: () => {},
  });

  const result = resume(store, {
    lastServerSequence: 1,
    pendingIdempotencyIds: ["idem_0123456789abcdef", "idem_unknown_0123456789"],
  });

  assert.deepEqual(result, {
    ok: true,
    endpointId: "end_player_0123456789abcdef",
    participantId: "par_0123456789abcdef",
    roomId: "room_player_0123456789abcdef",
    authorityGeneration: 2,
    protocolVersion: "1.0",
    expiresAtUnixMs: expires,
    resumeExpiresAtUnixMs: expires,
    serverSequence: 1,
    pendingCommandResults: [
      {
        idempotency_id: "idem_0123456789abcdef",
        status: "accepted",
        server_sequence: 1,
      },
      {
        idempotency_id: "idem_unknown_0123456789",
        status: "unknown",
        server_sequence: null,
      },
    ],
    closeEndpoint: true,
  });
  assert.equal(store.validateAuthority({
    sessionId: "ses_0123456789abcdef",
    endpointId: "end_player_0123456789abcdef",
    audience: "participant",
    participantId: "par_0123456789abcdef",
    authorityGeneration: 2,
    expiresAtUnixMs: expires,
    origin: null,
  }, 2_001).ok, true);
  assert.equal(
    Array.from(store.sql.exec("SELECT COUNT(*) AS count FROM guest_participants"))[0].count,
    1,
  );
  assert.equal(
    Array.from(store.sql.exec("SELECT COUNT(*) AS count FROM endpoint_authorities WHERE audience = 'participant'"))[0].count,
    1,
  );
  assert.equal(
    Array.from(store.sql.exec("SELECT COUNT(*) AS count FROM session_journal"))[0].count,
    1,
  );
});

test("an exact resume rotation retry succeeds while a different replacement revokes the family", () => {
  const { store, expires } = configuredStore();
  assert.equal(resume(store).ok, true);

  const exactRetry = resume(store, { nowUnixMs: 2_050 });
  assert.equal(exactRetry.ok, true);
  assert.equal(exactRetry.authorityGeneration, 2);
  assert.equal(exactRetry.closeEndpoint, false);
  assert.equal(store.validateAuthority({
    sessionId: "ses_0123456789abcdef",
    endpointId: "end_player_0123456789abcdef",
    audience: "participant",
    participantId: "par_0123456789abcdef",
    authorityGeneration: 2,
    expiresAtUnixMs: expires,
    origin: null,
  }, 2_051).ok, true);

  const reused = resume(store, {
    replacementCredentialDigest: "c".repeat(64),
    nowUnixMs: 2_100,
  });
  assert.equal(reused.code, "resume_credential_reused");
  assert.equal(reused.closeEndpoint, true);
  assert.equal(store.validateAuthority({
    sessionId: "ses_0123456789abcdef",
    endpointId: "end_player_0123456789abcdef",
    audience: "participant",
    participantId: "par_0123456789abcdef",
    authorityGeneration: 2,
    expiresAtUnixMs: expires,
    origin: null,
  }, 2_101).ok, false);
  assert.equal(resume(store, {
    credentialDigest: "b".repeat(64),
    replacementCredentialDigest: "c".repeat(64),
    authorityGeneration: 2,
    nowUnixMs: 2_102,
  }).code, "resume_credential_revoked");
});

test("invalid resume context does not consume a valid credential", () => {
  const { store } = configuredStore();
  assert.equal(resume(store, { participantId: "par_wrong_0123456789abcdef" }).code, "invalid_resume_context");
  assert.equal(resume(store, { nowUnixMs: 2_001 }).ok, true);
});

test("endpoint registration preserves bounded feature and build negotiation inputs", () => {
  const { store } = configuredStore();
  assert.deepEqual(store.scenarioReference(), {
    scenarioId: "the-stolen-artifact",
    scenarioVersion: 2,
  });
  assert.deepEqual(store.endpointRegistration("end_host_0123456789abcdef"), {
    audience: "host",
    protocolVersion: "1.0",
    platform: "browser",
    capabilities: ["host_control"],
    features: ["host_presentation_status_v1"],
    clientBuild: { application_id: "host_web", application_version: "0.2.0", build_number: 2 },
    revoked: false,
  });
  assert.deepEqual(store.endpointRegistration("end_player_0123456789abcdef"), {
    audience: "participant",
    protocolVersion: "1.0",
    platform: "ios_companion",
    capabilities: ["private_display"],
    features: [],
    clientBuild: null,
    revoked: false,
  });
});

test("protocol minor and participant voting negotiation survive admission and resume", () => {
  const { store } = configuredStore({
    participantProtocolVersion: "1.1",
    participantFeatures: ["participant_vote_targets_v1"],
  });
  assert.deepEqual(store.endpointRegistration("end_player_0123456789abcdef"), {
    audience: "participant",
    protocolVersion: "1.1",
    platform: "ios_companion",
    capabilities: ["private_display"],
    features: ["participant_vote_targets_v1"],
    clientBuild: null,
    revoked: false,
  });
  assert.equal(resume(store).code, "invalid_resume_context");
  assert.equal(resume(store, { protocolVersion: "1.1", nowUnixMs: 2_001 }).ok, true);
});

test("schema initialization migrates legacy endpoint rows to fail-safe metadata", () => {
  const storage = new TestSqlStorage();
  storage.database.exec(`
    CREATE TABLE endpoint_authorities (
      endpoint_id TEXT PRIMARY KEY,
      audience TEXT NOT NULL,
      participant_id TEXT,
      room_id TEXT NOT NULL,
      authority_generation INTEGER NOT NULL,
      origin TEXT,
      platform TEXT NOT NULL,
      capabilities_json TEXT NOT NULL,
      expires_at_unix_ms INTEGER NOT NULL,
      revoked_at_unix_ms INTEGER
    );
    INSERT INTO endpoint_authorities VALUES (
      'end_legacy', 'stage', NULL, 'room_legacy', 1, NULL, 'webos',
      '["public_display"]', 100000, NULL
    );
  `);
  const store = new SqliteSessionStore(storage);
  store.initializeSchema();
  assert.deepEqual(store.endpointRegistration("end_legacy"), {
    audience: "stage",
    protocolVersion: "1.0",
    platform: "webos",
    capabilities: ["public_display"],
    features: [],
    clientBuild: null,
    revoked: false,
  });
});

test("schema initialization pins legacy sessions to immutable scenario version one", () => {
  const storage = new TestSqlStorage();
  storage.database.exec(`
    CREATE TABLE session_metadata (
      singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
      session_id TEXT NOT NULL UNIQUE,
      host_room_id TEXT NOT NULL,
      invitation_digest TEXT NOT NULL,
      invitation_expires_at_unix_ms INTEGER NOT NULL,
      invitation_open INTEGER NOT NULL CHECK (invitation_open IN (0, 1)),
      session_expires_at_unix_ms INTEGER NOT NULL,
      delete_at_unix_ms INTEGER NOT NULL,
      created_at_unix_ms INTEGER NOT NULL,
      ended_at_unix_ms INTEGER
    );
    INSERT INTO session_metadata VALUES (
      1, 'ses_legacy', 'room_legacy', '${"f".repeat(64)}', 50000, 1,
      100000, 200000, 1000, NULL
    );
  `);
  const store = new SqliteSessionStore(storage);
  store.initializeSchema();
  assert.deepEqual(store.scenarioReference(), {
    scenarioId: "the-stolen-artifact",
    scenarioVersion: 1,
  });
});
