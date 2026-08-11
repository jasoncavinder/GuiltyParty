#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { openWebSocket } from "./remote_rehearsal_websocket.mjs";

const baseUrl = requiredUrl("GP_REMOTE_BASE_URL");
const bootstrapProof = requiredValue("GP_HOST_BOOTSTRAP_PROOF");
const hostOrigin = process.env.GP_HOST_ORIGIN ?? "https://host.test.guiltyparty.app";
const playOrigin = process.env.GP_PLAY_ORIGIN ?? "https://play.test.guiltyparty.app";
const controlSubprotocol = "guiltyparty.control.v1";

if (baseUrl.pathname !== "/" || baseUrl.search || baseUrl.hash) {
  throw new Error("GP_REMOTE_BASE_URL must be an HTTP(S) origin without a path, query, or fragment");
}
for (const [name, origin] of [["GP_HOST_ORIGIN", hostOrigin], ["GP_PLAY_ORIGIN", playOrigin]]) {
  if (new URL(origin).origin !== origin || !origin.startsWith("https://")) {
    throw new Error(`${name} must be an exact HTTPS origin`);
  }
}

const host = await createHost();
const connections = [];
let rehearsalError = null;
try {
  const alice = await joinBrowserParticipant(host, "Synthetic Alice");
  const bob = await joinBrowserParticipant(host, "Synthetic Bob");
  const stage = await pairStage(host);

  await verifyRecoveredContext(host, hostOrigin, "host");
  await verifyRecoveredContext(alice, playOrigin, "participant");
  await verifyRecoveredContext(bob, playOrigin, "participant");
  await verifyEndpointRoster(host, alice);

  host.socket = await connectBrowser(host, hostOrigin);
  alice.socket = await connectBrowser(alice, playOrigin);
  bob.socket = await connectBrowser(bob, playOrigin);
  stage.socket = await connectStage(stage);
  connections.push(host.socket, alice.socket, bob.socket, stage.socket);

  const initialHost = await requestProjection(host);
  assert.equal(initialHost.participants.length, 2);
  assert.equal(initialHost.gameplay_language, "en");

  await command(host, {
    type: "assign_character",
    participant_id: alice.participantId,
    character_id: "char_1",
  });
  await command(host, {
    type: "assign_character",
    participant_id: bob.participantId,
    character_id: "char_2",
  });

  const advanceEnvelope = commandEnvelope(host, {
    type: "advance_scene",
    scene_id: "scene_1",
  });
  const firstAdvance = await sendCommandEnvelope(host, advanceEnvelope);
  assert.equal(firstAdvance.payload.status, "accepted");
  const duplicateAdvance = await sendCommandEnvelope(host, advanceEnvelope);
  assert.equal(duplicateAdvance.payload.status, "accepted");
  assert.equal(duplicateAdvance.server_sequence, firstAdvance.server_sequence);

  const forbidden = await command(alice, { type: "advance_scene", scene_id: "scene_2" }, "rejected");
  assert.equal(forbidden.payload.code, "command_forbidden");
  assert.equal(forbidden.server_sequence, firstAdvance.server_sequence);

  await command(host, { type: "reveal_clue", clue_id: "clue_1" });
  await command(host, { type: "reveal_clue", clue_id: "clue_2" });

  const hostSecrets = await requestProjection(host);
  const aliceSecrets = await requestProjection(alice);
  const bobSecrets = await requestProjection(bob);
  const stageSecrets = await requestProjection(stage);
  assert.deepEqual(clueIds(hostSecrets), ["clue_1", "clue_2"]);
  assert.deepEqual(clueIds(aliceSecrets), ["clue_1"]);
  assert.deepEqual(clueIds(bobSecrets), ["clue_1", "clue_2"]);
  assert.deepEqual(clueIds(stageSecrets), ["clue_1"]);
  assert.equal(ownParticipant(aliceSecrets, alice).private_objective, "Hide the fact that you stole the artifact.");
  assert.equal(ownParticipant(bobSecrets, bob).private_objective, "Find out who stole the artifact.");
  assert.equal("private_objective" in participantFor(aliceSecrets, bob.participantId), false);
  assert.equal("private_objective" in participantFor(bobSecrets, alice.participantId), false);
  assertStageProjectionIsPublic(stageSecrets);

  await command(host, { type: "advance_scene", scene_id: "scene_2" });
  await command(host, { type: "open_voting" });
  await command(alice, { type: "cast_vote", target_character_id: "char_1" });
  await command(bob, { type: "cast_vote", target_character_id: "char_1" });

  const aliceVote = await requestProjection(alice);
  const bobVote = await requestProjection(bob);
  const stageVote = await requestProjection(stage);
  assert.equal(ownParticipant(aliceVote, alice).has_voted, true);
  assert.equal(ownParticipant(bobVote, bob).has_voted, true);
  assert.equal(stageVote.votes_cast, 2);
  assertStageProjectionIsPublic(stageVote);

  await command(host, { type: "close_voting" });
  const finalHost = await requestProjection(host);
  const finalStage = await requestProjection(stage);
  assert.equal(finalHost.outcome.id, "outcome_1");
  assert.equal(finalStage.outcome.public_resolution, "Alice is identified as the thief.");
  assert.equal(finalStage.active_scene.id, "scene_2");
  assertStageProjectionIsPublic(finalStage);

  alice.socket.close();
  alice.socket = await connectBrowser(alice, playOrigin);
  connections.push(alice.socket);
  const resumedAlice = await requestProjection(alice);
  assert.equal(resumedAlice.outcome.id, "outcome_1");
  assert.equal(ownParticipant(resumedAlice, alice).private_objective, "Hide the fact that you stole the artifact.");
  assert.equal("private_objective" in participantFor(resumedAlice, bob.participantId), false);

  console.log(
    "Remote game rehearsal passed: browser Host, two browser fallback participants, " +
    "Host-approved Stage, deterministic full loop, idempotency, reconnect, and projection privacy.",
  );
} catch (error) {
  rehearsalError = error;
  throw error;
} finally {
  for (const socket of connections) socket?.close();
  try {
    await endSession(host);
  } catch (error) {
    if (rehearsalError === null) throw error;
    console.error("Session cleanup also failed after the remote game rehearsal error.");
  }
}

