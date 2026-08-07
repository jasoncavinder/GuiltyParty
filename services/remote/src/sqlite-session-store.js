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
    `);
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
  }) {
    this.storage.transactionSync(() => {
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
