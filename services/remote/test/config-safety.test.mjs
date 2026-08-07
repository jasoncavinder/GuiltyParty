import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("committed Wrangler configuration cannot deploy to an account or public route", async () => {
  const source = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const configuration = JSON.parse(source);

  assert.equal(configuration.workers_dev, false);
  assert.equal(configuration.send_metrics, false);
  assert.equal(configuration.dependencies_instrumentation.enabled, false);
  assert.equal(configuration.observability.enabled, false);
  assert.equal(configuration.exports.GameSession.type, "durable-object");
  assert.equal(configuration.exports.GameSession.storage, "sqlite");
  assert.equal(configuration.account_id, undefined);
  assert.equal(configuration.route, undefined);
  assert.equal(configuration.routes, undefined);
  assert.equal(configuration.database_id, undefined);
  assert.equal(configuration.bucket_name, undefined);
  assert.doesNotMatch(source, /(api[_-]?token|secret|password)\s*[":=]/i);
});