async function createHost() {
  const response = await fetch(new URL("/api/v1/sessions", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bootstrapProof}`,
      Origin: hostOrigin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      protocol_version: "1.0",
      gameplay_language: "en",
      endpoint: {
        platform: "browser",
        capabilities: ["host_control", "private_display"],
        features: ["host_presentation_status_v1"],
        client_build: {
          application_id: "host_web",
          application_version: "0.2.0",
          build_number: 2,
        },
      },
    }),
  });
  await requireStatus(response, 201, "Host session creation");
  const cookie = cookieFrom(response);
  const body = await response.json();
  assert.equal(body.authority_transport, "cookie");
  assert.match(body.invitation_payload, /^GP1\.[A-Za-z0-9_-]+$/u);
  return actor(body, { cookie, pairingCode: body.pairing_code });
}

async function joinBrowserParticipant(host, displayName) {
  const response = await fetch(new URL("/api/v1/join", baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Pairing ${host.pairingCode}`,
      "X-GP-Session-ID": host.sessionId,
      Origin: playOrigin,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      protocol_version: "1.0",
      kind: "participant",
      display_name: displayName,
      endpoint: {
        platform: "browser",
        capabilities: ["private_display", "touch_input"],
        client_build: {
          application_id: "companion_web",
          application_version: "0.1.0",
          build_number: 1,
        },
      },
    }),
  });
  await requireStatus(response, 200, `${displayName} browser join`);
  const cookie = cookieFrom(response);
  const body = await response.json();
  assert.equal(body.authority_transport, "cookie");
  assert.equal("token" in body, false);
  return actor(body, { cookie });
}

async function pairStage(host) {
  const create = await fetch(new URL("/api/v1/stage-pairings", baseUrl), {
    method: "POST",
    headers: { Origin: "null", "Content-Type": "application/json" },
    body: JSON.stringify({
      protocol_version: "1.0",
      endpoint: {
        platform: "webos",
        capabilities: ["public_display", "public_audio_output"],
        features: ["stage_presentation_media_v1"],
        client_build: {
          application_id: "stage_webos",
          application_version: "0.2.0",
          build_number: 3,
        },
      },
    }),
  });
  await requireStatus(create, 201, "Stage pairing creation");
  const pairing = await create.json();
  const approval = await fetch(
    new URL(`/api/v1/stage-pairings/${pairing.pairing_code}/approve`, baseUrl),
    { method: "POST", headers: { Cookie: host.cookie, Origin: hostOrigin } },
  );
  await requireStatus(approval, 200, "Host Stage approval");
  await approval.body?.cancel();
  const redemption = await fetch(new URL(pairing.redeem_path, baseUrl), {
    method: "POST",
    headers: { Authorization: `StagePairing ${pairing.polling_secret}`, Origin: "null" },
  });
  await requireStatus(redemption, 200, "Stage pairing redemption");
  const body = await redemption.json();
  assert.equal(body.authority_transport, "bearer");
  return actor(body, { token: body.token });
}

async function verifyRecoveredContext(value, origin, audience) {
  const response = await fetch(new URL("/api/v1/session/context", baseUrl), {
    headers: { Cookie: value.cookie, Origin: origin },
  });
  await requireStatus(response, 200, `${audience} context recovery`);
  const body = await response.json();
  assert.equal(body.session_id, value.sessionId);
  assert.equal(body.endpoint_id, value.endpointId);
  assert.equal(body.participant_id, value.participantId);
  assert.equal(body.audience, audience);
  assert.equal(body.primary_authority_generation, value.authorityGeneration);
  assert.equal("token" in body, false);
}

