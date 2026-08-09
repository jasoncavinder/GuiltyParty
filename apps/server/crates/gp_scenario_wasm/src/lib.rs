use gp_scenario::{
    journal::{replay, JournalEntry},
    projection::{build_projection, ProjectionAudience},
    schema::Scenario,
};
use serde::Deserialize;
use serde_json::json;

pub const ENGINE_ABI_VERSION: u32 = 1;
const MAXIMUM_REQUEST_BYTES: usize = 1024 * 1024;

#[derive(Debug, Deserialize)]
struct EngineRequest {
    abi_version: u32,
    scenario: Scenario,
    journal: Vec<JournalEntry>,
    audience: AudienceRequest,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
enum AudienceRequest {
    Host,
    Stage,
    Participant { participant_id: String },
}

impl From<AudienceRequest> for ProjectionAudience {
    fn from(value: AudienceRequest) -> Self {
        match value {
            AudienceRequest::Host => Self::Host,
            AudienceRequest::Stage => Self::Stage,
            AudienceRequest::Participant { participant_id } => Self::Participant(participant_id),
        }
    }
}

pub fn process_request(input: &[u8]) -> Vec<u8> {
    if input.len() > MAXIMUM_REQUEST_BYTES {
        return error_response("request_too_large", "Engine request is too large");
    }
    let request: EngineRequest = match serde_json::from_slice(input) {
        Ok(value) => value,
        Err(_) => return error_response("invalid_request", "Engine request is invalid"),
    };
    if request.abi_version != ENGINE_ABI_VERSION {
        return error_response("unsupported_abi", "Engine ABI version is unsupported");
    }
    let state = match replay(request.scenario, &request.journal) {
        Ok(value) => value,
        Err(_) => return error_response("replay_failed", "Canonical journal replay failed"),
    };
    let projection = build_projection(&state, &request.audience.into());
    serde_json::to_vec(&json!({
        "ok": true,
        "abi_version": ENGINE_ABI_VERSION,
        "server_sequence": request.journal.len(),
        "projection": projection,
    }))
    .unwrap_or_else(|_| error_response("serialization_failed", "Engine response failed"))
}

fn error_response(code: &str, title: &str) -> Vec<u8> {
    serde_json::to_vec(&json!({
        "ok": false,
        "abi_version": ENGINE_ABI_VERSION,
        "code": code,
        "title": title,
    }))
    .unwrap_or_else(|_| b"{\"ok\":false,\"code\":\"serialization_failed\"}".to_vec())
}

#[no_mangle]
pub extern "C" fn gp_engine_abi_version() -> u32 {
    ENGINE_ABI_VERSION
}

#[no_mangle]
pub extern "C" fn gp_alloc(length: u32) -> u32 {
    if length == 0 || length as usize > MAXIMUM_REQUEST_BYTES {
        return 0;
    }
    let buffer = vec![0_u8; length as usize].into_boxed_slice();
    Box::into_raw(buffer) as *mut u8 as usize as u32
}

/// # Safety
///
/// `pointer` and `length` must describe a buffer returned by `gp_alloc` that
/// has not already been freed.
#[no_mangle]
pub unsafe extern "C" fn gp_free(pointer: u32, length: u32) {
    if pointer == 0 || length == 0 || length as usize > MAXIMUM_REQUEST_BYTES {
        return;
    }
    let slice = std::ptr::slice_from_raw_parts_mut(pointer as usize as *mut u8, length as usize);
    drop(Box::from_raw(slice));
}

/// # Safety
///
/// `pointer` and `length` must describe initialized request bytes in a buffer
/// allocated by the module. The caller continues to own and free that input.
#[no_mangle]
pub unsafe extern "C" fn gp_process(pointer: u32, length: u32) -> u32 {
    let response = if pointer == 0 || length == 0 || length as usize > MAXIMUM_REQUEST_BYTES {
        error_response("invalid_request", "Engine request is invalid")
    } else {
        process_request(std::slice::from_raw_parts(
            pointer as usize as *const u8,
            length as usize,
        ))
    };
    frame_output(response)
}

/// # Safety
///
/// `pointer` must be a live output returned by `gp_process`.
#[no_mangle]
pub unsafe extern "C" fn gp_output_length(pointer: u32) -> u32 {
    if pointer == 0 {
        return 0;
    }
    let prefix = std::slice::from_raw_parts(pointer as usize as *const u8, 4);
    u32::from_le_bytes(prefix.try_into().expect("fixed prefix length"))
}

#[no_mangle]
pub extern "C" fn gp_output_data(pointer: u32) -> u32 {
    pointer.checked_add(4).unwrap_or(0)
}

/// # Safety
///
/// `pointer` must be a live output returned by `gp_process` that has not
/// already been freed.
#[no_mangle]
pub unsafe extern "C" fn gp_output_free(pointer: u32) {
    if pointer == 0 {
        return;
    }
    let length = gp_output_length(pointer) as usize;
    if length > MAXIMUM_REQUEST_BYTES {
        return;
    }
    let total = match length.checked_add(4) {
        Some(value) => value,
        None => return,
    };
    let slice = std::ptr::slice_from_raw_parts_mut(pointer as usize as *mut u8, total);
    drop(Box::from_raw(slice));
}

fn frame_output(response: Vec<u8>) -> u32 {
    let length = response.len().min(MAXIMUM_REQUEST_BYTES);
    let mut framed = Vec::with_capacity(length + 4);
    framed.extend_from_slice(&(length as u32).to_le_bytes());
    framed.extend_from_slice(&response[..length]);
    Box::into_raw(framed.into_boxed_slice()) as *mut u8 as usize as u32
}

#[cfg(test)]
mod tests {
    use super::*;
    use gp_scenario::{journal::JournalEvent, projection::build_projection};

