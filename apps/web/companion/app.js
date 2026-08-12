import {
  ApiProblem,
  COMPANION_BUILD,
  ControlConnection,
  PARTICIPANT_PROTOCOL_VERSION,
  PARTICIPANT_VOTING_FEATURE,
  apiRequest,
  compatibilityProfile,
  configuredApiOrigin,
  decodeInvitationTransfer,
  recoverContext,
} from "./control-client.js";
import { privateViewShouldBeHidden } from "./private-view.js";
import {
  gameplayLanguageName,
  normalizeParticipantProjection,
  votingPresentation,
} from "./player-state.js";

const apiOrigin = configuredApiOrigin();
const $ = (selector) => document.querySelector(selector);
let context = null;
let connection = null;
let privateViewHiddenByPlayer = false;
let projectionCurrent = false;
let currentView = null;
let selectedVoteTargetId = null;
let voteSubmissionPending = false;

$("#join-form").addEventListener("submit", joinSession);
$("#leave-view").addEventListener("click", hidePrivateView);
$("#reveal-private-view").addEventListener("click", revealPrivateView);
$("#cast-vote").addEventListener("click", castSelectedVote);
$("#appearance-options").addEventListener("click", chooseAppearance);
$("#appearance-options").addEventListener("keydown", moveAppearanceFocus);
document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("pagehide", handlePageHide);
window.addEventListener("pageshow", (event) => { if (event.persisted && context) restorePersistedSession(); });

await resume();

async function resume() {
  try {
    const recovered = await recoverContext(apiOrigin, "participant");
    if (recovered?.protocol_version === PARTICIPANT_PROTOCOL_VERSION) {
      activate(recovered);
    } else if (recovered) {
      setStatus("join", "Rejoin with a current invitation to enable this private player view.");
    } else {
      setStatus("join", "Paste an active invitation to begin.");
    }
  } catch (error) {
    setStatus("join", present(error), true);
  }
}

