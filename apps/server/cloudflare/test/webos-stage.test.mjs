import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { validateAssetBytes, validatedPng, validatedWav } from "../../../../tooling/build_webos_stage.mjs";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const stageDirectory = path.join(repository, "apps/tv/lg-webos");
const packagedStageDirectory = path.join(repository, ".tmp/lg-webos-stage-app");
const execFileAsync = promisify(execFile);
const coreSource = await readFile(path.join(stageDirectory, "stage-core.js"), "utf8");
const mediaSource = await readFile(path.join(stageDirectory, "stage-media.js"), "utf8");
const context = vm.createContext({});
vm.runInContext(coreSource, context, { filename: "stage-core.js" });
vm.runInContext(mediaSource, context, { filename: "stage-media.js" });
const core = context.GuiltyPartyStageCore;
const { StageMediaController } = context.GuiltyPartyStageMedia;
const publicEnvelope = JSON.parse(
  await readFile(path.join(repository, "tests/contracts/v1/privacy/stage-projection.json"), "utf8"),
);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("packaged Stage metadata is pinned to the approved development build", async () => {
  const appinfo = JSON.parse(await readFile(path.join(stageDirectory, "appinfo.json"), "utf8"));
  assert.equal(appinfo.id, "com.guiltyparty.stage");
  assert.equal(appinfo.version, "0.2.0");
  assert.equal(appinfo.type, "web");
  assert.equal(appinfo.main, "index.html");
  assert.equal(appinfo.icon, "icon.png");
  assert.deepEqual(plain(core.STAGE_BUILD), {
    application_id: "stage_webos",
    application_version: "0.2.0",
    build_number: 3,
  });
  assert.equal(core.API_ORIGIN, "https://api.test.guiltyparty.app");
  assert.equal(core.CONTROL_SUBPROTOCOL, "guiltyparty.control.v1");
});

test("packaged shell deliberately creates a null-Origin sandbox boundary", async () => {
  const shell = await readFile(path.join(stageDirectory, "index.html"), "utf8");
  const shellScript = await readFile(path.join(stageDirectory, "shell.js"), "utf8");
  const stage = await readFile(path.join(stageDirectory, "stage.html"), "utf8");
  assert.match(shell, /sandbox="allow-scripts"/u);
  assert.doesNotMatch(shell, /allow-same-origin/u);
  assert.match(shellScript, /event\.source === frame\.contentWindow/u);
  assert.match(shellScript, /event\.data === "guiltyparty\.stage\.exit"/u);
  assert.match(stage, /connect-src https:\/\/api\.test\.guiltyparty\.app wss:\/\/api\.test\.guiltyparty\.app/u);
});

