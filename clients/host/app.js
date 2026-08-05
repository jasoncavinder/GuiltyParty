const HOST_TOKEN = "host-token-for-local-mvp-testing";

console.log("Host console loaded.");

const statusEl = document.getElementById("status");
const dataEl = document.getElementById("data");
const aiEl = document.getElementById("ai");
let ws;

function connect() {
    statusEl.textContent = "Connecting...";
    ws = new WebSocket(`ws://127.0.0.1:3000/ws?token=${HOST_TOKEN}`);

    ws.onopen = () => {
        statusEl.textContent = "Connected (Host)";
        statusEl.style.color = "green";
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "projection") {
            dataEl.innerHTML = renderProjection(msg.projection);
        } else if (msg.type === "ai_suggestion") {
            aiEl.textContent = msg.suggestion;
        } else if (msg.type === "error") {
            console.error("Server Error:", msg.message);
        }
    };

    ws.onclose = () => {
        statusEl.textContent = "Disconnected";
        statusEl.style.color = "red";
        setTimeout(connect, 3000);
    };
}

function sendEvent(eventObj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "submit_event", event: eventObj }));
    }
}

window.advanceScene = (sceneId) => {
    sendEvent({ type: "scene_advanced", scene_id: sceneId });
};

window.revealClue = (clueId) => {
    sendEvent({ type: "clue_revealed", clue_id: clueId });
};

window.assignCharacter = (participantId, characterId) => {
    sendEvent({ type: "character_assigned", participant_id: participantId, character_id: characterId });
};

window.requestAi = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        aiEl.textContent = "Requesting...";
        ws.send(JSON.stringify({ type: "request_ai_suggestion" }));
    }
};

window.simulateParticipant = async (name) => {
    try {
        const res = await fetch("http://127.0.0.1:3000/api/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "participant", display_name: name })
        });
        const joinData = await res.json();
        console.log("Simulated Participant Joined:", joinData);
    } catch (err) {
        console.error("Failed to simulate participant:", err);
    }
};

function renderProjection(proj) {
    let html = `<h3>Active Scene: ${proj.active_scene_id || "None"}</h3>`;
    
    html += `<h4>Revealed Clues</h4><ul>`;
    for (const clue of proj.revealed_clues) {
        html += `<li><strong>${clue.name}</strong> (${clue.is_public ? 'Public' : 'Private'}): ${clue.description}</li>`;
    }
    html += `</ul>`;

    html += `<h4>Participants</h4><ul>`;
    for (const p of proj.participants) {
        html += `<li>${p.name} - ${p.character_name || "Unassigned"}
            ${p.private_objective ? ` (Objective: ${p.private_objective})` : ""}
            <div>
                Assign:
                <button onclick="assignCharacter('${p.participant_id}', 'char_1')">Alice</button>
                <button onclick="assignCharacter('${p.participant_id}', 'char_2')">Bob</button>
            </div>
        </li>`;
    }
    html += `</ul>`;

    return html;
}

connect();