async function verifyEndpointRoster(host, participant) {
  const response = await fetch(new URL("/api/v1/session/endpoints", baseUrl), {
    headers: { Cookie: host.cookie, Origin: hostOrigin },
  });
  await requireStatus(response, 200, "Host endpoint roster");
  const body = await response.json();
  assert.equal(body.endpoints.length, 4);
  assert.deepEqual(
    body.endpoints.map((endpoint) => endpoint.audience).sort(),
    ["host", "participant", "participant", "stage"],
  );
  assert.equal(JSON.stringify(body).includes("private_objective"), false);
  assert.equal(JSON.stringify(body).includes("token"), false);

  const forbidden = await fetch(new URL("/api/v1/session/endpoints", baseUrl), {
    headers: { Cookie: participant.cookie, Origin: playOrigin },
  });
  await requireStatus(forbidden, 403, "participant endpoint-roster rejection");
  assert.equal((await forbidden.json()).code, "host_authority_required");
}

async function connectBrowser(value, origin) {
  const connection = await openWebSocket(baseUrl, {
    origin,
    cookie: value.cookie,
    subprotocols: [controlSubprotocol],
  });
  assert.equal(connection.status, 101);
  return connection.socket;
}

async function connectStage(stage) {
  const response = await fetch(new URL("/api/v1/websocket-tickets", baseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${stage.token}`, Origin: "null" },
  });
  await requireStatus(response, 200, "Stage connect-ticket issuance");
  const ticket = await response.json();
  const connection = await openWebSocket(baseUrl, {
    origin: "null",
    subprotocols: [controlSubprotocol, ticket.websocket_subprotocol],
  });
  assert.equal(connection.status, 101);
  return connection.socket;
}

async function requestProjection(value) {
  const messageId = identifier("msg");
  value.socket.sendJson({
    protocol_version: "1.0",
    type: "get_projection",
    message_id: messageId,
    session_id: value.sessionId,
    endpoint_id: value.endpointId,
    payload: {},
  });
  const response = await value.socket.nextJson(
    (message) => message.type === "projection" && message.correlation_id === messageId,
  );
  assert.equal(response.session_id, value.sessionId);
  assert.equal(response.endpoint_id, value.endpointId);
  return response.payload.projection;
}

async function command(value, commandValue, expectedStatus = "accepted") {
  const result = await sendCommandEnvelope(value, commandEnvelope(value, commandValue));
  assert.equal(result.payload.status, expectedStatus);
  return result;
}

function commandEnvelope(value, commandValue) {
  return {
    protocol_version: "1.0",
    type: "submit_command",
    message_id: identifier("msg"),
    session_id: value.sessionId,
    endpoint_id: value.endpointId,
    idempotency_id: identifier("cmd"),
    primary_authority_generation: value.authorityGeneration,
    payload: { command: commandValue },
  };
}

async function sendCommandEnvelope(value, envelope) {
  value.socket.sendJson(envelope);
  return value.socket.nextJson(
    (message) => message.type === "command_result" && message.correlation_id === envelope.message_id,
  );
}

async function endSession(host) {
  const response = await fetch(new URL("/api/v1/session/end", baseUrl), {
    method: "POST",
    headers: { Cookie: host.cookie, Origin: hostOrigin },
  });
  await requireStatus(response, 200, "session cleanup");
  await response.body?.cancel();
}

function actor(body, additional = {}) {
  return {
    sessionId: body.session_id,
    endpointId: body.endpoint_id,
    participantId: body.participant_id ?? null,
    authorityGeneration: body.primary_authority_generation ?? 1,
    ...additional,
  };
}

function cookieFrom(response) {
  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0] ?? null;
  assert.match(cookie, /^__Host-gp_authority=.+/u);
  return cookie;
}

function clueIds(projection) {
  return projection.revealed_clues.map((clue) => clue.id).sort();
}

function participantFor(projection, participantId) {
  const participant = projection.participants.find((item) => item.participant_id === participantId);
  assert.ok(participant, `projection must contain participant ${participantId}`);
  return participant;
}

function ownParticipant(projection, value) {
  return participantFor(projection, value.participantId);
}

function assertStageProjectionIsPublic(projection) {
  const encoded = JSON.stringify(projection);
  assert.equal(encoded.includes("private_objective"), false);
  assert.equal(encoded.includes("has_voted"), false);
  assert.equal(encoded.includes("Hide the fact"), false);
  assert.equal(encoded.includes("Find out who"), false);
  assert.equal(encoded.includes("Security Badge"), false);
}

async function requireStatus(response, expected, operation) {
  if (response.status === expected) return;
  let code = "unknown";
  try {
    code = (await response.json()).code ?? code;
  } catch {
    await response.body?.cancel();
  }
  throw new Error(`${operation} failed with HTTP ${response.status} (${code})`);
}

function identifier(prefix) {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

function requiredValue(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required and must be supplied through the process environment`);
  }
  return value;
}

function requiredUrl(name) {
  const url = new URL(requiredValue(name));
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${name} must use HTTP or HTTPS`);
  }
  return url;
}
