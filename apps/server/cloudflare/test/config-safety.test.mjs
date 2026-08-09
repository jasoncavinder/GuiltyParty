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
  assert.equal(
    configuration.vars.ALLOWED_ORIGINS,
    "https://host.test.guiltyparty.app,https://play.test.guiltyparty.app",
  );
  assert.deepEqual(configuration.ratelimits, [
    {
      name: "SESSION_CREATE_RATE_LIMITER",
      namespace_id: "1001",
      simple: { limit: 10, period: 60 },
    },
    {
      name: "SESSION_JOIN_RATE_LIMITER",
      namespace_id: "1002",
      simple: { limit: 60, period: 60 },
    },
    {
      name: "STAGE_PAIRING_RATE_LIMITER",
      namespace_id: "1003",
      simple: { limit: 120, period: 60 },
    },
  ]);
  assert.equal(configuration.exports.GameSession.type, "durable-object");
  assert.equal(configuration.exports.GameSession.storage, "sqlite");
  assert.equal(configuration.exports.StagePairing.type, "durable-object");
  assert.equal(configuration.exports.StagePairing.storage, "sqlite");
  assert.deepEqual(configuration.durable_objects.bindings, [
    { name: "GAME_SESSIONS", class_name: "GameSession" },
    { name: "STAGE_PAIRINGS", class_name: "StagePairing" },
  ]);
  assert.equal(configuration.account_id, undefined);
  assert.equal(configuration.route, undefined);
  assert.deepEqual(configuration.routes, [
    {
      pattern: "api.test.guiltyparty.app",
      custom_domain: true,
    },
  ]);
  assert.equal(configuration.database_id, undefined);
  assert.equal(configuration.bucket_name, undefined);
  assert.equal(configuration.vars.AUTHORITY_SIGNING_KEY, undefined);
  assert.equal(configuration.vars.HOST_BOOTSTRAP_TOKEN_SHA256, undefined);
  assert.doesNotMatch(source, /(api[_-]?token|secret|password)\s*[":=]/i);
});

test("CI gates remote-only changes with the pinned Node runtime and offline checks", async () => {
  const workflow = await readFile(
    new URL("../../../../.github/workflows/rust.yml", import.meta.url),
    "utf8",
  );

  assert.equal(workflow.match(/- "apps\/server\/\*\*"/g)?.length, 2);
  assert.match(
    workflow,
    /actions\/setup-node@820762786026740c76f36085b0efc47a31fe5020/,
  );
  assert.match(workflow, /node-version: "22"/);
  assert.match(workflow, /run: make test-remote/);
  assert.match(workflow, /run: make check-cloudflare/);
});

test("participant admission schedules a fresh projection for connected endpoints", async () => {
  const source = await readFile(
    new URL("../src/game-session.js", import.meta.url),
    "utf8",
  );
  const joinStart = source.indexOf("async joinSession(request)");
  const notify = source.indexOf(
    "this.ctx.waitUntil(this.broadcastProjections());",
    joinStart,
  );
  const response = source.indexOf("return internalJson({", notify);

  assert.notEqual(joinStart, -1);
  assert.notEqual(notify, -1);
  assert.notEqual(response, -1);
  assert.ok(joinStart < notify && notify < response);
});
