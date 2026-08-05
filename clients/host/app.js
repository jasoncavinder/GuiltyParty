const statusEl = document.getElementById("status");
const dataEl = document.getElementById("data");
const aiEl = document.getElementById("ai");
const connectionForm = document.getElementById("connection-form");
const serverUrlInput = document.getElementById("server-url");
const hostTokenInput = document.getElementById("host-token");

let socket;
let serverOrigin;

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
    const url = new URL("/ws", origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.searchParams.set("token", token);
    return url;
}

function connect() {
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
    setStatus("Connecting…", false);
    const nextSocket = new WebSocket(websocketUrl(serverOrigin, token));
    socket = nextSocket;

    nextSocket.addEventListener("open", () => {
        if (socket === nextSocket) {
            setStatus("Connected as Host.", false);
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

    if (message.type === "projection") {
        renderProjection(message.projection);
    } else if (message.type === "ai_suggestion") {
        aiEl.textContent = message.suggestion;
    } else if (message.type === "error") {
        setStatus(message.message, true);
    }
}

function sendCommand(command) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        setStatus("Connect before sending a command.", true);
        return;
    }
    socket.send(JSON.stringify({ type: "submit_command", command }));
}

function requestAi() {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        setStatus("Connect before requesting a suggestion.", true);
        return;
    }
    aiEl.textContent = "Requesting…";
    socket.send(JSON.stringify({ type: "request_ai_suggestion" }));
}

async function simulateParticipant(name) {
    if (!serverOrigin) {
        setStatus("Connect before creating a synthetic participant.", true);
        return;
    }
    try {
        const response = await fetch(new URL("/api/join", serverOrigin), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "participant", display_name: name })
        });
        if (!response.ok) {
            throw new Error(`Join failed with HTTP ${response.status}.`);
        }
        const join = await response.json();
        setStatus(`Created ${name} (${join.participant_id}). Companion token kept out of logs.`, false);
    } catch (error) {
        setStatus(error.message, true);
    }
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
        paragraph(`Voting: ${projection.voting_open ? "open" : "closed"}; votes cast: ${projection.votes_cast}`)
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
                character_id: "char_1"
            });
        });
        const bobButton = button("Assign Bob", () => {
            sendCommand({
                type: "assign_character",
                participant_id: participant.participant_id,
                character_id: "char_2"
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
