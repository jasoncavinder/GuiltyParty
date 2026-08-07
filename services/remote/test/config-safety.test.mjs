import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("development Wrangler configuration is narrowly scoped and contains no account identifiers", async () => {
  const source = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const configuration = JSON.parse(source);

  assert.equal(configuration.name, "guilty-party-remote-dev");
  assert.equal(configuration.workers_dev, true);
  assert.equal(configuration.preview_urls, false);
  assert.equal(configuration.send_metrics, false);
  assert.equal(configuration.dependencies_instrumentation.enabled, false);
  assert.equal(configuration.observability.enabled, false);
  assert.equal(configuration.vars.ENVIRONMENT_PROFILE, "friends-mvp-development");
  assert.equal(configuration.exports.GameSession.type, "durable-object");
  assert.equal(configuration.exports.GameSession.storage, "sqlite");
  assert.equal(configuration.account_id, undefined);
  assert.equal(configuration.route, undefined);
  assert.equal(configuration.routes, undefined);
  assert.equal(configuration.database_id, undefined);
  assert.equal(configuration.bucket_name, undefined);
  assert.equal(configuration.vars.AUTHORITY_SIGNING_KEY, undefined);
  assert.equal(configuration.vars.HOST_BOOTSTRAP_TOKEN_SHA256, undefined);
  assert.doesNotMatch(source, /(api[_-]?token|secret|password)\s*[":=]/i);
});

test("CI gates remote-only changes with the pinned Node runtime and offline checks", async () => {
  const workflow = await readFile(
    new URL("../../../.github/workflows/rust.yml", import.meta.url),
    "utf8",
  );

  assert.equal(workflow.match(/- "services\/remote\/\*\*"/g)?.length, 2);
  assert.match(
    workflow,
    /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/,
  );
  assert.match(workflow, /node-version: "22"/);
  assert.match(workflow, /run: make test-remote/);
  assert.match(workflow, /run: make check-cloudflare/);
});
