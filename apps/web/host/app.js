import {
  ApiProblem, ControlConnection, HOST_BUILD, HOST_PRESENTATION_STATUS_FEATURE,
  PROTOCOL_VERSION, apiRequest, compatibilityFeatures, configuredApiOrigin,
  recoverContext,
} from "./control-client.js";

const apiOrigin = configuredApiOrigin();
const $ = (selector) => document.querySelector(selector);
const setup = $("#setup-panel");
const consolePanel = $("#console");
const endSessionDialog = $("#end-session-dialog");
let context = null;
let connection = null;
let projection = null;
let invitationPayload = "";
let endingSession = false;
let serverFeatures = new Set();

$("#create-form").addEventListener("submit", createSession);
$("#copy-invitation").addEventListener("click", copyInvitation);
$("#rotate-invitation").addEventListener("click", rotateInvitation);
$("#close-invitation").addEventListener("click", closeInvitation);
$("#stage-form").addEventListener("submit", approveStage);
$("#refresh-roster").addEventListener("click", loadRoster);
$("#end-session").addEventListener("click", showEndSessionDialog);
$("#end-session-form").addEventListener("submit", endSession);
$("#cancel-end-session").addEventListener("click", () => endSessionDialog.close());
endSessionDialog.addEventListener("cancel", (event) => { if (endingSession) event.preventDefault(); });
endSessionDialog.addEventListener("close", resetEndSessionDialog);
document.querySelectorAll("[data-command]").forEach((button) => button.addEventListener("click", () => submit(JSON.parse(button.dataset.command))));
window.addEventListener("pagehide", () => connection?.stop());
window.addEventListener("pageshow", (event) => { if (event.persisted && context) restorePersistedSession(); });

await discoverServerFeatures();
await resume();

async function discoverServerFeatures() {
  try {
    serverFeatures = await compatibilityFeatures(apiOrigin);
  } catch {
    serverFeatures = new Set();
  }
}

async function resume() {
  try {
    const recovered = await recoverContext(apiOrigin, "host");
    if (recovered) activate(recovered);
    else setStatus("setup", "No active Host session found.");
  } catch (error) {
    setStatus("setup", present(error), true);
  }
}

async function restorePersistedSession() {
  try {
    const recovered = await recoverContext(apiOrigin, "host");
    if (recovered) activate(recovered);
    else leaveEndedHost();
  } catch (error) {
    setStatus("action", present(error), true);
    connection?.start();
  }
}

async function createSession(event) {
  event.preventDefault();
  const proofInput = $("#bootstrap-proof");
  const proof = proofInput.value;
  setStatus("setup", "Creating the private session…");
  try {
    const created = await apiRequest(apiOrigin, "/api/v1/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${proof}` },
      body: JSON.stringify({
        protocol_version: PROTOCOL_VERSION,
        gameplay_language: $("#gameplay-language").value.trim(),
        endpoint: {
          platform: "browser",
          capabilities: ["host_control", "private_display"],
          ...(serverFeatures.has(HOST_PRESENTATION_STATUS_FEATURE)
            ? { features: [HOST_PRESENTATION_STATUS_FEATURE] }
            : {}),
          client_build: HOST_BUILD,
        },
      }),
    });
    invitationPayload = created.invitation_payload;
    activate({
      session_id: created.session_id,
      endpoint_id: created.endpoint_id,
      audience: "host",
      participant_id: null,
      primary_authority_generation: 1,
      authority_expires_at_unix_ms: created.session_expires_at_unix_ms,
    });
    showInvitation(invitationPayload, created.pairing_expires_at_unix_ms);
  } catch (error) {
    setStatus("setup", present(error), true);
  } finally {
    proofInput.value = "";
  }
}

function activate(nextContext) {
  context = nextContext;
  setup.classList.add("hidden");
  consolePanel.classList.remove("hidden");
  $("#session-meta").textContent = `Language announced by session · ${context.session_id}`;
  connection?.stop();
  connection = new ControlConnection({
    apiOrigin,
    context,
    onProjection: renderProjection,
    onStatus: renderConnection,
    onPresentationStatus: renderPresentationStatus,
    onProblem: (error) => setStatus("action", present(error), true),
    onTerminal: leaveEndedHost,
  });
  connection.start();
  loadRoster();
}

