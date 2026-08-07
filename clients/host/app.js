const PROTOCOL_VERSION = "1.0";
const CONTROL_SUBPROTOCOL = "guiltyparty.control.v1";

const statusEl = document.getElementById("status");
const dataEl = document.getElementById("data");
const aiEl = document.getElementById("ai");
const connectionForm = document.getElementById("connection-form");
const serverUrlInput = document.getElementById("server-url");
const hostTokenInput = document.getElementById("host-token");

let socket;
let serverOrigin;
let sessionId;
let endpointId;
let serverSequence = -1;
const primaryAuthorityGeneration = 0;

serverUrlInput.value = defaultServerOrigin();

connectionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    connect();
});

document.getElementById("scene-1").addEventListener("click", () => {
    sendCommand({ type: "advance_scene", scene_id: "scene_1" });
});
document.getElementById("scene-2").addEventListener("click", () => {
    sendCommand({ type: "advance_scene", scene_id: "scene_2" });
});
document.getElementById("clue-1").addEventListener("click", () => {
    sendCommand({ type: "reveal_clue", clue_id: "clue_1" });
});
document.getElementById("clue-2").addEventListener("click", () => {
    sendCommand({ type: "reveal_clue", clue_id: "clue_2" });
});
document.getElementById("open-voting").addEventListener("click", () => {
    sendCommand({ type: "open_voting" });
});
document.getElementById("close-voting").addEventListener("click", () => {
    sendCommand({ type: "close_voting" });
});
document.getElementById("join-alice").addEventListener("click", () => {
    simulateParticipant("Synthetic Alice");
});
document.getElementById("join-bob").addEventListener("click", () => {
    simulateParticipant("Synthetic Bob");
});
document.getElementById("request-ai").addEventListener("click", requestAi);

function defaultServerOrigin() {
    const hostname = window.location.hostname || "127.0.0.1";
    return `http://${hostname}:3000`;
}

function normalizeServerOrigin(value) {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Server address must use http or https.");
    }
    return url.origin;
}

function websocketUrl(origin, token) {
    const url = new URL("/ws/v1", origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    // Browser WebSocket APIs cannot attach an Authorization header. This
    // process-local prototype authority is never retained in browser storage.
    url.searchParams.set("token", token);
    return url;
}

async function connect() {
    const token = hostTokenInput.value;
    try {
        serverOrigin = normalizeServerOrigin(serverUrlInput.value);
    } catch (error) {
        setStatus(error.message, true);
        return;
    }

    if (socket) {
        socket.close();
    }
    sessionId = undefined;
    endpointId = undefined;
    serverSequence = -1;
    setStatus("Checking protocol compatibility…", false);

    try {
        const response = await fetch(new URL("/api/protocol", serverOrigin));
        if (!response.ok) {
            throw new Error(`Compatibility check failed with HTTP ${response.status}.`);
        }
        const compatibility = await response.json();
        if (
            compatibility.preferred_protocol_version !== PROTOCOL_VERSION ||
            !compatibility.supported_protocol_majors.includes(1) ||
            compatibility.required_upgrade
        ) {
            throw new Error("The server does not support this Host Console protocol.");
        }
    } catch (error) {
        setStatus(error.message, true);
        return;
    }

    setStatus("Connecting…", false);
    const nextSocket = new WebSocket(
        websocketUrl(serverOrigin, token),
        CONTROL_SUBPROTOCOL,
    );
    socket = nextSocket;

    nextSocket.addEventListener("open", () => {
        if (socket === nextSocket && nextSocket.protocol === CONTROL_SUBPROTOCOL) {
            setStatus("Connected as Host; waiting for authorized state…", false);
        }
    });
    nextSocket.addEventListener("message", handleServerMessage);
    nextSocket.addEventListener("error", () => {
        if (socket === nextSocket) {
            setStatus("Connection failed.", true);
        }
    });
    nextSocket.addEventListener("close", () => {
        if (socket === nextSocket) {
            sessionId = undefined;
            endpointId = undefined;
            setStatus("Disconnected. Reconnect manually when ready.", true);
        }
    });
}

function handleServerMessage(event) {
    let message;
    try {
        message = JSON.parse(event.data);
    } catch {
        setStatus("The server sent an invalid message.", true);
        return;
    }

    if (!acceptServerEnvelope(message)) {
        return;
    }

    if (message.type === "projection") {
        renderProjection(message.payload.projection);
        setStatus(`Connected as Host · sequence ${message.server_sequence}.`, false);
    } else if (message.type === "ai_suggestion") {
        aiEl.textContent = message.payload.suggestion;
    } else if (message.type === "command_result") {
        if (message.payload.status === "rejected") {
            setStatus(`${message.payload.title} (${message.payload.code}).`, true);
        }
    } else if (message.type === "error") {
        setStatus(`${message.payload.title} (${message.payload.code}).`, true);
    } else {
        setStatus("The server sent an unsupported critical message.", true);
        socket.close(1002, "Unsupported message type");
    }
}

function acceptServerEnvelope(message) {
    if (
        message.protocol_version !== PROTOCOL_VERSION ||
        typeof message.message_id !== "string" ||
        typeof message.type !== "string" ||
        typeof message.payload !== "object" ||
        message.payload === null
    ) {
        setStatus("The server sent an incompatible control-plane envelope.", true);
        socket.close(1002, "Invalid envelope");
        return false;
    }

    if (sessionId === undefined) {
        sessionId = message.session_id;
        endpointId = message.endpoint_id;
    }
    if (message.session_id !== sessionId || message.endpoint_id !== endpointId) {
        setStatus("The server sent state for a different session or endpoint.", true);
        socket.close(1008, "Context mismatch");
        return false;
    }
    if (message.server_sequence !== undefined) {
        if (!Number.isInteger(message.server_sequence) || message.server_sequence < serverSequence) {
            setStatus("The server sequence regressed; reconnect to resynchronize.", true);
            socket.close(1008, "Sequence regression");
            return false;
        }
        serverSequence = message.server_sequence;
    }
    return true;
}

function sendCommand(command) {
    sendEnvelope(
        "submit_command",
        { command },
        {
            idempotency_id: newIdentifier("command"),
            primary_authority_generation: primaryAuthorityGeneration,
        },
    );
}

function requestAi() {
    if (!canSend()) {
        setStatus("Connect before requesting a suggestion.", true);
        return;
    }
    aiEl.textContent = "Requesting…";
    sendEnvelope("request_ai_suggestion", {});
}

function sendEnvelope(type, payload, extra = {}) {
    if (!canSend()) {
        setStatus("Wait for the authorized session state before sending a command.", true);
        return;
    }
    socket.send(JSON.stringify({
        protocol_version: PROTOCOL_VERSION,
        type,
        message_id: newIdentifier("message"),
        session_id: sessionId,
        endpoint_id: endpointId,
        ...extra,
        payload,
    }));
}

function canSend() {
    return socket &&
        socket.readyState === WebSocket.OPEN &&
        sessionId !== undefined &&
        endpointId !== undefined;
}

async function simulateParticipant(name) {
    if (!serverOrigin) {
        setStatus("Connect before creating a synthetic participant.", true);
        return;
    }
    try {
        const response = await fetch(new URL("/api/v1/join", serverOrigin), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                protocol_version: PROTOCOL_VERSION,
                kind: "participant",
                display_name: name,
                endpoint: {
                    platform: "browser_companion_simulator",
                    capabilities: ["private_display", "touch_input"],
                },
            }),
        });
        if (!response.ok) {
            throw new Error(await problemMessage(response, "Join failed"));
        }
        const join = await response.json();
        setStatus(`Created ${name} (${join.participant_id}). Companion authority discarded.`, false);
    } catch (error) {
        setStatus(error.message, true);
    }
}

