use gp_scenario::engine::GameState;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProjectionAudience {
    Stage,
    Participant(String),
    Host,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AuthorizedProjection {
    pub scenario_id: String,
    pub scenario_version: u32,
    pub active_scene_id: Option<String>,
    pub revealed_clues: Vec<ProjectedClue>,
    pub participants: Vec<ProjectedParticipant>,
    pub voting_open: bool,
    pub votes_cast: usize,
    pub outcome: Option<ProjectedOutcome>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProjectedClue {
    pub id: String,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProjectedParticipant {
    pub participant_id: String,
    pub name: String,
    pub character_name: Option<String>,
    pub private_objective: Option<String>,
    pub has_voted: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProjectedOutcome {
    pub id: String,
    pub public_resolution: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AiProjection {
    pub scenario_id: String,
    pub scenario_version: u32,
    pub active_scene_id: Option<String>,
    pub public_clues: Vec<ProjectedClue>,
    pub participant_count: usize,
    pub assigned_character_count: usize,
    pub voting_open: bool,
    pub votes_cast: usize,
}

pub fn build_projection(state: &GameState, audience: &ProjectionAudience) -> AuthorizedProjection {
    let revealed_clues = state
        .scenario
        .clues
        .iter()
        .filter(|clue| state.revealed_clues.contains(&clue.id))
        .filter(|clue| match audience {
            ProjectionAudience::Host => true,
            ProjectionAudience::Stage => clue.is_public,
            ProjectionAudience::Participant(participant_id) => {
                clue.is_public
                    || state
                        .participants
                        .get(participant_id)
                        .and_then(|participant| participant.character_id.as_ref())
                        .is_some_and(|character_id| {
                            clue.authorized_characters.contains(character_id)
                        })
            }
        })
        .map(|clue| ProjectedClue {
            id: clue.id.clone(),
            name: clue.name.clone(),
            description: clue.description.clone(),
        })
        .collect();

    let participants = state
        .participants
        .iter()
        .map(|(id, participant)| {
            let character = participant.character_id.as_ref().and_then(|character_id| {
                state
                    .scenario
                    .characters
                    .iter()
                    .find(|character| &character.id == character_id)
            });
            let may_see_private = matches!(audience, ProjectionAudience::Host)
                || matches!(audience, ProjectionAudience::Participant(participant_id) if participant_id == id);
            let may_see_individual_vote = matches!(audience, ProjectionAudience::Host)
                || matches!(audience, ProjectionAudience::Participant(participant_id) if participant_id == id);

            ProjectedParticipant {
                participant_id: id.clone(),
                name: participant.name.clone(),
                character_name: character.map(|character| character.name.clone()),
                private_objective: may_see_private
                    .then(|| character.map(|character| character.private_objective.clone()))
                    .flatten(),
                has_voted: may_see_individual_vote.then(|| state.votes.contains_key(id)),
            }
        })
        .collect();

    let outcome = state.resolve_outcome().map(|outcome| ProjectedOutcome {
        id: outcome.id.clone(),
        public_resolution: outcome.public_resolution.clone(),
    });

    AuthorizedProjection {
        scenario_id: state.scenario.id.clone(),
        scenario_version: state.scenario.version,
        active_scene_id: state.active_scene_id.clone(),
        revealed_clues,
        participants,
        voting_open: state.voting_open,
        votes_cast: state.votes.len(),
        outcome,
    }
}

pub fn build_ai_projection(state: &GameState) -> AiProjection {
    AiProjection {
        scenario_id: state.scenario.id.clone(),
        scenario_version: state.scenario.version,
        active_scene_id: state.active_scene_id.clone(),
        public_clues: state
            .scenario
            .clues
            .iter()
            .filter(|clue| clue.is_public && state.revealed_clues.contains(&clue.id))
            .map(|clue| ProjectedClue {
                id: clue.id.clone(),
                name: clue.name.clone(),
                description: clue.description.clone(),
            })
            .collect(),
        participant_count: state.participants.len(),
        assigned_character_count: state
            .participants
            .values()
            .filter(|participant| participant.character_id.is_some())
            .count(),
        voting_open: state.voting_open,
        votes_cast: state.votes.len(),
    }
}

#[cfg(test)]
mod tests {
    use gp_scenario::{
        engine::GameState,
        journal::JournalEvent,
        schema::{Character, Clue, Scenario, SUPPORTED_SCHEMA_VERSION},
    };

    use super::*;

    fn state_with_private_information() -> GameState {
        let scenario = Scenario {
            schema_version: SUPPORTED_SCHEMA_VERSION,
            id: "projection-test".into(),
            version: 3,
            title: "Projection Test".into(),
            description: "Synthetic".into(),
            characters: vec![
                Character {
                    id: "c1".into(),
                    name: "Avery".into(),
                    public_description: "Public".into(),
                    private_objective: "Avery secret".into(),
                },
                Character {
                    id: "c2".into(),
                    name: "Blake".into(),
                    public_description: "Public".into(),
                    private_objective: "Blake secret".into(),
                },
            ],
            scenes: vec![],
            clues: vec![
                Clue {
                    id: "public".into(),
                    name: "Public clue".into(),
                    description: "Everyone knows".into(),
                    is_public: true,
                    authorized_characters: vec![],
                },
                Clue {
                    id: "private".into(),
                    name: "Private clue".into(),
                    description: "Only Avery knows".into(),
                    is_public: false,
                    authorized_characters: vec!["c1".into()],
                },
            ],
            outcomes: vec![],
        };
        let mut state = GameState::try_new(scenario).unwrap();
        for event in [
            JournalEvent::ParticipantJoined {
                participant_id: "p1".into(),
                name: "Player One".into(),
            },
            JournalEvent::CharacterAssigned {
                participant_id: "p1".into(),
                character_id: "c1".into(),
            },
            JournalEvent::ParticipantJoined {
                participant_id: "p2".into(),
                name: "Player Two".into(),
            },
            JournalEvent::CharacterAssigned {
                participant_id: "p2".into(),
                character_id: "c2".into(),
            },
            JournalEvent::ClueRevealed {
                clue_id: "public".into(),
            },
            JournalEvent::ClueRevealed {
                clue_id: "private".into(),
            },
        ] {
            state.apply(&event).unwrap();
        }
        state
    }

    #[test]
    fn stage_projection_contains_no_private_policy_or_content() {
        let json = serde_json::to_string(&build_projection(
            &state_with_private_information(),
            &ProjectionAudience::Stage,
        ))
        .unwrap();

        assert!(json.contains("Everyone knows"));
        assert!(!json.contains("Only Avery knows"));
        assert!(!json.contains("Avery secret"));
        assert!(!json.contains("authorized_characters"));
        assert!(!json.contains("is_public"));
        assert!(!json.contains("has_voted\":true"));
    }

    #[test]
    fn participant_sees_only_its_private_information() {
        let json = serde_json::to_string(&build_projection(
            &state_with_private_information(),
            &ProjectionAudience::Participant("p1".into()),
        ))
        .unwrap();

        assert!(json.contains("Only Avery knows"));
        assert!(json.contains("Avery secret"));
        assert!(!json.contains("Blake secret"));
    }

    #[test]
    fn ai_projection_is_minimized_and_excludes_all_private_information() {
        let json =
            serde_json::to_string(&build_ai_projection(&state_with_private_information())).unwrap();

        assert!(json.contains("Everyone knows"));
        assert!(!json.contains("Only Avery knows"));
        assert!(!json.contains("Avery secret"));
        assert!(!json.contains("Player One"));
    }
}