function renderConnection(state) {
  const badge = $("#connection-badge");
  badge.textContent = state === "connected" ? "Live" : state === "connecting" ? "Connecting" : state === "ended" ? "Ended" : "Reconnecting";
  badge.classList.toggle("live", state === "connected");
}

function renderPresentationStatus(value) {
  const status = $("#presentation-status");
  if (!value || value.atmosphere_state === "unknown") {
    status.textContent = "Presentation status unavailable until the Stage reports fresh state.";
    status.className = "status";
    return;
  }
  const asset = value.asset_available ? "artwork ready" : "artwork unavailable";
  const sound = value.sound_enabled ? "sound enabled" : "sound muted";
  const motion = value.reduced_motion ? "reduced motion" : "standard motion";
  status.textContent = `Stage presentation · ${asset} · ${sound} · atmosphere ${value.atmosphere_state} · ${motion}`;
  status.className = `status${value.asset_available ? " good" : " error"}`;
}

function renderProjection(value, sequence) {
  if (!value) return;
  projection = value;
  $("#session-title").textContent = value.scenario_title;
  $("#session-meta").textContent = `${value.gameplay_language ?? "en"} · ${value.participants.length} player${value.participants.length === 1 ? "" : "s"} · ${value.votes_cast} vote${value.votes_cast === 1 ? "" : "s"}`;
  $("#sequence").textContent = `Sequence ${sequence ?? "—"}`;
  $("#scene-title").textContent = value.active_scene?.name ?? "Awaiting first scene";
  $("#scene-copy").textContent = value.active_scene?.public_narrative ?? "Assign the cast, then open the gala.";
  renderClues(value.revealed_clues);
  renderParticipants(value.participants);
  if (value.outcome) setStatus("action", value.outcome.public_resolution, false, true);
  loadRoster();
}

function renderParticipants(participants) {
  const root = $("#participants");
  if (participants.length === 0) { root.className = "empty"; root.textContent = "Waiting for players."; return; }
  root.className = "";
  root.replaceChildren(...participants.map((participant) => {
    const row = document.createElement("div"); row.className = "participant";
    const head = document.createElement("div"); head.className = "participant-head";
    const copy = document.createElement("div");
    const name = document.createElement("strong"); name.textContent = participant.name;
    const detail = document.createElement("small"); detail.textContent = participant.character_name ?? "Character unassigned";
    copy.append(name, detail);
    const select = document.createElement("select"); select.setAttribute("aria-label", `Assign character to ${participant.name}`);
    for (const [id, label] of [["", "Assign character…"], ["char_1", "Alice · collector"], ["char_2", "Bob · investigator"]]) {
      const option = document.createElement("option"); option.value = id; option.textContent = label; select.append(option);
    }
    select.disabled = participant.character_name !== null;
    select.addEventListener("change", () => { if (select.value) submit({ type: "assign_character", participant_id: participant.participant_id, character_id: select.value }); });
    head.append(copy, select); row.append(head);
    if (participant.private_objective) { const objective = document.createElement("p"); objective.className = "muted"; objective.textContent = `Private objective: ${participant.private_objective}`; row.append(objective); }
    return row;
  }));
}

function renderClues(clues) {
  const root = $("#clues");
  if (clues.length === 0) { root.className = "empty"; root.textContent = "No clues revealed."; return; }
  root.className = "";
  root.replaceChildren(...clues.map((clue) => { const item = document.createElement("div"); item.className = "clue"; const title = document.createElement("strong"); title.textContent = clue.name; const copy = document.createElement("p"); copy.className = "muted"; copy.textContent = clue.description; item.append(title, copy); return item; }));
}

async function submit(command) {
  setStatus("action", "Sending action…");
  try { await connection.submit(command); setStatus("action", "Action accepted.", false, true); }
  catch (error) { setStatus("action", present(error), true); }
}

async function rotateInvitation() {
  try { const body = await apiRequest(apiOrigin, "/api/v1/session/invitation", { method: "PUT" }); invitationPayload = body.invitation_payload; showInvitation(invitationPayload, body.pairing_expires_at_unix_ms); }
  catch (error) { setStatus("action", present(error), true); }
}

async function closeInvitation() {
  try { await apiRequest(apiOrigin, "/api/v1/session/invitation", { method: "DELETE" }); invitationPayload = ""; showInvitation("", null); }
  catch (error) { setStatus("action", present(error), true); }
}