    fn fixture() -> (Scenario, Vec<JournalEntry>) {
        let scenario: Scenario = serde_json::from_str(include_str!(
            "../../../scenarios/the-stolen-artifact-v1.json"
        ))
        .unwrap();
        let events = vec![
            JournalEvent::ParticipantJoined {
                participant_id: "participant-1".into(),
                name: "Synthetic One".into(),
            },
            JournalEvent::CharacterAssigned {
                participant_id: "participant-1".into(),
                character_id: scenario.characters[0].id.clone(),
            },
            JournalEvent::ClueRevealed {
                clue_id: scenario.clues[0].id.clone(),
            },
        ];
        let journal = events
            .into_iter()
            .enumerate()
            .map(|(index, event)| JournalEntry::new(&scenario, index as u64 + 1, 0, event))
            .collect();
        (scenario, journal)
    }

    #[test]
    fn json_boundary_matches_the_native_projection() {
        let (scenario, journal) = fixture();
        let native_state = replay(scenario.clone(), &journal).unwrap();
        let native = build_projection(&native_state, &ProjectionAudience::Stage);
        let request = json!({
            "abi_version": ENGINE_ABI_VERSION,
            "scenario": scenario,
            "journal": journal,
            "audience": { "kind": "stage" }
        });
        let response: serde_json::Value =
            serde_json::from_slice(&process_request(&serde_json::to_vec(&request).unwrap()))
                .unwrap();
        assert_eq!(response["ok"], true);
        assert_eq!(
            response["projection"],
            serde_json::to_value(native).unwrap()
        );
    }

    #[test]
    fn malformed_or_discontinuous_input_fails_closed() {
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&process_request(b"not-json")).unwrap()
                ["code"],
            "invalid_request"
        );

        let (scenario, mut journal) = fixture();
        journal[0].sequence_number = 2;
        let request = json!({
            "abi_version": ENGINE_ABI_VERSION,
            "scenario": scenario,
            "journal": journal,
            "audience": { "kind": "host" }
        });
        let response: serde_json::Value =
            serde_json::from_slice(&process_request(&serde_json::to_vec(&request).unwrap()))
                .unwrap();
        assert_eq!(response["code"], "replay_failed");
    }
}