test("physical-compatible package inlines only first-party runtime assets", async () => {
  await execFileAsync(process.execPath, [path.join(repository, "tooling/build_webos_stage.mjs")], {
    cwd: repository,
  });
  const packagedFiles = (await readdir(packagedStageDirectory)).sort();
  const packagedShell = await readFile(path.join(packagedStageDirectory, "index.html"), "utf8");
  const packagedStage = await readFile(path.join(packagedStageDirectory, "stage.html"), "utf8");

  assert.deepEqual(packagedFiles, ["appinfo.json", "icon.png", "index.html", "stage.html"]);
  assert.match(packagedShell, /sandbox="allow-scripts"/u);
  assert.doesNotMatch(packagedShell, /allow-same-origin/u);
  assert.doesNotMatch(packagedShell, /<(?:link|script)[^>]+(?:href|src)=/u);
  assert.match(packagedStage, /default-src 'none'/u);
  assert.match(packagedStage, /connect-src https:\/\/api\.test\.guiltyparty\.app wss:\/\/api\.test\.guiltyparty\.app/u);
  assert.match(packagedStage, /img-src data:; media-src data:/u);
  assert.doesNotMatch(packagedStage, /<(?:link|script)[^>]+(?:href|src)=/u);
  assert.equal(packagedStage.match(/data:image\/png;base64,/gu)?.length, 1);
  assert.equal(packagedStage.match(/data:audio\/wav;base64,/gu)?.length, 1);
  assert.doesNotMatch(packagedStage, /(?:blob:|https?:\/\/[^'"\s]*\.(?:png|wav|mp3|m4a))/u);
  assert.ok((await stat(path.join(packagedStageDirectory, "stage.html"))).size < 8 * 1024 * 1024);
  assert.doesNotMatch(packagedShell + packagedStage, /(?:localStorage|sessionStorage|indexedDB|XMLHttpRequest)/u);
});

test("the packaged registry contains only the owner-approved digest-matched media", async () => {
  const assetDirectory = path.join(stageDirectory, "assets/presentation");
  const files = (await readdir(assetDirectory)).sort();
  assert.deepEqual(files, [
    "stage-discovery-cinematic-gallery-1920x1080.png",
    "stage-discovery-cinematic-vault.wav",
  ]);
  const expected = new Map([
    [files[0], "08b8670b046f7e9c271e641e31dbdea556ecd556024b4b13ee515d1c9ba278db"],
    [files[1], "3187fe4ba7769021bcbf0919adf4a8ac6089e510b274783dfcc357ded02ebe98"],
  ]);
  for (const [file, digest] of expected) {
    const bytes = await readFile(path.join(assetDirectory, file));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), digest);
  }
  const registry = JSON.parse(await readFile(path.join(stageDirectory, "presentation-assets.json"), "utf8"));
  assert.deepEqual(registry.assets.map((asset) => asset.sha256), [...expected.values()]);
  const manifest = JSON.parse(await readFile(
    path.join(repository, "apps/server/scenarios/the-stolen-artifact-v2.presentation.json"),
    "utf8",
  ));
  assert.equal(registry.manifest_revision, manifest.revision);
  const manifestAssets = [...manifest.assets.images, ...manifest.assets.audio]
    .map(({ id, sha256 }) => ({ id, sha256 }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const packagedAssets = registry.assets
    .map(({ id, sha256 }) => ({ id, sha256 }))
    .sort((left, right) => left.id.localeCompare(right.id));
  assert.deepEqual(packagedAssets, manifestAssets);
});

test("the Stage build fails closed on corrupt, mismatched, or oversized media", async () => {
  const assetDirectory = path.join(stageDirectory, "assets/presentation");
  const image = await readFile(path.join(assetDirectory, "stage-discovery-cinematic-gallery-1920x1080.png"));
  const audio = await readFile(path.join(assetDirectory, "stage-discovery-cinematic-vault.wav"));
  assert.throws(() => validatedPng(Buffer.from("not a png")), /1920-by-1080 PNG/u);
  assert.throws(() => validatedWav(Buffer.from("not a wav")), /RIFF\/WAVE/u);
  assert.throws(() => validateAssetBytes({
    id: "synthetic",
    kind: "image",
    mime_type: "image/png",
    sha256: "0".repeat(64),
    maximum_bytes: image.length,
  }, image), /digest mismatch/u);
  assert.throws(() => validateAssetBytes({
    id: "synthetic",
    kind: "audio",
    mime_type: "audio/wav",
    sha256: createHash("sha256").update(audio).digest("hex"),
    maximum_bytes: audio.length - 1,
  }, audio), /exceeds its bound/u);
});

test("pending pairing accepts only context-free response state", () => {
  const now = 1_999_999_990_000;
  const pending = {
    protocol_version: "1.0",
    status: "pending",
    expires_at_unix_ms: 2_000_000_000_000,
    retry_after_ms: 1500,
  };
  assert.equal(core.validatePending(pending, now).status, "pending");
  for (const field of [
    "session_id",
    "endpoint_id",
    "participant_id",
    "scenario_title",
    "authority_transport",
    "token",
  ]) {
    assert.throws(() => core.validatePending({ ...pending, [field]: "forbidden" }, now));
  }
  assert.throws(() => core.validatePending({ ...pending, expires_at_unix_ms: now }, now));
});

test("pairing creation enforces the 120-second transaction and matching redeem route", () => {
  const now = 2_000_000_000_000;
  const response = {
    protocol_version: "1.0",
    pairing_code: "ABCD-EFGH",
    polling_secret: "synthetic-polling-secret-0123456789",
    redeem_path: "/api/v1/stage-pairings/ABCD-EFGH/redeem",
    expires_at_unix_ms: now + 120_000,
    poll_after_ms: 1500,
  };
  assert.equal(core.validatePairingCreate(response, now).pairing_code, "ABCD-EFGH");
  assert.throws(() => core.validatePairingCreate({ ...response, expires_at_unix_ms: now + 126_000 }, now));
  assert.throws(() => core.validatePairingCreate({ ...response, redeem_path: "/api/v1/join" }, now));
});

test("deallocated and expired pairing responses render as code expiry", async () => {
  const stageScript = await readFile(path.join(stageDirectory, "stage.js"), "utf8");
  assert.match(stageScript, /error\.status === 404 \|\| error\.status === 410/u);
  assert.match(stageScript, /expirePairing\(\)/u);
});

test("duplicate heartbeat projections cannot restart atmosphere playback", async () => {
  const stageScript = await readFile(path.join(stageDirectory, "stage.js"), "utf8");
  assert.match(stageScript, /if \(sequenceResult === "duplicate"\) \{\s*if \(mediaResumePending\)/u);
  assert.doesNotMatch(stageScript, /if \(sequenceResult === "duplicate"\) \{\s*media\.resume\(\);/u);
  assert.match(stageScript, /function suspendMedia\(\) \{\s*mediaResumePending = true;\s*media\.suspend\(\);/u);
});

test("successful Stage approval clears the consumed pairing code", async () => {
  const stageScript = await readFile(path.join(stageDirectory, "stage.js"), "utf8");
  const elements = new Map();
  const timeouts = [];
  const now = Date.now();
  const responses = [
    {
      status: 200,
      body: {
        preferred_protocol_version: "1.0",
        required_upgrade: false,
        supported_protocol_majors: [1],
        features: ["stage_presentation_media_v1"],
      },
    },
    {
      status: 201,
      body: {
        protocol_version: "1.0",
        pairing_code: "ABCD-EFGH",
        polling_secret: "synthetic-polling-secret-0123456789",
        redeem_path: "/api/v1/stage-pairings/ABCD-EFGH/redeem",
        expires_at_unix_ms: now + 120_000,
        poll_after_ms: 500,
      },
    },
    {
      status: 200,
      body: {
        protocol_version: "1.0",
        token: "synthetic-stage-authority",
        session_id: "session-synthetic",
        endpoint_id: "endpoint-stage-synthetic",
        room_id: "room-synthetic",
        participant_id: null,
        authority_transport: "bearer",
        authority_expires_at_unix_ms: now + 3_600_000,
        primary_authority_generation: 1,
        websocket_transport: "ticket_subprotocol",
        websocket_ticket_endpoint: "/api/v1/websocket-tickets",
      },
    },
  ];

  function element(id) {
    if (!elements.has(id)) {
      elements.set(id, {
        addEventListener() {},
        appendChild() {},
        className: "",
        currentTime: 0,
        firstChild: null,
        focus() {},
        hidden: false,
        load() {},
        pause() {},
        play() { return Promise.resolve(); },
        removeAttribute(name) { delete this[name]; },
        setAttribute(name, value) { this[name] = value; },
        textContent: "",
      });
    }
    return elements.get(id);
  }

  const stageContext = vm.createContext({
    clearInterval() {},
    clearTimeout(timer) {
      if (timer) timer.cleared = true;
    },
    document: {
      activeElement: null,
      addEventListener() {},
      createElement: () => element("created"),
      getElementById: element,
      querySelectorAll: () => [],
      visibilityState: "visible",
    },
    fetch() {
      if (responses.length === 0) return new Promise(() => {});
      const response = responses.shift();
      return Promise.resolve({
        headers: { get: () => null },
        json: () => Promise.resolve(response.body),
        ok: true,
        status: response.status,
      });
    },
    navigator: { onLine: true },
    setInterval: () => ({ interval: true }),
    setTimeout(callback) {
      const timer = { callback, cleared: false };
      timeouts.push(timer);
      return timer;
    },
    WebSocket: { CONNECTING: 0, OPEN: 1 },
    window: {
      GuiltyPartyStageCore: core,
      GuiltyPartyStageMedia: { StageMediaController },
      addEventListener() {},
      parent: { postMessage() {} },
    },
  });

  vm.runInContext(stageScript, stageContext, { filename: "stage.js" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(element("pairing-code").textContent, "ABCD-EFGH");
  assert.equal(element("pairing-code").hidden, false);

  const pollTimer = timeouts.find((timer) => !timer.cleared);
  assert.ok(pollTimer);
  pollTimer.callback();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(element("pairing-code").textContent, "");
  assert.equal(element("pairing-code").hidden, true);
  assert.equal(element("pairing-expiry").textContent, "");
});

test("Stage projection is copied into a public-only retained shape", () => {
  const projection = core.sanitizeProjection(publicEnvelope.payload.projection);
  assert.deepEqual(Object.keys(plain(projection)).sort(), [
    "active_scene",
    "gameplay_language",
    "outcome",
    "participants",
    "revealed_clues",
    "scenario_id",
    "scenario_title",
    "scenario_version",
    "votes_cast",
    "voting_open",
  ]);
  assert.deepEqual(Object.keys(plain(projection.participants[0])).sort(), [
    "character_name",
    "name",
    "participant_id",
  ]);

  const additive = structuredClone(publicEnvelope.payload.projection);
  additive.future_public_field = "ignored";
  assert.equal("future_public_field" in core.sanitizeProjection(additive), false);
});

test("Stage retains only bounded logical presentation identifiers", () => {
  const withPresentation = structuredClone(publicEnvelope.payload.projection);
  withPresentation.active_scene.presentation = {
    manifest_revision: "the-stolen-artifact-v2-presentation-r1",
    audience: "public_stage",
    scene_image_id: "scene_image.discovery.cinematic_gallery.v1",
    atmosphere_audio_id: "atmosphere.discovery.cinematic_vault.v1",
    audio_behavior: "loop_while_scene_active",
    future_decoration: "ignored",
  };
  const sanitized = core.sanitizeProjection(withPresentation);
  assert.deepEqual(plain(sanitized.active_scene.presentation), {
    manifest_revision: "the-stolen-artifact-v2-presentation-r1",
    audience: "public_stage",
    scene_image_id: "scene_image.discovery.cinematic_gallery.v1",
    atmosphere_audio_id: "atmosphere.discovery.cinematic_vault.v1",
    audio_behavior: "loop_while_scene_active",
  });

  for (const forbidden of ["url", "uri", "path", "src", "source", "bytes", "data"]) {
    const unsafe = structuredClone(withPresentation);
    unsafe.active_scene.presentation[forbidden] = "https://untrusted.example/media";
    assert.equal(core.sanitizeProjection(unsafe).active_scene.presentation, undefined);
  }
  const privateProjection = structuredClone(withPresentation);
  privateProjection.private_objective = null;
  assert.throws(() => core.sanitizeProjection(privateProjection));
});

test("Stage media is muted by default and never overlaps an active cue", async () => {
  const listeners = new Map();
  const image = mediaElement();
  const audio = mediaElement();
  const soundButton = mediaElement();
  const statusElement = mediaElement();
  let playCount = 0;
  let pauseCount = 0;
  audio.play = () => {
    playCount += 1;
    return Promise.resolve();
  };
  audio.pause = () => { pauseCount += 1; };
  soundButton.addEventListener = (type, listener) => listeners.set(type, listener);
  const reports = [];
  const presentation = {
    manifest_revision: "the-stolen-artifact-v2-presentation-r1",
    audience: "public_stage",
    scene_image_id: "scene_image.discovery.cinematic_gallery.v1",
    atmosphere_audio_id: "atmosphere.discovery.cinematic_vault.v1",
    audio_behavior: "loop_while_scene_active",
  };
  const controller = new StageMediaController({
    registry: {
      manifest_revision: presentation.manifest_revision,
      assets: {
        [presentation.scene_image_id]: { kind: "image", source: "data:image/png;base64,synthetic" },
        [presentation.atmosphere_audio_id]: { kind: "audio", source: "data:audio/wav;base64,synthetic" },
      },
    },
    image,
    audio,
    soundButton,
    statusElement,
    matchMedia: () => ({ matches: true, addEventListener() {} }),
    onStatus: (status) => reports.push(plain(status)),
  });

  controller.apply(presentation);
  image.onload();
  assert.equal(controller.soundEnabled, false);
  assert.equal(playCount, 0);
  assert.equal(soundButton.textContent, "Enable atmosphere");
  listeners.get("click")();
  await Promise.resolve();
  assert.equal(playCount, 1);
  assert.equal(controller.atmosphereState, "playing");
  controller.apply(presentation);
  assert.equal(playCount, 1, "reapplying an identical projection must not start overlapping audio");
  controller.suspend();
  assert.equal(controller.atmosphereState, "stopped");
  assert.equal(audio.currentTime, 0);
  controller.terminate();
  assert.equal(controller.soundEnabled, false);
  assert.equal(image.src, undefined);
  assert.equal(audio.src, undefined);
  assert.ok(pauseCount >= 2);
  assert.ok(reports.every((status) => status.reduced_motion === true));
});

test("webOS WAV atmosphere keeps one seamless loop and disposes it synchronously on mute", async () => {
  const listeners = new Map();
  const image = mediaElement();
  const audio = mediaElement();
  const soundButton = mediaElement();
  const statusElement = mediaElement();
  const source = {
    connectCount: 0,
    disconnectCount: 0,
    startCount: 0,
    stopCount: 0,
    connect() { this.connectCount += 1; },
    disconnect() { this.disconnectCount += 1; },
    start() { this.startCount += 1; },
    stop() { this.stopCount += 1; },
  };
  const context = {
    closeCount: 0,
    suspendCount: 0,
    destination: {},
    close() { this.closeCount += 1; },
    createBufferSource() { return source; },
    decodeAudioData(_bytes, success) { success({ duration: 8 }); },
    suspend() { this.suspendCount += 1; return Promise.resolve(); },
  };
  let nativePlayCount = 0;
  audio.play = () => { nativePlayCount += 1; };
  soundButton.addEventListener = (type, listener) => listeners.set(type, listener);
  const presentation = {
    manifest_revision: "the-stolen-artifact-v2-presentation-r1",
    audience: "public_stage",
    scene_image_id: "scene_image.discovery.cinematic_gallery.v1",
    atmosphere_audio_id: "atmosphere.discovery.cinematic_vault.v1",
    audio_behavior: "loop_while_scene_active",
  };
  const controller = new StageMediaController({
    registry: {
      manifest_revision: presentation.manifest_revision,
      assets: {
        [presentation.scene_image_id]: { kind: "image", source: "data:image/png;base64,synthetic" },
        [presentation.atmosphere_audio_id]: { kind: "audio", source: "data:audio/wav;base64,c3ludGhldGlj" },
      },
    },
    image,
    audio,
    soundButton,
    statusElement,
    createAudioContext: () => context,
    decodeBase64: () => new Uint8Array([1, 2, 3, 4]),
  });

  controller.apply(presentation);
  listeners.get("click")();
  assert.equal(nativePlayCount, 0);
  assert.equal(source.loop, true);
  assert.equal(source.connectCount, 1);
  assert.equal(source.startCount, 1);
  assert.equal(controller.atmosphereState, "playing");
  controller.resume();
  assert.equal(source.startCount, 1, "resume must not create a second Web Audio loop");
  listeners.get("click")();
  assert.equal(context.suspendCount, 1);
  assert.equal(source.loop, false);
  assert.equal(source.stopCount, 1);
  assert.equal(source.disconnectCount, 1);
  assert.equal(context.closeCount, 1);
  assert.equal(controller.atmosphereState, "stopped");
});

test("Stage artwork backdrop is pinned to the viewport instead of the padded content shell", async () => {
  const [markup, styles] = await Promise.all([
    readFile(path.join(stageDirectory, "stage.html"), "utf8"),
    readFile(path.join(stageDirectory, "styles.css"), "utf8"),
  ]);
  assert.match(styles, /\.scene-media\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;/su);
  assert.match(markup, /<body>\s*<div class="scene-media"[^>]*>[\s\S]*?<main id="app" class="app-shell">/u);
  assert.doesNotMatch(markup, /<main id="app" class="app-shell">\s*<div class="scene-media"/u);
});

test("a late audio-play promise cannot restart status after suspension", async () => {
  const image = mediaElement();
  const audio = mediaElement();
  const soundButton = mediaElement();
  let enableSound;
  let completePlay;
  soundButton.addEventListener = (_type, listener) => { enableSound = listener; };
  audio.play = () => new Promise((resolve) => { completePlay = resolve; });
  const presentation = {
    manifest_revision: "the-stolen-artifact-v2-presentation-r1",
    audience: "public_stage",
    scene_image_id: "scene_image.discovery.cinematic_gallery.v1",
    atmosphere_audio_id: "atmosphere.discovery.cinematic_vault.v1",
    audio_behavior: "loop_while_scene_active",
  };
  const controller = new StageMediaController({
    registry: {
      manifest_revision: presentation.manifest_revision,
      assets: {
        [presentation.scene_image_id]: { kind: "image", source: "data:image/png;base64,synthetic" },
        [presentation.atmosphere_audio_id]: { kind: "audio", source: "data:audio/wav;base64,synthetic" },
      },
    },
    image,
    audio,
    soundButton,
    statusElement: mediaElement(),
  });
  controller.apply(presentation);
  enableSound();
  assert.equal(controller.atmosphereState, "starting");
  controller.suspend();
  assert.equal(controller.atmosphereState, "stopped");
  completePlay();
  await Promise.resolve();
  assert.equal(controller.atmosphereState, "stopped");
});

function mediaElement() {
  return {
    addEventListener() {},
    currentTime: 0,
    hidden: false,
    load() {},
    pause() {},
    removeAttribute(name) { delete this[name]; },
    setAttribute(name, value) { this[name] = value; },
    textContent: "",
  };
}

test("projection filtering fails closed on every forbidden private category", () => {
  const privateCases = [
    ["participants", 0, "private_objective", "Synthetic private objective"],
    ["participants", 0, "has_voted", true],
    ["private_clues", null, null, []],
    ["individual_votes", null, null, []],
    ["participant_credentials", null, null, ["synthetic-credential"]],
    ["private_messages", null, null, []],
    ["token", null, null, "synthetic-authority"],
  ];
  for (const [field, index, nestedField, value] of privateCases) {
    const projection = structuredClone(publicEnvelope.payload.projection);
    if (index === null) projection[field] = value;
    else projection[field][index][nestedField] = value;
    assert.throws(() => core.sanitizeProjection(projection), /forbidden private fields/u);
  }
});

test("envelope validation binds projection to the Stage context", () => {
  const result = core.validateEnvelope(publicEnvelope, {
    session_id: publicEnvelope.session_id,
    endpoint_id: publicEnvelope.endpoint_id,
  });
  assert.equal(result.type, "projection");
  assert.equal(result.sequence, 7);
  assert.throws(() => core.validateEnvelope({ ...publicEnvelope, endpoint_id: "another-endpoint" }, {
    session_id: publicEnvelope.session_id,
    endpoint_id: publicEnvelope.endpoint_id,
  }));
  assert.throws(() => core.validateEnvelope({ ...publicEnvelope, type: "command_result" }, {
    session_id: publicEnvelope.session_id,
    endpoint_id: publicEnvelope.endpoint_id,
  }), /Unsupported critical/u);
});

test("sequence tracker accepts monotonic complete projections and resyncs regressions", () => {
  const tracker = new core.SequenceTracker();
  assert.equal(tracker.accept(7), "apply");
  assert.equal(tracker.accept(7), "duplicate");
  assert.equal(tracker.accept(8), "apply");
  assert.equal(tracker.accept(10), "apply");
  tracker.startConnection();
  assert.equal(tracker.accept(10), "apply");
  tracker.startConnection();
  assert.equal(tracker.accept(9), "resync");
});

test("connection health follows the documented 30 and 45 second boundaries", () => {
  assert.equal(core.HEARTBEAT_INTERVAL_MS, 15_000);
  assert.equal(core.connectionHealthAction(10_000, 39_999), "healthy");
  assert.equal(core.connectionHealthAction(10_000, 40_000), "uncertain");
  assert.equal(core.connectionHealthAction(10_000, 54_999), "uncertain");
  assert.equal(core.connectionHealthAction(10_000, 55_000), "disconnect");
  assert.equal(core.connectionHealthAction(10_000, 9_999), "disconnect");
  assert.equal(core.connectionHealthAction(null, 55_000), "disconnect");
});

test("lifecycle reset overwrites every in-memory authority category", () => {
  const tracker = new core.SequenceTracker();
  tracker.accept(9);
  const state = {
    pairing: { polling_secret: "synthetic-polling-secret" },
    authority: { token: "synthetic-bearer" },
    ticket: { websocket_subprotocol: "synthetic-ticket" },
    projection: { scenario_title: "Synthetic public title" },
    sequence: tracker,
  };
  core.clearSensitiveState(state);
  assert.equal(state.pairing, null);
  assert.equal(state.authority, null);
  assert.equal(state.ticket, null);
  assert.equal(state.projection, null);
  assert.equal(tracker.last, -1);
});

test("reconnect delay uses full jitter and remains capped at 30 seconds", () => {
  assert.equal(core.reconnectDelayMs(0, 0), 0);
  assert.equal(core.reconnectDelayMs(0, 1), 1000);
  assert.equal(core.reconnectDelayMs(1, 1), 2000);
  assert.equal(core.reconnectDelayMs(5, 1), 30000);
  assert.equal(core.reconnectDelayMs(50, 1), 30000);
  assert.equal(core.terminalSocketClose(1008), true);
  assert.equal(core.terminalSocketClose(1006), false);
  assert.equal(core.terminalHttpStatus(403), true);
  assert.equal(core.terminalHttpStatus(503), false);
});

test("packaged Stage sources contain no obsolete or persistent authority transport", async () => {
  const files = ["index.html", "shell.js", "stage.html", "stage-core.js", "stage.js", "styles.css", "shell.css", "appinfo.json"];
  const sources = await Promise.all(files.map((file) => readFile(path.join(stageDirectory, file), "utf8")));
  const combined = sources.join("\n");
  for (const forbidden of [
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "?token=",
    "searchParams.set",
    "browser_stage",
    '"/api/v1/join"',
    "console.log",
    "console.error",
    "XMLHttpRequest",
  ]) {
    assert.equal(combined.includes(forbidden), false, `found forbidden packaged Stage pattern ${forbidden}`);
  }
  assert.doesNotMatch(sources[2], /<(?:script|link|img)[^>]+https?:\/\//u);
  assert.match(combined, /StagePairing /u);
  assert.match(combined, /\/api\/v1\/websocket-tickets/u);
  assert.match(combined, /wss:\/\/api\.test\.guiltyparty\.app\/ws\/v1/u);
});