async function problemMessage(response, fallback) {
    try {
        const problem = await response.json();
        return `${problem.title} (${problem.code}; HTTP ${response.status}).`;
    } catch {
        return `${fallback} with HTTP ${response.status}.`;
    }
}

function newIdentifier(prefix) {
    const random = new Uint32Array(4);
    crypto.getRandomValues(random);
    return `${prefix}_${Array.from(random, (value) => value.toString(16).padStart(8, "0")).join("")}`;
}

function renderProjection(projection) {
    const fragment = document.createDocumentFragment();
    fragment.append(
        heading(2, `${projection.scenario_title} · version ${projection.scenario_version}`),
        renderScene(projection.active_scene),
        heading(3, "Revealed Clues"),
        renderClues(projection.revealed_clues),
        heading(3, "Participants"),
        renderParticipants(projection.participants),
        paragraph(`Voting: ${projection.voting_open ? "open" : "closed"}; votes cast: ${projection.votes_cast}`),
    );
    if (projection.outcome) {
        fragment.append(heading(3, "Outcome"), paragraph(projection.outcome.public_resolution));
    }
    dataEl.replaceChildren(fragment);
}

function renderScene(scene) {
    const section = document.createElement("section");
    section.append(heading(3, scene ? scene.name : "No active scene"));
    if (scene) {
        section.append(paragraph(scene.public_narrative));
    }
    return section;
}

function renderClues(clues) {
    const list = document.createElement("ul");
    for (const clue of clues) {
        const item = document.createElement("li");
        item.append(document.createElement("strong"), document.createTextNode(`: ${clue.description}`));
        item.firstChild.textContent = clue.name;
        list.append(item);
    }
    return list;
}

function renderParticipants(participants) {
    const list = document.createElement("ul");
    for (const participant of participants) {
        const item = document.createElement("li");
        item.className = "participant";
        item.append(paragraph(`${participant.name} — ${participant.character_name || "Unassigned"}`));
        if (participant.private_objective) {
            item.append(paragraph(`Objective: ${participant.private_objective}`));
        }
        const aliceButton = button("Assign Alice", () => {
            sendCommand({
                type: "assign_character",
                participant_id: participant.participant_id,
                character_id: "char_1",
            });
        });
        const bobButton = button("Assign Bob", () => {
            sendCommand({
                type: "assign_character",
                participant_id: participant.participant_id,
                character_id: "char_2",
            });
        });
        item.append(aliceButton, bobButton);
        list.append(item);
    }
    return list;
}

function heading(level, text) {
    const element = document.createElement(`h${level}`);
    element.textContent = text;
    return element;
}

function paragraph(text) {
    const element = document.createElement("p");
    element.textContent = text;
    return element;
}

function button(label, action) {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    element.addEventListener("click", action);
    return element;
}

function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.className = isError ? "status-error" : "status-ok";
}
