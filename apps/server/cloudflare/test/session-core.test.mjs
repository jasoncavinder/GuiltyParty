import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson, SessionCore, SessionFault } from "../src/session-core.js";
import { MemorySessionStore } from "./memory-session-store.mjs";

function createCore(store = new MemorySessionStore()) {
  return new SessionCore({
    scenarioId: "synthetic-scenario",
    scenarioVersion: 1,
    store,
  });
}

test("canonical command fingerprints ignore object key order", () => {
  assert.equal(
    canonicalJson({ type: "advance_scene", scene_id: "scene-1" }),
    canonicalJson({ scene_id: "scene-1", type: "advance_scene" }),
  );
});

test("replay requires a continuous journal for the pinned scenario", async () => {
  const store = new MemorySessionStore([
    {
      scenario_id: "synthetic-scenario",
      scenario_version: 1,
      event_version: 1,
      sequence_number: 2,
      timestamp_unix_ms: 0,
      event: { type: "voting_opened" },
    },
  ]);
  const core = createCore(store);

  await assert.rejects(
    () => core.load(async () => {}),
    (error) => error instanceof SessionFault && error.code === "journal_replay_failed",
  );
});

test("identical retry returns the stored result without a second event", async () => {
  const store = new MemorySessionStore();
  const core = createCore(store);
  await core.load(async () => {});
  let engineCalls = 0;
  const submission = {
    endpointId: "host-endpoint",
    idempotencyId: "command-1",
    command: { type: "advance_scene", scene_id: "scene-1" },
    createEvent: async () => {
      engineCalls += 1;
      return { type: "scene_advanced", scene_id: "scene-1" };
    },
    timestampUnixMs: 10,
  };

  const first = await core.commitCommand(submission);
  const duplicate = await core.commitCommand({
    ...submission,
    command: { scene_id: "scene-1", type: "advance_scene" },
  });

  assert.deepEqual(first, { status: "accepted", server_sequence: 1, duplicate: false });
  assert.deepEqual(duplicate, { status: "accepted", server_sequence: 1, duplicate: true });
  assert.equal(store.entries.length, 1);
  assert.equal(engineCalls, 1);
});

test("conflicting idempotency reuse fails closed", async () => {
  const store = new MemorySessionStore();
  const core = createCore(store);
  await core.load(async () => {});
  await core.commitCommand({
    endpointId: "host-endpoint",
    idempotencyId: "command-1",
    command: { type: "advance_scene", scene_id: "scene-1" },
    createEvent: async (command) => ({ type: "scene_advanced", scene_id: command.scene_id }),
  });

  await assert.rejects(
    () =>
      core.commitCommand({
        endpointId: "host-endpoint",
        idempotencyId: "command-1",
        command: { type: "advance_scene", scene_id: "scene-2" },
        createEvent: async () => ({ type: "scene_advanced", scene_id: "scene-2" }),
      }),
    (error) => error instanceof SessionFault && error.code === "idempotency_conflict",
  );
  assert.equal(store.entries.length, 1);
});

test("sequence advances only after the journal and idempotency commit succeeds", async () => {
  const store = new MemorySessionStore();
  const core = createCore(store);
  await core.load(async () => {});
  store.failNextAppend = true;

  await assert.rejects(() =>
    core.commitCommand({
      endpointId: "host-endpoint",
      idempotencyId: "command-1",
      command: { type: "open_voting" },
      createEvent: async () => ({ type: "voting_opened" }),
    }),
  );
  assert.equal(core.sequence, 0);
  assert.equal(store.entries.length, 0);

  const accepted = await core.commitCommand({
    endpointId: "host-endpoint",
    idempotencyId: "command-1",
    command: { type: "open_voting" },
    createEvent: async () => ({ type: "voting_opened" }),
  });
  assert.equal(accepted.server_sequence, 1);
});

test("authority is rechecked inside the append boundary after event creation", async () => {
  const store = new MemorySessionStore();
  const core = createCore(store);
  await core.load(async () => {});
  let authorityValid = true;
  let guardCalls = 0;

  await assert.rejects(
    () =>
      core.commitCommand({
        endpointId: "participant-endpoint",
        idempotencyId: "command-after-revocation",
        command: { type: "cast_vote", target_character_id: "character-1" },
        createEvent: async () => {
          authorityValid = false;
          return {
            type: "vote_cast",
            participant_id: "participant-1",
            target_character_id: "character-1",
          };
        },
        assertCommitAllowed: () => {
          guardCalls += 1;
          if (!authorityValid) {
            throw new SessionFault("invalid_authority", "Authority no longer valid");
          }
        },
      }),
    (error) => error instanceof SessionFault && error.code === "invalid_authority",
  );

  assert.equal(guardCalls, 2);
  assert.equal(store.entries.length, 0);
  assert.equal(await store.getIdempotency("participant-endpoint", "command-after-revocation"), null);
});

test("concurrent command deliveries are serialized before sequence assignment", async () => {
  const store = new MemorySessionStore();
  const core = createCore(store);
  await core.load(async () => {});
  let releaseFirst;
  const firstCanFinish = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  const first = core.commitCommand({
    endpointId: "host-endpoint",
    idempotencyId: "command-1",
    command: { type: "synthetic", index: 1 },
    createEvent: async () => {
      await firstCanFinish;
      return { type: "synthetic", index: 1 };
    },
  });
  const second = core.commitCommand({
    endpointId: "host-endpoint",
    idempotencyId: "command-2",
    command: { type: "synthetic", index: 2 },
    createEvent: async () => ({ type: "synthetic", index: 2 }),
  });

  await Promise.resolve();
  releaseFirst();
  assert.deepEqual(
    await Promise.all([first, second]),
    [
      { status: "accepted", server_sequence: 1, duplicate: false },
      { status: "accepted", server_sequence: 2, duplicate: false },
    ],
  );
  assert.deepEqual(
    store.entries.map((entry) => entry.sequence_number),
    [1, 2],
  );
});

test("idempotency records are endpoint-scoped and bounded", async () => {
  const store = new MemorySessionStore();
  const core = createCore(store);
  await core.load(async () => {});

  for (let index = 0; index <= 256; index += 1) {
    await core.commitCommand({
      endpointId: "host-endpoint",
      idempotencyId: `command-${index}`,
      command: { type: "synthetic", index },
      createEvent: async () => ({ type: "synthetic", index }),
      timestampUnixMs: index,
    });
  }

  assert.equal(await store.getIdempotency("host-endpoint", "command-0"), null);
  assert.notEqual(await store.getIdempotency("host-endpoint", "command-256"), null);
  assert.equal(await store.getIdempotency("another-endpoint", "command-256"), null);
});
