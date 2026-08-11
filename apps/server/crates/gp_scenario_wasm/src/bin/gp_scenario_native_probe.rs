use gp_scenario::{journal::JournalEvent, schema::Scenario};
use gp_scenario_wasm::{process_request, ENGINE_ABI_VERSION};
use serde_json::json;

fn main() {
    let scenario: Scenario = serde_json::from_str(include_str!(
        "../../../../scenarios/the-stolen-artifact-v2.json"
    ))
    .expect("the committed synthetic scenario must parse");
    let events = vec![
        JournalEvent::ParticipantJoined {
            participant_id: "participant-1".into(),
            name: "Synthetic One".into(),
        },
        JournalEvent::CharacterAssigned {
            participant_id: "participant-1".into(),
            character_id: "char_1".into(),
        },
        JournalEvent::ParticipantJoined {
            participant_id: "participant-2".into(),
            name: "Synthetic Two".into(),
        },
        JournalEvent::CharacterAssigned {
            participant_id: "participant-2".into(),
            character_id: "char_2".into(),
        },
        JournalEvent::SceneAdvanced {
            scene_id: "scene_1".into(),
        },
        JournalEvent::ClueRevealed {
            clue_id: "clue_1".into(),
        },
        JournalEvent::ClueRevealed {
            clue_id: "clue_2".into(),
        },
    ];
    let journal: Vec<_> = events
        .into_iter()
        .enumerate()
        .map(|(index, event)| {
            gp_scenario::journal::JournalEntry::new(&scenario, index as u64 + 1, 0, event)
        })
        .collect();
    let request = json!({
        "abi_version": ENGINE_ABI_VERSION,
        "scenario": scenario,
        "journal": journal,
        "audience": { "kind": "stage" }
    });
    let request_bytes = serde_json::to_vec(&request).expect("probe request must serialize");
    let response: serde_json::Value = serde_json::from_slice(&process_request(&request_bytes))
        .expect("native probe response must parse");
    println!(
        "{}",
        serde_json::to_string(&json!({ "request": request, "response": response }))
            .expect("probe output must serialize")
    );
}
