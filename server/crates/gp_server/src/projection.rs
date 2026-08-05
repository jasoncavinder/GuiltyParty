use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthorizedProjection {
    pub active_scene_id: Option<String>,
    pub revealed_clues: Vec<gp_scenario::schema::Clue>,
    pub participants: Vec<ProjectedParticipant>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProjectedParticipant {
    pub participant_id: String,
    pub name: String,
    pub character_name: Option<String>,
    // Only populated if this projection belongs to the participant (or host)
    pub private_objective: Option<String>,
}

pub fn build_projection(
    state: &gp_scenario::engine::GameState,
    requester_participant_id: Option<&str>,
    is_host: bool,
) -> AuthorizedProjection {
    let mut revealed_clues = Vec::new();
    for clue in &state.scenario.clues {
        if state.revealed_clues.contains(&clue.id) {
            if is_host || clue.is_public {
                revealed_clues.push(clue.clone());
            } else if let Some(req_id) = requester_participant_id {
                // If private, check if requester's assigned character is authorized
                if let Some(participant) = state.participants.get(req_id) {
                    if let Some(char_id) = &participant.character_id {
                        if clue.authorized_characters.contains(char_id) {
                            revealed_clues.push(clue.clone());
                        }
                    }
                }
            }
        }
    }

    let mut participants = Vec::new();
    for (id, participant_state) in &state.participants {
        let mut character_name = None;
        let mut private_objective = None;

        if let Some(char_id) = &participant_state.character_id {
            if let Some(character) = state.scenario.characters.iter().find(|c| &c.id == char_id) {
                character_name = Some(character.name.clone());
                
                // Authorize private objective visibility
                if is_host || requester_participant_id == Some(id) {
                    private_objective = Some(character.private_objective.clone());
                }
            }
        }

        participants.push(ProjectedParticipant {
            participant_id: id.clone(),
            name: participant_state.name.clone(),
            character_name,
            private_objective,
        });
    }

    AuthorizedProjection {
        active_scene_id: state.active_scene_id.clone(),
        revealed_clues,
        participants,
    }
}

