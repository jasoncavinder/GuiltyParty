(function () {
  "use strict";

  var core = window.GuiltyPartyStageCore;
  var state = {
    pairing: null,
    authority: null,
    ticket: null,
    projection: null,
    sequence: new core.SequenceTracker()
  };
  var connection = null;
  var connectionGeneration = 0;
  var pairingTimer = null;
  var countdownTimer = null;
  var reconnectTimer = null;
  var stableTimer = null;
  var reconnectAttempt = 0;
  var suspended = document.visibilityState === "hidden";
  var shuttingDown = false;

  var elements = {
    connectionState: document.getElementById("connection-state"),
    setupView: document.getElementById("setup-view"),
    setupTitle: document.getElementById("setup-title"),
    setupMessage: document.getElementById("setup-message"),
    pairingCode: document.getElementById("pairing-code"),
    pairingExpiry: document.getElementById("pairing-expiry"),
    retryButton: document.getElementById("retry-button"),
    stageView: document.getElementById("stage-view"),
    scenarioVersion: document.getElementById("scenario-version"),
    scenarioTitle: document.getElementById("scenario-title"),
    votingStatus: document.getElementById("voting-status"),
    sceneTitle: document.getElementById("scene-title"),
    sceneNarrative: document.getElementById("scene-narrative"),
    cluesList: document.getElementById("clues-list"),
    castList: document.getElementById("cast-list"),
    outcomePanel: document.getElementById("outcome-panel"),
    outcomeResolution: document.getElementById("outcome-resolution"),
    connectionOverlay: document.getElementById("connection-overlay"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayMessage: document.getElementById("overlay-message"),
    exitDialog: document.getElementById("exit-dialog"),
    stayButton: document.getElementById("stay-button"),
    exitButton: document.getElementById("exit-button")
  };

  elements.retryButton.addEventListener("click", beginPairing);
  elements.stayButton.addEventListener("click", hideExitDialog);
  elements.exitButton.addEventListener("click", exitApplication);
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  window.addEventListener("pagehide", terminateMemory);
  window.addEventListener("unload", terminateMemory);

  beginPairing();

  function beginPairing() {
    resetRuntime(true);
    setConnectionState("Pairing", "pairing");
    showSetup("Preparing a Stage code…", "This display receives public story information only.", false);
    requestJson("/api/v1/stage-pairings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        protocol_version: core.PROTOCOL_VERSION,
        endpoint: {
          platform: "webos",
          capabilities: ["public_display"],
          client_build: core.STAGE_BUILD
        }
      })
    }).then(function (result) {
      var transaction = core.validatePairingCreate(result.body, Date.now());
      state.pairing = transaction;
      elements.pairingCode.textContent = transaction.pairing_code;
      elements.pairingCode.hidden = false;
      showSetup(
        "Approve this television",
        "In the Host Console, enter the code shown here. Waiting reveals no session or story details.",
        false
      );
      updatePairingCountdown();
      countdownTimer = setInterval(updatePairingCountdown, 1000);
      schedulePairingPoll(transaction.poll_after_ms);
    }).catch(function (error) {
      pairingFailure(error, "A Stage code could not be created.");
    });
  }

  function schedulePairingPoll(delay) {
    clearTimeout(pairingTimer);
    pairingTimer = setTimeout(pollPairing, delay);
  }

  function pollPairing() {
    var pairing = state.pairing;
    if (!pairing) return;
    if (core.pairingExpired(pairing.expires_at_unix_ms, Date.now())) {
      expirePairing();
      return;
    }
    requestJson(pairing.redeem_path, {
      method: "POST",
      headers: { "Authorization": "StagePairing " + pairing.polling_secret }
    }).then(function (result) {
      var join;
      if (!state.pairing || state.pairing !== pairing) return;
      if (result.status === 202) {
        core.validatePending(result.body, Date.now());
        schedulePairingPoll(result.body.retry_after_ms);
        return;
      }
      join = core.validateJoin(result.body, Date.now());
      clearPairing();
      state.authority = {
        token: join.token,
        session_id: join.session_id,
        endpoint_id: join.endpoint_id,
        expires_at_unix_ms: join.authority_expires_at_unix_ms
      };
      setConnectionState("Connecting", "connecting");
      connectWithFreshTicket(true);
    }).catch(function (error) {
      pairingFailure(error, "Stage approval could not be completed.");
    });
  }

  function connectWithFreshTicket(immediate) {
    var authority = state.authority;
    if (!authority || shuttingDown || suspended || !navigator.onLine) return;
    if (Date.now() >= authority.expires_at_unix_ms) {
      terminalState("Stage approval expired", "Pair this television again to continue.");
      return;
    }
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
    if (!immediate) {
      scheduleReconnect();
      return;
    }
    setConnectionState("Connecting", "connecting");
    requestJson("/api/v1/websocket-tickets", {
      method: "POST",
      headers: { "Authorization": "Bearer " + authority.token }
    }).then(function (result) {
      var ticket;
      if (state.authority !== authority || suspended || shuttingDown) return;
      ticket = core.validateTicket(result.body, Date.now());
      state.ticket = ticket;
      openSocket(ticket);
      ticket.websocket_subprotocol = null;
      state.ticket = null;
    }).catch(function (error) {
      if (error && core.terminalHttpStatus(error.status)) {
        terminalState("Stage access ended", "The Host may have ended the session, revoked this display, or allowed its approval to expire.");
        return;
      }
      showReconnect("Connection unavailable", "A fresh-ticket reconnect will be attempted.");
      scheduleReconnect(error && error.retryAfterMs);
    });
  }

  function openSocket(ticket) {
    var generation;
    var socket;
    closeSocket(1000, "Replacing connection");
    connectionGeneration += 1;
    generation = connectionGeneration;
    state.sequence.startConnection();
    try {
      socket = new WebSocket("wss://api.test.guiltyparty.app/ws/v1", [
        core.CONTROL_SUBPROTOCOL,
        ticket.websocket_subprotocol
      ]);
    } catch (error) {
      showReconnect("WebSocket unavailable", "This runtime could not start the authenticated connection.");
      scheduleReconnect();
      return;
    }
    connection = socket;
    socket.onopen = function () {
      if (generation !== connectionGeneration || connection !== socket) return;
      if (socket.protocol !== core.CONTROL_SUBPROTOCOL) {
        socket.close(1002, "Required subprotocol not selected");
        terminalState("Incompatible server", "The server did not select the required Guilty Party control protocol.");
        return;
      }
      setConnectionState("Connected", "connected");
      hideReconnect();
      clearTimeout(stableTimer);
      stableTimer = setTimeout(function () { reconnectAttempt = 0; }, 60000);
      requestProjection(socket);
    };
    socket.onmessage = function (event) {
      if (generation !== connectionGeneration || connection !== socket) return;
      receiveMessage(socket, event.data);
    };
    socket.onerror = function () {
      if (generation !== connectionGeneration || connection !== socket) return;
      setConnectionState("Connection uncertain", "uncertain");
      showReconnect("Connection uncertain", "The Stage is waiting for a confirmed server connection.");
    };
    socket.onclose = function (event) {
      if (generation !== connectionGeneration || connection !== socket) return;
      connection = null;
      clearTimeout(stableTimer);
      stableTimer = null;
      if (shuttingDown || suspended) return;
      if (core.terminalSocketClose(event.code)) {
        terminalState("Stage access ended", "Pair this television again if the session is still available.");
        return;
      }
      showReconnect("Reconnecting", "The Stage will request a new single-use ticket.");
      scheduleReconnect();
    };
  }

  function requestProjection(socket) {
    var authority = state.authority;
    if (!authority || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({
      protocol_version: core.PROTOCOL_VERSION,
      type: "get_projection",
      message_id: messageIdentifier(),
      session_id: authority.session_id,
      endpoint_id: authority.endpoint_id,
      payload: {}
    }));
  }

  function receiveMessage(socket, encoded) {
    var value;
    var envelope;
    var sequenceResult;
    try {
      if (typeof encoded !== "string" || encoded.length > 65536) throw new Error("Invalid server message size");
      value = JSON.parse(encoded);
      envelope = core.validateEnvelope(value, state.authority);
    } catch (error) {
      socket.close(1002, "Invalid server envelope");
      terminalState("Unsafe server response", "The Stage rejected an invalid or private control-plane message.");
      return;
    }
    if (envelope.type === "error") {
      if (/expired|revoked|ended|authority|removed/.test(envelope.code)) {
        socket.close(1008, "Authority ended");
        terminalState("Stage access ended", envelope.title + ". Pair again if the session is still available.");
      } else {
        socket.close(1011, "Server rejected projection request");
        showReconnect("Server rejected the request", envelope.title + ". A fresh connection will be attempted.");
      }
      return;
    }
    sequenceResult = state.sequence.accept(envelope.sequence);
    if (sequenceResult === "duplicate") return;
    if (sequenceResult === "resync") {
      socket.close(1011, "Projection sequence requires resynchronization");
      showReconnect("Refreshing public state", "The Stage detected a sequence gap and will request a complete projection.");
      return;
    }
    state.projection = envelope.projection;
    renderProjection(envelope.projection);
  }

  function renderProjection(projection) {
    var index;
    var clue;
    var participant;
    var item;
    var title;
    var detail;
    elements.setupView.hidden = true;
    elements.stageView.hidden = false;
    elements.scenarioVersion.textContent = "Scenario version " + projection.scenario_version;
    elements.scenarioTitle.textContent = projection.scenario_title;
    elements.votingStatus.textContent = projection.voting_open
      ? "Voting open · " + projection.votes_cast + " vote" + (projection.votes_cast === 1 ? "" : "s") + " cast"
      : "Voting closed · " + projection.votes_cast + " vote" + (projection.votes_cast === 1 ? "" : "s") + " cast";
    if (projection.active_scene) {
      elements.sceneTitle.textContent = projection.active_scene.name;
      elements.sceneNarrative.textContent = projection.active_scene.public_narrative;
    } else {
      elements.sceneTitle.textContent = "Waiting for the story to begin";
      elements.sceneNarrative.textContent = "The Host will begin when everyone is ready.";
    }
    clearChildren(elements.cluesList);
    if (projection.revealed_clues.length === 0) {
      item = document.createElement("li");
      item.className = "empty-item";
      item.textContent = "No public clues have been revealed.";
      elements.cluesList.appendChild(item);
    }
    for (index = 0; index < projection.revealed_clues.length; index += 1) {
      clue = projection.revealed_clues[index];
      item = document.createElement("li");
      title = document.createElement("strong");
      detail = document.createElement("span");
      title.textContent = clue.name;
      detail.textContent = clue.description;
      item.appendChild(title);
      item.appendChild(detail);
      elements.cluesList.appendChild(item);
    }
    clearChildren(elements.castList);
    if (projection.participants.length === 0) {
      item = document.createElement("li");
      item.className = "empty-item";
      item.textContent = "Waiting for the cast.";
      elements.castList.appendChild(item);
    }
    for (index = 0; index < projection.participants.length; index += 1) {
      participant = projection.participants[index];
      item = document.createElement("li");
      title = document.createElement("strong");
      detail = document.createElement("span");
      title.textContent = participant.character_name || "Character not assigned";
      detail.textContent = participant.name;
      item.appendChild(title);
      item.appendChild(detail);
      elements.castList.appendChild(item);
    }
    if (projection.outcome) {
      elements.outcomeResolution.textContent = projection.outcome.public_resolution;
      elements.outcomePanel.hidden = false;
    } else {
      elements.outcomeResolution.textContent = "";
      elements.outcomePanel.hidden = true;
    }
  }

  function requestJson(path, options) {
    var headers = options.headers || {};
    headers.Accept = "application/json";
    return fetch(core.API_ORIGIN + path, {
      method: options.method,
      cache: "no-store",
      headers: headers,
      body: options.body
    }).then(function (response) {
      var retryAfter = Number(response.headers.get("Retry-After") || 0);
      return response.json().catch(function () { return null; }).then(function (body) {
        var error;
        if (!response.ok) {
          error = new Error(body && body.title ? body.title : "Request failed");
          error.status = response.status;
          error.code = body && body.code ? body.code : "request_failed";
          error.retryAfterMs = retryAfter > 0 ? retryAfter * 1000 : 0;
          throw error;
        }
        return { status: response.status, body: body };
      });
    });
  }

  function scheduleReconnect(minimumDelay) {
    var delay;
    if (reconnectTimer || shuttingDown || suspended || !navigator.onLine || !state.authority) return;
    delay = core.reconnectDelayMs(reconnectAttempt, Math.random());
    if (minimumDelay && minimumDelay > delay) delay = minimumDelay;
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      connectWithFreshTicket(true);
    }, delay);
  }

  function handleVisibilityChange() {
    suspended = document.visibilityState === "hidden";
    if (suspended) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
      closeSocket(1000, "Application suspended");
      setConnectionState("Suspended", "uncertain");
      return;
    }
    if (state.authority) {
      showReconnect("Resuming", "The Stage is requesting fresh public state with a new ticket.");
      connectWithFreshTicket(true);
    } else if (!state.pairing) {
      beginPairing();
    }
  }

  function handleOffline() {
    closeSocket(1000, "Network unavailable");
    setConnectionState("Offline", "offline");
    showReconnect("Network unavailable", "The Stage will reconnect when this television is online.");
  }

  function handleOnline() {
    if (!suspended && state.authority) {
      showReconnect("Network restored", "The Stage is requesting a new single-use ticket.");
      connectWithFreshTicket(true);
    } else if (!suspended && !state.pairing) {
      beginPairing();
    }
  }

  function pairingFailure(error, fallback) {
    if (state.pairing && core.pairingExpired(state.pairing.expires_at_unix_ms, Date.now())) {
      expirePairing();
      return;
    }
    if (error && (error.status === 404 || error.status === 410)) {
      expirePairing();
      return;
    }
    if (error && (error.status === 401 || error.status === 403)) {
      terminalState("Pairing rejected", "The server rejected this packaged Stage transport. No weaker connection will be attempted.");
      return;
    }
    clearPairing();
    setConnectionState("Unavailable", "offline");
    showSetup("Stage unavailable", fallback + " Check the network, then try again.", true);
  }

  function expirePairing() {
    clearPairing();
    setConnectionState("Code expired", "offline");
    showSetup("Stage code expired", "Create a new code when the Host is ready.", true);
  }

  function updatePairingCountdown() {
    var seconds;
    if (!state.pairing) return;
    seconds = Math.max(0, Math.ceil((state.pairing.expires_at_unix_ms - Date.now()) / 1000));
    elements.pairingExpiry.textContent = seconds > 0 ? "Expires in " + seconds + " seconds" : "Code expired";
    if (seconds === 0) expirePairing();
  }

  function terminalState(title, message) {
    resetRuntime(false);
    setConnectionState("Disconnected", "offline");
    showSetup(title, message, true);
  }

  function resetRuntime(preserveSetup) {
    clearTimeout(pairingTimer);
    clearInterval(countdownTimer);
    clearTimeout(reconnectTimer);
    clearTimeout(stableTimer);
    pairingTimer = null;
    countdownTimer = null;
    reconnectTimer = null;
    stableTimer = null;
    reconnectAttempt = 0;
    closeSocket(1000, "Runtime reset");
    core.clearSensitiveState(state);
    hideReconnect();
    if (!preserveSetup) clearProjectionView();
  }

  function clearPairing() {
    clearTimeout(pairingTimer);
    clearInterval(countdownTimer);
    pairingTimer = null;
    countdownTimer = null;
    if (state.pairing) state.pairing.polling_secret = null;
    state.pairing = null;
    elements.pairingCode.textContent = "";
    elements.pairingCode.hidden = true;
    elements.pairingExpiry.textContent = "";
  }

  function terminateMemory() {
    if (shuttingDown) return;
    shuttingDown = true;
    resetRuntime(false);
  }

  function closeSocket(code, reason) {
    var socket = connection;
    connectionGeneration += 1;
    connection = null;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      try { socket.close(code, reason); } catch (ignore) {}
    }
  }

  function showSetup(title, message, retryVisible) {
    elements.setupTitle.textContent = title;
    elements.setupMessage.textContent = message;
    elements.retryButton.hidden = !retryVisible;
    elements.setupView.hidden = false;
    elements.stageView.hidden = true;
    if (retryVisible) elements.retryButton.focus();
  }

  function clearProjectionView() {
    state.projection = null;
    elements.stageView.hidden = true;
    clearChildren(elements.cluesList);
    clearChildren(elements.castList);
    elements.scenarioTitle.textContent = "";
    elements.sceneNarrative.textContent = "";
    elements.outcomeResolution.textContent = "";
  }

  function showReconnect(title, message) {
    if (elements.stageView.hidden) return;
    elements.overlayTitle.textContent = title;
    elements.overlayMessage.textContent = message;
    elements.connectionOverlay.hidden = false;
  }

  function hideReconnect() {
    elements.connectionOverlay.hidden = true;
  }

  function setConnectionState(label, kind) {
    elements.connectionState.textContent = label;
    elements.connectionState.className = "connection-state " + kind;
  }

  function handleKeyDown(event) {
    var key = event.key || "";
    var code = event.keyCode;
    if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown" || code === 37 || code === 38 || code === 39 || code === 40) {
      event.preventDefault();
      moveFocus(key || ({ 37: "ArrowLeft", 38: "ArrowUp", 39: "ArrowRight", 40: "ArrowDown" })[code]);
      return;
    }
    if (key === "Enter" || code === 13) {
      if (document.activeElement && document.activeElement.className.indexOf("focusable") >= 0) {
        event.preventDefault();
        document.activeElement.click();
      }
      return;
    }
    if (key === "Escape" || key === "Back" || code === 27 || code === 461) {
      event.preventDefault();
      if (!elements.exitDialog.hidden) hideExitDialog();
      else showExitDialog();
    }
  }

  function moveFocus(direction) {
    var candidates = visibleFocusable();
    var current = document.activeElement;
    var currentRect;
    var best = null;
    var bestScore = Infinity;
    var index;
    var rect;
    var horizontal;
    var vertical;
    var primary;
    var secondary;
    if (candidates.length === 0) return;
    if (candidates.indexOf(current) < 0) {
      candidates[0].focus();
      return;
    }
    currentRect = current.getBoundingClientRect();
    for (index = 0; index < candidates.length; index += 1) {
      if (candidates[index] === current) continue;
      rect = candidates[index].getBoundingClientRect();
      horizontal = (rect.left + rect.width / 2) - (currentRect.left + currentRect.width / 2);
      vertical = (rect.top + rect.height / 2) - (currentRect.top + currentRect.height / 2);
      if ((direction === "ArrowLeft" && horizontal >= 0) || (direction === "ArrowRight" && horizontal <= 0) || (direction === "ArrowUp" && vertical >= 0) || (direction === "ArrowDown" && vertical <= 0)) continue;
      primary = direction === "ArrowLeft" || direction === "ArrowRight" ? Math.abs(horizontal) : Math.abs(vertical);
      secondary = direction === "ArrowLeft" || direction === "ArrowRight" ? Math.abs(vertical) : Math.abs(horizontal);
      if (primary * 10 + secondary < bestScore) {
        bestScore = primary * 10 + secondary;
        best = candidates[index];
      }
    }
    if (best) best.focus();
  }

  function visibleFocusable() {
    var all = document.querySelectorAll(".focusable");
    var output = [];
    var index;
    for (index = 0; index < all.length; index += 1) {
      if (!all[index].hidden && all[index].offsetWidth > 0 && all[index].offsetHeight > 0) output.push(all[index]);
    }
    return output;
  }

  function showExitDialog() {
    elements.exitDialog.hidden = false;
    elements.stayButton.focus();
  }

  function hideExitDialog() {
    elements.exitDialog.hidden = true;
  }

  function exitApplication() {
    terminateMemory();
    window.parent.postMessage("guiltyparty.stage.exit", "*");
  }

  function messageIdentifier() {
    return "stage_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 0x100000000).toString(36);
  }

  function clearChildren(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }
}());
