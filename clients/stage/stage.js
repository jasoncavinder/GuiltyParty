const PROTOCOL_VERSION = "1.0";
const CONTROL_SUBPROTOCOL = "guiltyparty.control.v1";

const statusEl = document.getElementById("status");
const dataEl = document.getElementById("data");
const connectionForm = document.getElementById("connection-form");
const serverUrlInput = document.getElementById("server-url");

let socket;
let sessionId;
let endpointId;
let serverSequence = -1;

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
    const url = new URL("/ws/v1", origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    // Browser WebSocket APIs cannot attach an Authorization header. This
    // process-local prototype authority is never retained in browser storage.
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
    sessionId = undefined;
    endpointId = undefined;
    serverSequence = -1;
    setStatus("Checking protocol compatibility…", false);
    try {
        const compatibilityResponse = await fetch(new URL("/api/protocol", serverOrigin));
        if (!compatibilityResponse.ok) {
            throw new Error(`Compatibility check failed with HTTP ${compatibilityResponse.status}.`);
        }
        const compatibility = await compatibilityResponse.json();
        if (
            compatibility.preferred_protocol_version !== PROTOCOL_VERSION ||
            !compatibility.supported_protocol_majors.includes(1) ||
            compatibility.required_upgrade
        ) {
            throw new Error("The server does not support this Stage protocol.");
        }

        setStatus("Joining…", false);
        const response = await fetch(new URL("/api/v1/join", serverOrigin), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                protocol_version: PROTOCOL_VERSION,
                kind: "stage",
                endpoint: {
                    platform: "browser_stage",
                    capabilities: ["public_display"],
                },
            }),
        });
        if (!response.ok) {
            throw new Error(await problemMessage(response, "Join failed"));
        }
        const join = await response.json();
        sessionId = join.session_id;
        endpointId = join.endpoint_id;

        const nextSocket = new WebSocket(
            websocketUrl(serverOrigin, join.token),
            CONTROL_SUBPROTOCOL,
        );
        socket = nextSocket;
        nextSocket.addEventListener("open", () => {
            if (socket === nextSocket && nextSocket.protocol === CONTROL_SUBPROTOCOL) {
                setStatus("Connected as Stage; waiting for public state…", false);
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

    if (!acceptServerEnvelope(message)) {
        return;
    }
    if (message.type === "projection") {
        renderProjection(message.payload.projection);
        setStatus(`Connected as Stage · sequence ${message.server_sequence}.`, false);
    } else if (message.type === "error") {
        setStatus(`${message.payload.title} (${message.payload.code}).`, true);
    } else {
        setStatus("The Stage received an unsupported critical message.", true);
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

async function problemMessage(response, fallback) {
    try {
        const problem = await response.json();
        return `${problem.title} (${problem.code}; HTTP ${response.status}).`;
    } catch {
        return `${fallback} with HTTP ${response.status}.`;
    }
}

function renderProjection(projection) {
    const fragment = document.createDocumentFragment();
    fragment.append(heading(2, `${projection.scenario_title} · version ${projection.scenario_version}`));

    if (projection.active_scene) {
        fragment.append(
            heading(2, projection.active_scene.name),
            paragraph(projection.active_scene.public_narrative),
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
        paragraph(`Voting: ${projection.voting_open ? "open" : "closed"}; votes cast: ${projection.votes_cast}`),
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
