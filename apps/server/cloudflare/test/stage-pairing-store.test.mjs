import assert from "node:assert/strict";
import test from "node:test";

import { StagePairingStore } from "../src/stage-pairing-store.js";

test("unknown Stage pairing lookups do not initialize SQLite storage", () => {
  const statements = [];
  const storage = {
    sql: {
      exec(statement) {
        statements.push(statement);
        return [];
      },
    },
  };

  const store = new StagePairingStore(storage);
  assert.equal(store.current(), null);
  assert.equal(statements.length, 1);
  assert.match(statements[0], /FROM sqlite_schema/u);
  assert.doesNotMatch(statements[0], /CREATE|INSERT|UPDATE|DELETE/u);
});

test("Stage pairing expiry leaves storage fully deallocated", async () => {
  let deletions = 0;
  const storage = {
    sql: {
      exec() {
        throw new Error("expiry must not recreate the schema");
      },
    },
    async deleteAll() {
      deletions += 1;
    },
  };

  const store = new StagePairingStore(storage);
  await store.deleteAll();
  assert.equal(deletions, 1);
});
