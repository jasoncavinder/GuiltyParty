console.log("Stage loaded.");

const statusEl = document.getElementById("status");
const dataEl = document.getElementById("data");
let ws;

async function joinAndConnect() {
    statusEl.textContent = "Joining...";
    try {
        const res = await fetch("http://127.0.0.1:3000/api/join", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "stage" })
        });
        const joinData = await res.json();
        
        ws = new WebSocket(`ws://127.0.0.1:3000/ws?token=${joinData.token}`);

        ws.onopen = () => {
            statusEl.textContent = "Connected (Stage)";
            statusEl.style.color = "#0f0";
        };

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === "projection") {
                renderProjection(msg.projection);
            }
        };

        ws.onclose = () => {
            statusEl.textContent = "Disconnected";
            statusEl.style.color = "#f00";
            setTimeout(joinAndConnect, 3000);
        };
    } catch (err) {
        statusEl.textContent = "Error: " + err;
        setTimeout(joinAndConnect, 3000);
    }
}

function renderProjection(proj) {
    let html = `<h2>Active Scene: ${proj.active_scene_id || "Waiting to begin..."}</h2>`;
    
    html += `<h3>Public Clues</h3><ul>`;
    for (const clue of proj.revealed_clues) {
        html += `<li><strong>${clue.name}</strong>: ${clue.description}</li>`;
    }
    html += `</ul>`;
    
    html += `<h3>Participants</h3><ul>`;
    for (const p of proj.participants) {
        html += `<li>${p.name} as ${p.character_name || "Unknown"}</li>`;
    }
    html += `</ul>`;

    dataEl.innerHTML = html;
}

joinAndConnect();
