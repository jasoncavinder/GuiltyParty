export class SqliteSessionStore {
  constructor(storage) {
    this.storage = storage;
    this.sql = storage.sql;
  }

  initializeSchema() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS session_journal (
        sequence_number INTEGER PRIMARY KEY,
        scenario_id TEXT NOT NULL,
        scenario_version INTEGER NOT NULL,
        event_version INTEGER NOT NULL,
        timestamp_unix_ms INTEGER NOT NULL,
        event_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS command_idempotency (
        endpoint_id TEXT NOT NULL,
        idempotency_id TEXT NOT NULL,
        fingerprint TEXT NOT NULL,
        result_json TEXT NOT NULL,
        sequence_number INTEGER NOT NULL,
        PRIMARY KEY (endpoint_id, idempotency_id)
      );
      CREATE INDEX IF NOT EXISTS command_idempotency_sequence
        ON command_idempotency (endpoint_id, sequence_number DESC);
      CREATE TABLE IF NOT EXISTS session_metadata (
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
      CREATE TABLE IF NOT EXISTS guest_participants (
        participant_id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at_unix_ms INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS endpoint_authorities (
        endpoint_id TEXT PRIMARY KEY,
        audience TEXT NOT NULL CHECK (audience IN ('host', 'stage', 'participant')),
        participant_id TEXT,
        room_id TEXT NOT NULL,
        authority_generation INTEGER NOT NULL,
        origin TEXT,
        platform TEXT NOT NULL,
        capabilities_json TEXT NOT NULL,
        expires_at_unix_ms INTEGER NOT NULL,
        revoked_at_unix_ms INTEGER
      );
      CREATE INDEX IF NOT EXISTS endpoint_authorities_audience
        ON endpoint_authorities (audience, revoked_at_unix_ms);
      CREATE TABLE IF NOT EXISTS admission_rate_limit (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        window_started_at_unix_ms INTEGER NOT NULL,
        attempt_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS websocket_tickets (
        ticket_digest TEXT PRIMARY KEY,
        endpoint_id TEXT NOT NULL,
        authority_generation INTEGER NOT NULL,
        expires_at_unix_ms INTEGER NOT NULL,
        consumed_at_unix_ms INTEGER
      );
      CREATE INDEX IF NOT EXISTS websocket_tickets_endpoint
        ON websocket_tickets (endpoint_id, expires_at_unix_ms DESC);
    `);
  }

  createFriendsSession(configuration) {
    return this.storage.transactionSync(() => {
      if (this.sessionMetadata()) {
        return { ok: false, status: 409, code: "session_already_created", title: "Session already exists" };
      }
      this.sql.exec(
        `INSERT INTO session_metadata (
           singleton, session_id, host_room_id, invitation_digest,
           invitation_expires_at_unix_ms, invitation_open,
           session_expires_at_unix_ms, delete_at_unix_ms, created_at_unix_ms
         ) VALUES (1, ?, ?, ?, ?, 1, ?, ?, ?)`,
        configuration.sessionId,
        configuration.hostRoomId,
        configuration.invitationDigest,
        configuration.invitationExpiresAtUnixMs,
        configuration.sessionExpiresAtUnixMs,
        configuration.deleteAtUnixMs,
        configuration.createdAtUnixMs,
      );
      this.sql.exec(
        `INSERT INTO endpoint_authorities (
           endpoint_id, audience, participant_id, room_id, authority_generation,
           origin, platform, capabilities_json, expires_at_unix_ms
         ) VALUES (?, 'host', NULL, ?, 1, ?, ?, ?, ?)`,
        configuration.hostEndpointId,
        configuration.hostRoomId,
        configuration.hostOrigin,
        configuration.endpoint.platform,
        JSON.stringify(configuration.endpoint.capabilities),
        configuration.sessionExpiresAtUnixMs,
      );
      return { ok: true };
    });
  }

  admitGuest({
    sessionId,
    pairingDigest,
    kind,
    displayName,
    endpoint,
    origin,
    endpointId,
    participantId,
    roomId,
    nowUnixMs,
    maximumParticipants,
    canonicalEntries = [],
    rateWindowMs,
    maximumAttemptsPerWindow,
  }) {
    return this.storage.transactionSync(() => {
      const metadata = this.sessionMetadata();
      if (!metadata || metadata.session_id !== sessionId) {
        return { ok: false, status: 404, code: "session_not_found", title: "Session not found" };
      }
      if (metadata.ended_at_unix_ms !== null || nowUnixMs >= metadata.session_expires_at_unix_ms) {
        return { ok: false, status: 410, code: "session_expired", title: "Session expired" };
      }
      if (!this.consumeAdmissionAttempt(nowUnixMs, rateWindowMs, maximumAttemptsPerWindow)) {
        return { ok: false, status: 429, code: "join_rate_limited", title: "Too many join attempts" };
      }
      if (
        metadata.invitation_open !== 1 ||
        nowUnixMs >= metadata.invitation_expires_at_unix_ms ||
        !constantTimeEqual(pairingDigest, metadata.invitation_digest)
      ) {
        return { ok: false, status: 401, code: "invalid_pairing_proof", title: "Invalid pairing proof" };
      }

      if (kind === "stage") {
        const stages = Array.from(
          this.sql.exec(
            `SELECT COUNT(*) AS count FROM endpoint_authorities
             WHERE audience = 'stage' AND revoked_at_unix_ms IS NULL`,
          ),
        )[0];
        if (Number(stages.count) >= 1) {
          return { ok: false, status: 409, code: "stage_already_paired", title: "Stage already paired" };
        }
      } else {
        const participants = Array.from(this.sql.exec("SELECT COUNT(*) AS count FROM guest_participants"))[0];
        if (Number(participants.count) >= maximumParticipants) {
          return { ok: false, status: 409, code: "session_full", title: "Session is full" };
        }
        this.sql.exec(
          `INSERT INTO guest_participants (
             participant_id, room_id, display_name, created_at_unix_ms
           ) VALUES (?, ?, ?, ?)`,
          participantId,
          roomId,
          displayName,
          nowUnixMs,
        );
      }

      const audience = kind === "stage" ? "stage" : "participant";
      this.sql.exec(
        `INSERT INTO endpoint_authorities (
           endpoint_id, audience, participant_id, room_id, authority_generation,
           origin, platform, capabilities_json, expires_at_unix_ms
         ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
        endpointId,
        audience,
        participantId,
        roomId,
        origin,
        endpoint.platform,
        JSON.stringify(endpoint.capabilities),
        metadata.session_expires_at_unix_ms,
      );
      const currentSequence = this.currentSequence();
      for (const [index, entry] of canonicalEntries.entries()) {
        if (entry.sequence_number !== currentSequence + index + 1) {
          throw new Error("Canonical admission sequence changed");
        }
        this.insertJournalEntry(entry);
      }
      return {
        ok: true,
        audience,
        endpointId,
        participantId,
        roomId,
        authorityGeneration: 1,
        expiresAtUnixMs: metadata.session_expires_at_unix_ms,
        serverSequence: currentSequence + canonicalEntries.length,
      };
    });
  }

  validateAuthority(authority, nowUnixMs) {
    const metadata = this.sessionMetadata();
    if (!metadata || metadata.session_id !== authority.sessionId) {
      return { ok: false, code: "invalid_authority" };
    }
    if (metadata.ended_at_unix_ms !== null || nowUnixMs >= metadata.session_expires_at_unix_ms) {
      return { ok: false, code: "session_expired" };
    }
    const rows = Array.from(
      this.sql.exec(
        `SELECT endpoint_id, audience, participant_id, authority_generation,
                origin, expires_at_unix_ms, revoked_at_unix_ms
         FROM endpoint_authorities WHERE endpoint_id = ?`,
        authority.endpointId,
      ),
    );
    const row = rows[0];
    if (
      !row ||
      row.audience !== authority.audience ||
      (row.participant_id ?? null) !== authority.participantId ||
      Number(row.authority_generation) !== authority.authorityGeneration ||
      (row.origin ?? null) !== authority.origin ||
      Number(row.expires_at_unix_ms) !== authority.expiresAtUnixMs ||
      row.revoked_at_unix_ms !== null ||
      nowUnixMs >= Number(row.expires_at_unix_ms)
    ) {
      return { ok: false, code: "invalid_authority" };
    }
    return { ok: true };
  }

  registerWebSocketTicket({
    authority,
    ticketDigest,
    ticketExpiresAtUnixMs,
    nowUnixMs,
    maximumTicketsPerEndpoint,
  }) {
    return this.storage.transactionSync(() => {
      const validation = this.validateAuthority(authority, nowUnixMs);
      if (!validation.ok || authority.audience !== "stage" || authority.origin !== null) {
        return {
          ok: false,
          status: 403,
          code: "packaged_stage_authority_required",
          title: "Packaged Stage authority required",
        };
      }
      if (
        !/^[a-f0-9]{64}$/u.test(ticketDigest) ||
        !Number.isSafeInteger(ticketExpiresAtUnixMs) ||
        ticketExpiresAtUnixMs <= nowUnixMs ||
        ticketExpiresAtUnixMs > authority.expiresAtUnixMs
      ) {
        return {
          ok: false,
          status: 400,
          code: "invalid_websocket_ticket",
          title: "Invalid WebSocket ticket",
        };
      }
      this.sql.exec(
        `DELETE FROM websocket_tickets
         WHERE endpoint_id = ? AND (expires_at_unix_ms <= ? OR consumed_at_unix_ms IS NOT NULL)`,
        authority.endpointId,
        nowUnixMs,
      );
      this.sql.exec(
        `INSERT INTO websocket_tickets (
           ticket_digest, endpoint_id, authority_generation, expires_at_unix_ms
         ) VALUES (?, ?, ?, ?)`,
        ticketDigest,
        authority.endpointId,
        authority.authorityGeneration,
        ticketExpiresAtUnixMs,
      );
      this.sql.exec(
        `DELETE FROM websocket_tickets
         WHERE ticket_digest IN (
           SELECT ticket_digest FROM websocket_tickets
           WHERE endpoint_id = ?
           ORDER BY expires_at_unix_ms DESC
           LIMIT -1 OFFSET ?
         )`,
        authority.endpointId,
        maximumTicketsPerEndpoint,
      );
      return { ok: true };
    });
  }

  consumeWebSocketTicket({ authority, ticketDigest, nowUnixMs }) {
    return this.storage.transactionSync(() => {
      const validation = this.validateAuthority(authority, nowUnixMs);
      if (!validation.ok || authority.audience !== "stage" || authority.origin !== null) {
        return { ok: false, code: "invalid_authority" };
      }
      const row = Array.from(
        this.sql.exec(
          `SELECT endpoint_id, authority_generation, expires_at_unix_ms, consumed_at_unix_ms
           FROM websocket_tickets WHERE ticket_digest = ?`,
          ticketDigest,
        ),
      )[0];
      if (
        !row ||
        row.endpoint_id !== authority.endpointId ||
        Number(row.authority_generation) !== authority.authorityGeneration ||
        Number(row.expires_at_unix_ms) <= nowUnixMs ||
        row.consumed_at_unix_ms !== null
      ) {
        return { ok: false, code: "invalid_websocket_ticket" };
      }
      this.sql.exec(
        `UPDATE websocket_tickets SET consumed_at_unix_ms = ?
         WHERE ticket_digest = ? AND consumed_at_unix_ms IS NULL`,
        nowUnixMs,
        ticketDigest,
      );
      return { ok: true };
    });
  }

  rotateInvitation(authority, invitationDigest, expiresAtUnixMs, nowUnixMs) {
    return this.storage.transactionSync(() => {
      const validation = this.validateAuthority(authority, nowUnixMs);
      if (!validation.ok || authority.audience !== "host") {
        return { ok: false, status: 403, code: "host_authority_required", title: "Host authority required" };
      }
      const metadata = this.sessionMetadata();
      if (expiresAtUnixMs > metadata.session_expires_at_unix_ms) {
        return { ok: false, status: 400, code: "invalid_invitation_expiry", title: "Invalid invitation expiry" };
      }
      this.sql.exec(
        `UPDATE session_metadata
         SET invitation_digest = ?, invitation_expires_at_unix_ms = ?, invitation_open = 1
         WHERE singleton = 1`,
        invitationDigest,
        expiresAtUnixMs,
      );
      return { ok: true, expiresAtUnixMs };
    });
  }

  closeInvitation(authority, nowUnixMs) {
    return this.storage.transactionSync(() => {
      const validation = this.validateAuthority(authority, nowUnixMs);
      if (!validation.ok || authority.audience !== "host") {
        return { ok: false, status: 403, code: "host_authority_required", title: "Host authority required" };
      }
      this.sql.exec("UPDATE session_metadata SET invitation_open = 0 WHERE singleton = 1");
      return { ok: true };
    });
  }

  revokeEndpoint(authority, endpointId, nowUnixMs) {
    return this.storage.transactionSync(() => {
      const validation = this.validateAuthority(authority, nowUnixMs);
      if (!validation.ok || authority.audience !== "host") {
        return { ok: false, status: 403, code: "host_authority_required", title: "Host authority required" };
      }
      const rows = Array.from(
        this.sql.exec(
          "SELECT audience, revoked_at_unix_ms FROM endpoint_authorities WHERE endpoint_id = ?",
          endpointId,
        ),
      );
      const endpoint = rows[0];
      if (!endpoint) {
        return { ok: false, status: 404, code: "endpoint_not_found", title: "Endpoint not found" };
      }
      if (endpoint.audience === "host") {
        return { ok: false, status: 409, code: "host_revocation_forbidden", title: "Host endpoint cannot be revoked here" };
      }
      if (endpoint.revoked_at_unix_ms !== null) {
        return { ok: true, duplicate: true };
      }
      this.sql.exec(
        `UPDATE endpoint_authorities
         SET revoked_at_unix_ms = ?, authority_generation = authority_generation + 1
         WHERE endpoint_id = ?`,
        nowUnixMs,
        endpointId,
      );
      return { ok: true, duplicate: false };
    });
  }

  endSession(authority, nowUnixMs, retentionMs) {
    return this.storage.transactionSync(() => {
      const validation = this.validateAuthority(authority, nowUnixMs);
      if (!validation.ok || authority.audience !== "host") {
        return { ok: false, status: 403, code: "host_authority_required", title: "Host authority required" };
      }
      const deleteAtUnixMs = nowUnixMs + retentionMs;
      this.sql.exec(
        `UPDATE session_metadata
         SET ended_at_unix_ms = ?, invitation_open = 0, delete_at_unix_ms = ?
         WHERE singleton = 1 AND ended_at_unix_ms IS NULL`,
        nowUnixMs,
        deleteAtUnixMs,
      );
      this.sql.exec(
        "UPDATE endpoint_authorities SET revoked_at_unix_ms = ? WHERE revoked_at_unix_ms IS NULL",
        nowUnixMs,
      );
      return { ok: true, deleteAtUnixMs };
    });
  }

  expireSession(nowUnixMs) {
    return this.storage.transactionSync(() => {
      const metadata = this.sessionMetadata();
      if (!metadata) {
        return { state: "empty" };
      }
      if (nowUnixMs >= metadata.delete_at_unix_ms) {
        return { state: "delete" };
      }
      if (metadata.ended_at_unix_ms === null && nowUnixMs >= metadata.session_expires_at_unix_ms) {
        this.sql.exec(
          "UPDATE session_metadata SET ended_at_unix_ms = ?, invitation_open = 0 WHERE singleton = 1",
          nowUnixMs,
        );
        this.sql.exec(
          "UPDATE endpoint_authorities SET revoked_at_unix_ms = ? WHERE revoked_at_unix_ms IS NULL",
          nowUnixMs,
        );
      }
      return { state: "retained", nextAlarmUnixMs: Number(metadata.delete_at_unix_ms) };
    });
  }

  sessionMetadata() {
    return Array.from(this.sql.exec("SELECT * FROM session_metadata WHERE singleton = 1"))[0] ?? null;
  }

  currentSequence() {
    const row = Array.from(
      this.sql.exec("SELECT COALESCE(MAX(sequence_number), 0) AS sequence FROM session_journal"),
    )[0];
    return Number(row.sequence);
  }

  insertJournalEntry(entry) {
    this.sql.exec(
      `INSERT INTO session_journal (
         sequence_number, scenario_id, scenario_version, event_version,
         timestamp_unix_ms, event_json
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      entry.sequence_number,
      entry.scenario_id,
      entry.scenario_version,
      entry.event_version,
      entry.timestamp_unix_ms,
      JSON.stringify(entry.event),
    );
  }

  consumeAdmissionAttempt(nowUnixMs, rateWindowMs, maximumAttemptsPerWindow) {
    const row = Array.from(
      this.sql.exec("SELECT * FROM admission_rate_limit WHERE singleton = 1"),
    )[0];
    if (!row || nowUnixMs - Number(row.window_started_at_unix_ms) >= rateWindowMs) {
      this.sql.exec(
        `INSERT INTO admission_rate_limit (singleton, window_started_at_unix_ms, attempt_count)
         VALUES (1, ?, 1)
         ON CONFLICT(singleton) DO UPDATE SET
           window_started_at_unix_ms = excluded.window_started_at_unix_ms,
           attempt_count = 1`,
        nowUnixMs,
      );
      return true;
    }
    const nextCount = Number(row.attempt_count) + 1;
    this.sql.exec(
      "UPDATE admission_rate_limit SET attempt_count = ? WHERE singleton = 1",
      nextCount,
    );
    return nextCount <= maximumAttemptsPerWindow;
  }

  async loadJournal() {
    const rows = Array.from(
      this.sql.exec(`
        SELECT sequence_number, scenario_id, scenario_version, event_version,
               timestamp_unix_ms, event_json
        FROM session_journal
        ORDER BY sequence_number ASC
      `),
    );
    return rows.map((row) => ({
      scenario_id: row.scenario_id,
      scenario_version: Number(row.scenario_version),
      event_version: Number(row.event_version),
      sequence_number: Number(row.sequence_number),
      timestamp_unix_ms: Number(row.timestamp_unix_ms),
      event: JSON.parse(row.event_json),
    }));
  }

  async getIdempotency(endpointId, idempotencyId) {
    const rows = Array.from(
      this.sql.exec(
        `SELECT fingerprint, result_json
         FROM command_idempotency
         WHERE endpoint_id = ? AND idempotency_id = ?`,
        endpointId,
        idempotencyId,
      ),
    );
    const row = rows[0];
    return row
      ? { fingerprint: row.fingerprint, result: JSON.parse(row.result_json) }
      : null;
  }

  async appendCommand({
    entry,
    endpointId,
    idempotencyId,
    fingerprint,
    result,
    maximumRecordsPerEndpoint,
    assertCommitAllowed,
  }) {
    this.storage.transactionSync(() => {
      // This second authority check shares the transaction boundary with the
      // append, preventing revocation, end, or expiry from winning between a
      // request-level check and canonical mutation.
      assertCommitAllowed();
      this.insertJournalEntry(entry);
      this.sql.exec(
        `INSERT INTO command_idempotency (
           endpoint_id, idempotency_id, fingerprint, result_json, sequence_number
         ) VALUES (?, ?, ?, ?, ?)`,
        endpointId,
        idempotencyId,
        fingerprint,
        JSON.stringify(result),
        entry.sequence_number,
      );
      this.sql.exec(
        `DELETE FROM command_idempotency
         WHERE endpoint_id = ? AND idempotency_id IN (
           SELECT idempotency_id
           FROM command_idempotency
           WHERE endpoint_id = ?
           ORDER BY sequence_number DESC
           LIMIT -1 OFFSET ?
         )`,
        endpointId,
        endpointId,
        maximumRecordsPerEndpoint,
      );
    });
  }
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