async function restorePersistedSession() {
  try {
    const recovered = await recoverContext(apiOrigin, "participant");
    if (recovered?.protocol_version === PARTICIPANT_PROTOCOL_VERSION) {
      activate(recovered, { preservePrivacy: true });
    } else {
      leaveEndedSession();
    }
  } catch (error) {
    protectPrivateView("A fresh server-authorized private view is required.");
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
    if (Date.now() >= transfer.expires_at_unix_ms) {
      throw new Error("That invitation has expired. Ask the Host to rotate it.");
    }
  } catch (error) {
    setStatus("join", present(error), true);
    return;
  }

  setStatus("join", "Checking compatibility…");
  try {
    const compatibility = await compatibilityProfile(apiOrigin);
    if (
      compatibility.preferredProtocolVersion !== PARTICIPANT_PROTOCOL_VERSION ||
      !compatibility.features.has(PARTICIPANT_VOTING_FEATURE)
    ) {
      throw new Error("This server does not support the current private player experience.");
    }
    setStatus("join", "Joining the private session…");
    const joined = await apiRequest(apiOrigin, "/api/v1/join", {
      method: "POST",
      headers: {
        Authorization: `Pairing ${transfer.pairing_code}`,
        "X-GP-Session-ID": transfer.session_id,
      },
      body: JSON.stringify({
        protocol_version: PARTICIPANT_PROTOCOL_VERSION,
        kind: "participant",
        display_name: $("#display-name").value.trim(),
        endpoint: {
          platform: "browser",
          capabilities: ["private_display", "touch_input"],
          features: [PARTICIPANT_VOTING_FEATURE],
          client_build: COMPANION_BUILD,
        },
      }),
    });
    if (joined.protocol_version !== PARTICIPANT_PROTOCOL_VERSION) {
      throw new Error("The server joined this player with an unsupported protocol version.");
    }
    activate({
      protocol_version: joined.protocol_version,
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
  privateViewHiddenByPlayer = preservePrivacy;
  projectionCurrent = false;
  currentView = null;
  selectedVoteTargetId = null;
  voteSubmissionPending = false;
  clearRenderedSecrets();
  $("#join-panel").classList.add("hidden");
  $("#game").classList.remove("hidden");
  syncPrivateCover("Waiting for a fresh server-authorized private view.");

  connection?.stop();
  connection = new ControlConnection({
    apiOrigin,
    context,
    protocolVersion: PARTICIPANT_PROTOCOL_VERSION,
    onProjection: renderProjection,
    onStatus: renderConnection,
    onProblem: handleConnectionProblem,
    onTerminal: leaveEndedSession,
  });
  connection.start();
}

function renderConnection(state) {
  const badge = $("#connection-badge");
  const labels = {
    connected: "Connected",
    connecting: "Connecting",
    disconnected: "Connection uncertain",
    reconnecting: "Rejoining",
    ended: "Session ended",
  };
  badge.textContent = labels[state] ?? "Connection uncertain";
  badge.classList.toggle("live", state === "connected" && projectionCurrent);

  if (state !== "connected") {
    protectPrivateView("Connection uncertain. Waiting for a fresh private view.");
    setStatus("game", state === "ended" ? "The session ended." : "Connection interrupted. Rejoining automatically…");
  } else if (!projectionCurrent) {
    setStatus("game", "Connected. Confirming a fresh private view…");
  }
}

function handleConnectionProblem(error) {
  protectPrivateView("The private view could not be confirmed.");
  setStatus("game", present(error), true);
}

function renderProjection(value) {
  let normalized;
  try {
    normalized = normalizeParticipantProjection(value, context.participant_id);
  } catch (error) {
    connection?.stop();
    protectPrivateView("The server could not confirm a safe private view.");
    setStatus("game", present(error), true);
    return;
  }
  if (privateViewHiddenByPlayer || document.hidden) {
    protectPrivateView("Reveal the private view to request fresh game content.");
    return;
  }

  const previousTargets = currentView?.voteTargets.map((target) => target.id).join("\n") ?? "";
  const nextTargets = normalized.voteTargets.map((target) => target.id).join("\n");
  if (previousTargets !== nextTargets || !normalized.voteTargets.some((target) => target.id === selectedVoteTargetId)) {
    selectedVoteTargetId = null;
  }
  if (normalized.ownParticipant.has_voted) voteSubmissionPending = false;
  currentView = normalized;
  projectionCurrent = true;

  const { projection, ownParticipant } = normalized;
  const languageTag = projection.gameplay_language ?? "en";
  $("#scenario-title").textContent = projection.scenario_title;
  $("#session-meta").textContent = `${gameplayLanguageName(languageTag)} · ${projection.participants.length} player${projection.participants.length === 1 ? "" : "s"}`;
  $("#gameplay-language").textContent = gameplayLanguageName(languageTag);
  $("#player-count").textContent = String(projection.participants.length);
  $("#vote-count").textContent = String(projection.votes_cast);
  $("#scene-name").textContent = projection.active_scene?.name ?? "The room is gathering";
  $("#scene-copy").textContent = projection.active_scene?.public_narrative ?? "Stay close. The Host will begin shortly.";
  $("#character-name").textContent = ownParticipant.character_name ?? "Waiting for assignment";
  $("#private-objective").textContent = ownParticipant.private_objective ?? "Your private objective will appear here after assignment.";
  renderClues(projection.revealed_clues);
  renderVote();
  $("#outcome-card").classList.toggle("hidden", !projection.outcome);
  $("#outcome-copy").textContent = projection.outcome?.public_resolution ?? "";
  syncPrivateCover();
  $("#connection-badge").classList.add("live");
  setStatus("game", "Your private view is current.", false, true);
}

function renderClues(clues) {
  const root = $("#clues");
  if (clues.length === 0) {
    root.className = "empty";
    root.textContent = "No clues revealed to you.";
    return;
  }
  root.className = "";
  root.replaceChildren(...clues.map((clue) => {
    const item = document.createElement("div");
    item.className = "clue";
    const title = document.createElement("strong");
    title.textContent = clue.name;
    const copy = document.createElement("p");
    copy.className = "muted";
    copy.textContent = clue.description;
    item.append(title, copy);
    return item;
  }));
}

function renderVote() {
  if (!currentView) return;
  const { projection, ownParticipant, voteTargets } = currentView;
  const presentation = votingPresentation({
    phase: projection.voting_phase,
    ownVoteRecorded: ownParticipant.has_voted,
    voteTargets,
    submissionPending: voteSubmissionPending,
  });
  const card = $("#vote-card");
  card.dataset.state = presentation.kind;
  $("#vote-title").textContent = presentation.title;
  $("#vote-detail").textContent = presentation.detail;

  const options = $("#vote-options");
  const canChoose = presentation.kind === "open";
  options.replaceChildren(...(canChoose ? voteTargets.map((target, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "radio");
    button.setAttribute("aria-checked", String(target.id === selectedVoteTargetId));
    button.tabIndex = target.id === selectedVoteTargetId || (!selectedVoteTargetId && index === 0) ? 0 : -1;
    button.textContent = target.name;
    button.addEventListener("click", () => selectVote(target.id, { restoreFocus: true }));
    button.addEventListener("keydown", (event) => moveVoteFocus(event, index));
    return button;
  }) : []));

  const castButton = $("#cast-vote");
  castButton.classList.toggle("hidden", !canChoose);
  castButton.disabled = !selectedVoteTargetId || voteSubmissionPending;
  if (presentation.kind === "recorded") {
    setStatus("vote", "Your vote is recorded.", false, true);
  } else if (presentation.kind === "submitting") {
    setStatus("vote", "Submitting your selected vote…");
  } else if (!canChoose) {
    setStatus("vote", "");
  } else if (selectedVoteTargetId) {
    const selected = voteTargets.find((target) => target.id === selectedVoteTargetId);
    setStatus("vote", `${selected.name} selected. Cast your vote when ready.`);
  } else {
    setStatus("vote", "No character selected.");
  }
}

function selectVote(targetId, { restoreFocus = false } = {}) {
  if (!currentView?.voteTargets.some((target) => target.id === targetId) || voteSubmissionPending) return;
  selectedVoteTargetId = targetId;
  renderVote();
  if (restoreFocus) $("#vote-options button[aria-checked=\"true\"]")?.focus();
}

function moveVoteFocus(event, currentIndex) {
  const targets = currentView?.voteTargets ?? [];
  if (!targets.length) return;
  let nextIndex;
  if (["ArrowRight", "ArrowDown"].includes(event.key)) nextIndex = (currentIndex + 1) % targets.length;
  else if (["ArrowLeft", "ArrowUp"].includes(event.key)) nextIndex = (currentIndex - 1 + targets.length) % targets.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = targets.length - 1;
  else return;
  event.preventDefault();
  selectVote(targets[nextIndex].id, { restoreFocus: true });
}

async function castSelectedVote() {
  const authorized = currentView?.voteTargets.some((target) => target.id === selectedVoteTargetId);
  if (!authorized || voteSubmissionPending) return;
  voteSubmissionPending = true;
  renderVote();
  try {
    await connection.submit({ type: "cast_vote", target_character_id: selectedVoteTargetId });
  } catch (error) {
    voteSubmissionPending = false;
    renderVote();
    setStatus("vote", present(error), true);
  }
}

function hidePrivateView() {
  privateViewHiddenByPlayer = true;
  clearRenderedSecrets();
  projectionCurrent = false;
  syncPrivateCover("Reveal only when no one else can see your screen.");
}

function revealPrivateView() {
  if (!context || document.hidden) return;
  privateViewHiddenByPlayer = false;
  projectionCurrent = false;
  syncPrivateCover("Requesting a fresh server-authorized private view…");
  try {
    connection?.requestProjection();
  } catch (error) {
    syncPrivateCover(present(error));
  }
}

function handleVisibilityChange() {
  if (!context) return;
  if (document.hidden) {
    protectPrivateView("Private view hidden while this page is not active.");
    return;
  }
  projectionCurrent = false;
  syncPrivateCover("Requesting a fresh server-authorized private view…");
  try { connection?.requestProjection(); } catch { connection?.start(); }
}

function handlePageHide() {
  connection?.stop();
  protectPrivateView("A fresh server-authorized private view is required.");
}

function protectPrivateView(message) {
  if (!context) return;
  projectionCurrent = false;
  clearRenderedSecrets();
  syncPrivateCover(message);
}

function syncPrivateCover(message) {
  const hidden = privateViewShouldBeHidden({
    contextActive: context !== null,
    documentHidden: document.hidden,
    manuallyHidden: privateViewHiddenByPlayer,
    projectionCurrent,
  });
  document.body.classList.toggle("private-hidden", hidden);
  $("#privacy-cover").setAttribute("aria-hidden", String(!hidden));
  if (message) $("#privacy-message").textContent = message;
  const reveal = $("#reveal-private-view");
  reveal.disabled = document.hidden || !privateViewHiddenByPlayer;
  reveal.classList.toggle("hidden", !privateViewHiddenByPlayer);
}

function chooseAppearance(event) {
  const button = event.target.closest("button[data-theme]");
  if (!button) return;
  const theme = button.dataset.theme;
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = theme;
  document.querySelectorAll("#appearance-options button").forEach((option) => {
    option.setAttribute("aria-checked", String(option === button));
    option.tabIndex = option === button ? 0 : -1;
  });
}

function moveAppearanceFocus(event) {
  const options = [...document.querySelectorAll("#appearance-options button")];
  const currentIndex = options.indexOf(event.target);
  if (currentIndex < 0) return;
  let nextIndex;
  if (["ArrowRight", "ArrowDown"].includes(event.key)) nextIndex = (currentIndex + 1) % options.length;
  else if (["ArrowLeft", "ArrowUp"].includes(event.key)) nextIndex = (currentIndex - 1 + options.length) % options.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = options.length - 1;
  else return;
  event.preventDefault();
  options[nextIndex].click();
  options[nextIndex].focus();
}

function leaveEndedSession() {
  connection?.stop();
  connection = null;
  clearRenderedSecrets();
  context = null;
  privateViewHiddenByPlayer = false;
  projectionCurrent = false;
  syncPrivateCover();
  $("#game").classList.add("hidden");
  $("#join-panel").classList.remove("hidden");
  $("#connection-badge").textContent = "Private player view";
  $("#connection-badge").classList.remove("live");
  setStatus("join", "This device was removed or the session ended. Ask the Host for an active invitation to rejoin.", true);
}

function clearRenderedSecrets() {
  $("#character-name").textContent = "Private view protected";
  $("#private-objective").textContent = "";
  $("#clues").replaceChildren();
  $("#vote-options").replaceChildren();
  $("#outcome-copy").textContent = "";
  $("#outcome-card").classList.add("hidden");
  currentView = null;
  selectedVoteTargetId = null;
  voteSubmissionPending = false;
}

function setStatus(area, message, error = false, good = false) {
  const element = $(`#${area}-status`);
  element.textContent = message;
  element.className = `status${error ? " error" : good ? " good" : ""}`;
}

function present(error) {
  return error instanceof ApiProblem ? `${error.message} (${error.code})` : error.message ?? "Something went wrong.";
}
