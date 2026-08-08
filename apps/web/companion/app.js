import {
  ApiProblem, COMPANION_BUILD, ControlConnection, PROTOCOL_VERSION,
  apiRequest, configuredApiOrigin, decodeInvitationTransfer, recoverContext,
} from "./control-client.js";
import { privateViewShouldBeHidden } from "./private-view.js";

const apiOrigin = configuredApiOrigin();
const $ = (selector) => document.querySelector(selector);
let context = null;
let connection = null;
let lastProjection = null;
let privateViewHiddenByPlayer = false;

$("#join-form").addEventListener("submit", joinSession);
$("#leave-view").addEventListener("click", hidePrivateView);
document.addEventListener("visibilitychange", syncPrivateCover);
window.addEventListener("pagehide", () => { connection?.stop(); clearRenderedSecrets(); });
window.addEventListener("pageshow", (event) => { if (event.persisted && context) restorePersistedSession(); });

await resume();

async function resume() {
  try {
    const recovered = await recoverContext(apiOrigin, "participant");
    if (recovered) activate(recovered);
    else setStatus("join", "Paste an active invitation to begin.");
  } catch (error) { setStatus("join", present(error), true); }
}

async function restorePersistedSession() {
  try {
    const recovered = await recoverContext(apiOrigin, "participant");
    if (recovered) activate(recovered, { preservePrivacy: true });
    else leaveEndedSession();
  } catch (error) {
    setStatus("game", present(error), true);
    connection?.start();
  }
}

async function joinSession(event) {
  event.preventDefault();
  const invitationInput = $("#invitation");
  let transfer;
  try {
    transfer = decodeInvitationTransfer(invitationInput.value.trim());
    if (Date.now() >= transfer.expires_at_unix_ms) throw new Error("That invitation has expired. Ask the Host to rotate it.");
  } catch (error) { setStatus("join", present(error), true); return; }
  setStatus("join", "Joining the private session…");
  try {
    const joined = await apiRequest(apiOrigin, "/api/v1/join", {
      method: "POST",
      headers: { Authorization: `Pairing ${transfer.pairing_code}`, "X-GP-Session-ID": transfer.session_id },
      body: JSON.stringify({
        protocol_version: PROTOCOL_VERSION,
        kind: "participant",
        display_name: $("#display-name").value.trim(),
        endpoint: { platform: "browser", capabilities: ["private_display", "touch_input"], client_build: COMPANION_BUILD },
      }),
    });
    activate({
      session_id: joined.session_id,
      endpoint_id: joined.endpoint_id,
      audience: "participant",
      participant_id: joined.participant_id,
      primary_authority_generation: joined.primary_authority_generation,
      authority_expires_at_unix_ms: joined.authority_expires_at_unix_ms,
    });
  } catch (error) {
    setStatus("join", present(error), true);
  } finally {
    invitationInput.value = "";
  }
}

function activate(nextContext, { preservePrivacy = false } = {}) {
  context = nextContext;
  if (!preservePrivacy) privateViewHiddenByPlayer = false;
  syncPrivateCover();
  $("#join-panel").classList.add("hidden");
  $("#game").classList.remove("hidden");
  connection?.stop();
  connection = new ControlConnection({ apiOrigin, context, onProjection: renderProjection, onStatus: renderConnection, onProblem: (error) => setStatus("game", present(error), true), onTerminal: leaveEndedSession });
  connection.start();
}

function renderConnection(state) {
  const badge = $("#connection-badge");
  badge.textContent = state === "connected" ? "Connected" : state === "connecting" ? "Connecting" : state === "ended" ? "Session ended" : "Reconnecting";
  badge.classList.toggle("live", state === "connected");
  setStatus("game", state === "connected" ? "Your private view is current." : "Connection interrupted. Rejoining automatically…", false, state === "connected");
}

function renderProjection(value) {
  if (!value) return;
  lastProjection = value;
  $("#scenario-title").textContent = value.scenario_title;
  $("#session-meta").textContent = `${value.gameplay_language ?? "en"} · ${value.participants.length} player${value.participants.length === 1 ? "" : "s"}`;
  $("#scene-name").textContent = value.active_scene?.name ?? "The room is gathering";
  $("#scene-copy").textContent = value.active_scene?.public_narrative ?? "Stay close. The Host will begin shortly.";
  const mine = value.participants.find((participant) => participant.participant_id === context.participant_id);
  $("#character-name").textContent = mine?.character_name ?? "Waiting for the Host";
  $("#private-objective").textContent = mine?.private_objective ?? "Your private objective will appear here after assignment.";
  renderClues(value.revealed_clues);
  renderVote(value, mine);
  $("#outcome-card").classList.toggle("hidden", !value.outcome);
  $("#outcome-copy").textContent = value.outcome?.public_resolution ?? "";
}

function renderClues(clues) {
  const root = $("#clues");
  if (clues.length === 0) { root.className = "empty"; root.textContent = "No clues revealed to you."; return; }
  root.className = "";
  root.replaceChildren(...clues.map((clue) => { const item = document.createElement("div"); item.className = "clue"; const title = document.createElement("strong"); title.textContent = clue.name; const copy = document.createElement("p"); copy.className = "muted"; copy.textContent = clue.description; item.append(title, copy); return item; }));
}

function renderVote(value, mine) {
  const card = $("#vote-card");
  card.classList.toggle("hidden", !value.voting_open);
  if (!value.voting_open) return;
  const root = $("#vote-options");
  if (mine?.has_voted) { root.replaceChildren(); setStatus("vote", "Your vote is recorded.", false, true); return; }
  const characters = [["char_1", "Alice · collector"], ["char_2", "Bob · investigator"]];
  root.replaceChildren(...characters.map(([id, label]) => { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.addEventListener("click", () => vote(id)); return button; }));
  setStatus("vote", "Choose once. Individual votes remain private.");
}

async function vote(characterId) {
  document.querySelectorAll("#vote-options button").forEach((button) => { button.disabled = true; });
  try { await connection.submit({ type: "cast_vote", target_character_id: characterId }); setStatus("vote", "Your vote is recorded.", false, true); }
  catch (error) { setStatus("vote", present(error), true); renderVote(lastProjection, lastProjection?.participants.find((item) => item.participant_id === context.participant_id)); }
}

function hidePrivateView() {
  privateViewHiddenByPlayer = true;
  syncPrivateCover();
}
$("#privacy-cover").addEventListener("click", () => {
  privateViewHiddenByPlayer = false;
  syncPrivateCover();
});

function syncPrivateCover() {
  const hidden = privateViewShouldBeHidden({
    contextActive: context !== null,
    documentHidden: document.hidden,
    manuallyHidden: privateViewHiddenByPlayer,
  });
  document.body.classList.toggle("private-hidden", hidden);
  $("#privacy-cover").setAttribute("aria-hidden", String(!hidden));
}

function leaveEndedSession() {
  clearRenderedSecrets();
  context = null;
  privateViewHiddenByPlayer = false;
  syncPrivateCover();
  $("#game").classList.add("hidden");
  $("#join-panel").classList.remove("hidden");
  setStatus("join", "This device was removed or the session ended. Ask the Host for an active invitation to rejoin.", true);
}

function clearRenderedSecrets() { $("#private-objective").textContent = ""; $("#clues").replaceChildren(); lastProjection = null; }
function setStatus(area, message, error = false, good = false) { const element = $(`#${area}-status`); element.textContent = message; element.className = `status${error ? " error" : good ? " good" : ""}`; }
function present(error) { return error instanceof ApiProblem ? `${error.message} (${error.code})` : error.message ?? "Something went wrong."; }
