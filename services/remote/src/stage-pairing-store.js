export class StagePairingStore {
  constructor(storage) {
    this.storage = storage;
    this.sql = storage.sql;
  }

  initializeSchema() {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS stage_pairing (
        singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
        transaction_id TEXT NOT NULL UNIQUE,
        polling_digest TEXT NOT NULL,
        endpoint_json TEXT NOT NULL,
        created_at_unix_ms INTEGER NOT NULL,
        expires_at_unix_ms INTEGER NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        approved_session_id TEXT,
        approved_host_endpoint_id TEXT,
        approved_at_unix_ms INTEGER
      )
    `);
  }

  current() {
    const schema = Array.from(
      this.sql.exec(
        "SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'stage_pairing'",
      ),
    )[0];
    if (!schema) {
      return null;
    }
    return Array.from(
      this.sql.exec("SELECT * FROM stage_pairing WHERE singleton = 1"),
    )[0] ?? null;
  }

  deleteAll() {
    return this.storage.deleteAll();
  }
}
