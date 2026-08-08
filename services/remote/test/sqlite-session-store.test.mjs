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

function configuredStore() {
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
    endpoint: { platform: "browser", capabilities: ["host_control"] },
    invitationDigest: "f".repeat(64),
    invitationExpiresAtUnixMs: 50_000,
    sessionExpiresAtUnixMs: expires,
    deleteAtUnixMs: 200_000,
    createdAtUnixMs: now,
  }).ok, true);
  const admitted = store.admitGuest({
    sessionId: "ses_0123456789abcdef",
    pairingDigest: "f".repeat(64),
    kind: "participant",
    displayName: "Synthetic Player",
    endpoint: { platform: "ios_companion", capabilities: ["private_display"] },
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

test("consumed resume credential reuse revokes the endpoint credential family", () => {
  const { store, expires } = configuredStore();
  assert.equal(resume(store).ok, true);

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
