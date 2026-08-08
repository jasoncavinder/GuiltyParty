import assert from "node:assert/strict";
import test from "node:test";

import { fanOutWebSockets } from "../src/websocket-fanout.js";

test("an unwritable socket cannot prevent projection delivery to later endpoints", async () => {
  const closed = [];
  const delivered = [];
  const sockets = [
    { id: "stale", close: (code, reason) => closed.push({ code, reason }) },
    { id: "stage", close: () => assert.fail("the writable Stage must remain open") },
    { id: "participant", close: () => assert.fail("the writable participant must remain open") },
  ];

  await fanOutWebSockets(sockets, async (socket) => {
    if (socket.id === "stale") throw new Error("synthetic closed socket");
    delivered.push(socket.id);
  });

  assert.deepEqual(delivered, ["stage", "participant"]);
  assert.deepEqual(closed, [{ code: 1011, reason: "Projection delivery failed" }]);
});

test("a socket that also rejects closure cannot terminate bounded fan-out", async () => {
  const delivered = [];
  const sockets = [
    { id: "gone", close: () => { throw new Error("already closed"); } },
    { id: "host", close: () => assert.fail("the writable Host must remain open") },
  ];

  await fanOutWebSockets(sockets, async (socket) => {
    if (socket.id === "gone") throw new Error("synthetic send failure");
    delivered.push(socket.id);
  });

  assert.deepEqual(delivered, ["host"]);
});
