const statusEl = document.getElementById("status");
const dataEl = document.getElementById("data");
const connectionForm = document.getElementById("connection-form");
const serverUrlInput = document.getElementById("server-url");

let socket;

serverUrlInput.value = configuredServerOrigin();
connectionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    joinAndConnect();
});

function configuredServerOrigin() {
    const queryValue = new URLSearchParams(window.location.search).get("server");
    if (queryValue) {
        return queryValue;
    }
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

async function joinAndConnect() {
    let serverOrigin;
    try {
        serverOrigin = normalizeServerOrigin(serverUrlInput.value);
    } catch (error) {
        setStatus(error.message, true);
        return;
    }

    if (socket) {
        socket.close();
    }
    setStatus("Joining…", false);
    try {
        const response = await fetch(new URL("/api/join", serverOrigin), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "stage" })
        });
        if (!response.ok) {
            throw new Error(`Join failed with HTTP ${response.status}.`);
        }
        const join = await response.json();
        const nextSocket = new WebSocket(websocketUrl(serverOrigin, join.token));
        socket = nextSocket;
        nextSocket.addEventListener("open", () => {
            if (socket === nextSocket) {
                setStatus("Connected as Stage.", false);
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
    } catch (error) {
        setStatus(error.message, true);
    }
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
    } else if (message.type === "error") {
        setStatus(message.message, true);
    }
}

function renderProjection(projection) {
    const fragment = document.createDocumentFragment();
    fragment.append(heading(2, `${projection.scenario_title} · version ${projection.scenario_version}`));

    if (projection.active_scene) {
        fragment.append(
            heading(2, projection.active_scene.name),
            paragraph(projection.active_scene.public_narrative)
        );
    } else {
        fragment.append(heading(2, "Waiting for the story to begin…"));
    }

    fragment.append(heading(3, "Public Clues"));
    const clues = document.createElement("ul");
    for (const clue of projection.revealed_clues) {
        const item = document.createElement("li");
        const name = document.createElement("strong");
        name.textContent = clue.name;
        item.append(name, document.createTextNode(`: ${clue.description}`));
        clues.append(item);
    }
    fragment.append(clues, heading(3, "Participants"));

    const participants = document.createElement("ul");
    for (const participant of projection.participants) {
        const item = document.createElement("li");
        item.textContent = `${participant.name} as ${participant.character_name || "Unassigned"}`;
        participants.append(item);
    }
    fragment.append(
        participants,
        paragraph(`Voting: ${projection.voting_open ? "open" : "closed"}; votes cast: ${projection.votes_cast}`)
    );
    if (projection.outcome) {
        fragment.append(heading(3, "Outcome"), paragraph(projection.outcome.public_resolution));
    }
    dataEl.replaceChildren(fragment);
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

function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.className = isError ? "status-error" : "status-ok";
}
