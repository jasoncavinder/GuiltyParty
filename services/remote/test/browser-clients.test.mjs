import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import {
  COMPANION_BUILD,
  ControlConnection,
  DEFAULT_API_ORIGIN,
  HOST_BUILD,
  decodeInvitationTransfer,
  normalizeApiOrigin,
} from "../../../apps/web/shared/control-client.js";
import { privateViewShouldBeHidden } from "../../../apps/web/companion/private-view.js";
import { encodeInvitationTransfer } from "../src/invitation-transfer.js";

const execFileAsync = promisify(execFile);
const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("browser client configuration is pinned to approved MVP origins and builds", () => {
  assert.equal(DEFAULT_API_ORIGIN, "https://api.test.guiltyparty.app");
  assert.deepEqual(HOST_BUILD, { application_id: "host_web", application_version: "0.1.0", build_number: 1 });
  assert.deepEqual(COMPANION_BUILD, { application_id: "companion_web", application_version: "0.1.0", build_number: 1 });
  assert.equal(normalizeApiOrigin("https://api.test.guiltyparty.app"), DEFAULT_API_ORIGIN);
  assert.equal(normalizeApiOrigin("http://127.0.0.1:8787"), "http://127.0.0.1:8787");
  assert.throws(() => normalizeApiOrigin("http://api.test.guiltyparty.app"), TypeError);
  assert.throws(() => normalizeApiOrigin("javascript:alert(1)"), TypeError);
});

test("browser invitation decoder interoperates with the server encoder", () => {
  const payload = encodeInvitationTransfer({
    sessionId: "ses_0123456789abcdef",
    pairingCode: "synthetic-pairing-proof",
    expiresAtUnixMs: 2_000_000_000_000,
    gameplayLanguage: "fr-CA",
  });
  assert.deepEqual(decodeInvitationTransfer(payload), {
    version: "1",
    session_id: "ses_0123456789abcdef",
    pairing_code: "synthetic-pairing-proof",
    expires_at_unix_ms: 2_000_000_000_000,
    gameplay_language: "fr-CA",
  });
  assert.throws(() => decodeInvitationTransfer("https://example.test/join"), TypeError);
});

test("browser connection ignores stale socket events after a lifecycle restart", () => {
  const originalWebSocket = globalThis.WebSocket;
  class FakeWebSocket {
    static OPEN = 1;
    static instances = [];

    constructor() {
      this.readyState = 0;
      this.listeners = new Map();
      FakeWebSocket.instances.push(this);
    }

    addEventListener(type, listener) {
      this.listeners.set(type, listener);
    }

    close() {}

    emit(type, event = {}) {
      this.listeners.get(type)?.(event);
    }
  }

  globalThis.WebSocket = FakeWebSocket;
  try {
    let terminalCount = 0;
    const statuses = [];
    const connection = new ControlConnection({
      apiOrigin: DEFAULT_API_ORIGIN,
      context: { session_id: "ses_synthetic", endpoint_id: "end_synthetic" },
      onProjection() {},
      onStatus(status) { statuses.push(status); },
      onProblem() {},
      onTerminal() { terminalCount += 1; },
    });

    connection.start();
    const staleSocket = FakeWebSocket.instances[0];
    connection.stop();
    connection.start();
    const activeSocket = FakeWebSocket.instances[1];
    staleSocket.emit("error");
    staleSocket.emit("close", { code: 1000 });

    assert.equal(terminalCount, 0);
    assert.equal(connection.stopped, false);
    assert.equal(connection.socket, activeSocket);
    assert.equal(statuses.at(-1), "connecting");
    connection.stop();
  } finally {
    globalThis.WebSocket = originalWebSocket;
  }
});

test("private view remains covered until the player explicitly reveals it", () => {
  assert.equal(
    privateViewShouldBeHidden({ contextActive: true, documentHidden: false, manuallyHidden: true }),
    true,
  );
  assert.equal(
    privateViewShouldBeHidden({ contextActive: true, documentHidden: true, manuallyHidden: false }),
    true,
  );
  assert.equal(
    privateViewShouldBeHidden({ contextActive: true, documentHidden: false, manuallyHidden: false }),
    false,
  );
  assert.equal(
    privateViewShouldBeHidden({ contextActive: false, documentHidden: true, manuallyHidden: true }),
    false,
  );
});

test("browser client sources avoid persistent storage, URL credentials, and third-party assets", async () => {
  const files = [
    "apps/web/shared/control-client.js",
    "apps/web/host/index.html",
    "apps/web/host/app.js",
    "apps/web/companion/index.html",
    "apps/web/companion/app.js",
    "apps/web/companion/private-view.js",
  ];
  const sources = await Promise.all(files.map((file) => readFile(path.join(repository, file), "utf8")));
  const combined = sources.join("\n");
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "?token=", "searchParams.set(\"token\""]) {
    assert.equal(combined.includes(forbidden), false, `found forbidden client pattern ${forbidden}`);
  }
  for (const html of [sources[1], sources[3]]) {
    assert.equal(/<(?:script|link)[^>]+https?:\/\//u.test(html), false);
    assert.match(html, /Content-Security-Policy/u);
    assert.match(html, /no-referrer/u);
    assert.match(html, /noindex, nofollow/u);
  }
});

test("Host session end uses an accessible in-page confirmation", async () => {
  const [html, application] = await Promise.all([
    readFile(path.join(repository, "apps/web/host/index.html"), "utf8"),
    readFile(path.join(repository, "apps/web/host/app.js"), "utf8"),
  ]);

  assert.match(html, /<dialog id="end-session-dialog"[^>]+aria-labelledby="end-session-title"[^>]+aria-describedby="end-session-description">/u);
  assert.match(html, /id="cancel-end-session"[^>]+type="button"/u);
  assert.match(html, /id="confirm-end-session"[^>]+type="submit"/u);
  assert.match(application, /endSessionDialog\.showModal\(\)/u);
  assert.match(application, /if \(endingSession\) event\.preventDefault\(\)/u);
  assert.match(application, /if \(endSessionDialog\.open\) endSessionDialog\.close\(\)/u);
  assert.equal(/\bconfirm\s*\(/u.test(application), false, "browser-native confirmation can be invisible in embedded browser surfaces");
});

test("browser client build produces isolated Cloudflare Pages artifacts", async () => {
  await execFileAsync(process.execPath, ["tooling/build_remote_clients.mjs"], { cwd: repository });
  for (const surface of ["host", "play"]) {
    const directory = path.join(repository, ".tmp", "remote-clients", surface);
    const expectedFiles = ["index.html", "app.js", "styles.css", "control-client.js", "_headers", "robots.txt"];
    if (surface === "play") expectedFiles.push("private-view.js");
    for (const file of expectedFiles) {
      assert.ok((await readFile(path.join(directory, file), "utf8")).length > 0, `${surface}/${file}`);
    }
  }
});