function showInvitation(payload, expires) {
  $("#invitation-payload").value = payload;
  $("#invite-state").textContent = payload ? `Expires ${new Date(expires).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Joining closed";
}

async function copyInvitation() {
  if (!invitationPayload) return setStatus("action", "Rotate the invitation before copying it.", true);
  try { await navigator.clipboard.writeText(invitationPayload); setStatus("action", "Invitation copied. Share it privately.", false, true); }
  catch { setStatus("action", "Clipboard access was unavailable. Select and copy the invitation manually.", true); }
}

async function approveStage(event) {
  event.preventDefault();
  const code = $("#stage-code").value.trim().toUpperCase();
  try { await apiRequest(apiOrigin, `/api/v1/stage-pairings/${encodeURIComponent(code)}/approve`, { method: "POST" }); $("#stage-code").value = ""; setStatus("stage", "Stage approved. It can now finish pairing.", false, true); loadRoster(); }
  catch (error) { setStatus("stage", present(error), true); }
}

async function loadRoster() {
  if (!context) return;
  try {
    const body = await apiRequest(apiOrigin, "/api/v1/session/endpoints");
    const root = $("#devices");
    root.className = "";
    root.replaceChildren(...body.endpoints.map((endpoint) => {
      const row = document.createElement("div"); row.className = "device";
      const copy = document.createElement("div"); const title = document.createElement("strong"); title.textContent = endpoint.display_name ?? (endpoint.audience === "stage" ? "Room Stage" : "Host Console"); const detail = document.createElement("small"); detail.textContent = `${endpoint.audience} · ${endpoint.platform}${endpoint.revoked ? " · revoked" : ""}`; copy.append(title, detail); row.append(copy);
      if (endpoint.audience !== "host" && !endpoint.revoked) { const button = document.createElement("button"); button.className = "quiet"; button.type = "button"; button.textContent = "Remove"; button.addEventListener("click", () => revokeEndpoint(endpoint.endpoint_id)); row.append(button); }
      return row;
    }));
  } catch (error) { $("#devices").textContent = present(error); }
}

async function revokeEndpoint(endpointId) {
  try { await apiRequest(apiOrigin, `/api/v1/session/endpoints/${encodeURIComponent(endpointId)}/revoke`, { method: "POST" }); await loadRoster(); }
  catch (error) { setStatus("action", present(error), true); }
}

function showEndSessionDialog() {
  if (!context || endSessionDialog.open) return;
  resetEndSessionDialog();
  endSessionDialog.showModal();
  $("#cancel-end-session").focus();
}

async function endSession(event) {
  event.preventDefault();
  if (endingSession) return;
  endingSession = true;
  const cancelButton = $("#cancel-end-session");
  const confirmButton = $("#confirm-end-session");
  cancelButton.disabled = true;
  confirmButton.disabled = true;
  setEndSessionStatus("Ending the session…");
  try {
    await apiRequest(apiOrigin, "/api/v1/session/end", { method: "POST" });
    connection?.stop();
    context = null;
    endSessionDialog.close();
    location.reload();
  } catch (error) {
    endingSession = false;
    cancelButton.disabled = false;
    confirmButton.disabled = false;
    setEndSessionStatus(present(error), true);
    confirmButton.focus();
  }
}

function resetEndSessionDialog() {
  endingSession = false;
  $("#cancel-end-session").disabled = false;
  $("#confirm-end-session").disabled = false;
  setEndSessionStatus("");
  if (context) $("#end-session").focus();
}

function setEndSessionStatus(message, error = false) {
  const element = $("#end-session-status");
  element.textContent = message;
  element.className = `status${error ? " error" : ""}`;
}

function leaveEndedHost() {
  projection = null;
  context = null;
  invitationPayload = "";
  if (endSessionDialog.open) endSessionDialog.close();
  $("#invitation-payload").value = "";
  $("#participants").replaceChildren();
  $("#clues").replaceChildren();
  $("#devices").replaceChildren();
  renderPresentationStatus(null);
  consolePanel.classList.add("hidden");
  setup.classList.remove("hidden");
  setStatus("setup", "This Host authority was removed or the session ended. Create a new session when you are ready.", true);
}

function setStatus(area, message, error = false, good = false) { const element = $(`#${area}-status`); element.textContent = message; element.className = `status${error ? " error" : good ? " good" : ""}`; }
function present(error) { return error instanceof ApiProblem ? `${error.message} (${error.code})` : error.message ?? "Something went wrong."; }
