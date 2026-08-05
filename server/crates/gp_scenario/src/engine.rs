use std::collections::{HashMap, HashSet};
use crate::schema::Scenario;
use crate::journal::JournalEvent;

#[derive(Debug, Clone, PartialEq)]
pub struct GameState {
    pub scenario: Scenario,
    pub participants: HashMap<String, ParticipantState>,
    pub endpoints: HashMap<String, EndpointState>,
    pub active_scene_id: Option<String>,
    pub revealed_clues: HashSet<String>,
    pub votes: HashMap<String, String>, // participant_id -> target_character_id
}

#[derive(Debug, Clone, PartialEq)]
pub struct ParticipantState {
    pub name: String,
    pub character_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EndpointState {
    pub participant_id: String,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum EngineError {
    ParticipantNotFound(String),
    CharacterNotFound(String),
    SceneNotFound(String),
    ClueNotFound(String),
}

impl GameState {
    pub fn new(scenario: Scenario) -> Self {
        Self {
            scenario,
            participants: HashMap::new(),
            endpoints: HashMap::new(),
            active_scene_id: None,
            revealed_clues: HashSet::new(),
            votes: HashMap::new(),
        }
    }

    pub fn apply(&mut self, event: &JournalEvent) -> Result<(), EngineError> {
        match event {
            JournalEvent::ParticipantJoined { participant_id, name } => {
                self.participants.insert(
                    participant_id.clone(),
                    ParticipantState {
                        name: name.clone(),
                        character_id: None,
                    },
                );
            }
            JournalEvent::EndpointRegistered { endpoint_id, participant_id, capabilities } => {
                if !self.participants.contains_key(participant_id) {
                    return Err(EngineError::ParticipantNotFound(participant_id.clone()));
                }
                self.endpoints.insert(
                    endpoint_id.clone(),
                    EndpointState {
                        participant_id: participant_id.clone(),
                        capabilities: capabilities.clone(),
                    },
                );
            }
            JournalEvent::CharacterAssigned { participant_id, character_id } => {
                if !self.participants.contains_key(participant_id) {
                    return Err(EngineError::ParticipantNotFound(participant_id.clone()));
                }
                if !self.scenario.characters.iter().any(|c| &c.id == character_id) {
                    return Err(EngineError::CharacterNotFound(character_id.clone()));
                }
                if let Some(p) = self.participants.get_mut(participant_id) {
                    p.character_id = Some(character_id.clone());
                }
            }
            JournalEvent::SceneAdvanced { scene_id } => {
                if !self.scenario.scenes.iter().any(|s| &s.id == scene_id) {
                    return Err(EngineError::SceneNotFound(scene_id.clone()));
                }
                self.active_scene_id = Some(scene_id.clone());
            }
            JournalEvent::ClueRevealed { clue_id } => {
                if !self.scenario.clues.iter().any(|c| &c.id == clue_id) {
                    return Err(EngineError::ClueNotFound(clue_id.clone()));
                }
                self.revealed_clues.insert(clue_id.clone());
            }
            JournalEvent::VoteCast { participant_id, target_character_id } => {
                if !self.participants.contains_key(participant_id) {
                    return Err(EngineError::ParticipantNotFound(participant_id.clone()));
                }
                if !self.scenario.characters.iter().any(|c| &c.id == target_character_id) {
                    return Err(EngineError::CharacterNotFound(target_character_id.clone()));
                }
                self.votes.insert(participant_id.clone(), target_character_id.clone());
            }
        }
        Ok(())
    }

    pub fn resolve_outcome(&self) -> Option<&crate::schema::Outcome> {
        // Simple resolution: most votes wins
        let mut vote_counts = HashMap::new();
        for target in self.votes.values() {
            *vote_counts.entry(target).or_insert(0) += 1;
        }

        let mut max_votes = 0;
        let mut winning_target = None;
        for (target, count) in vote_counts {
            if count > max_votes {
                max_votes = count;
                winning_target = Some(target);
            } else if count == max_votes {
                // Tie breaker? For the prototype, we can just say the first one to reach it or undefined.
                // We'll leave it as whoever was checked last that exceeded, meaning ties don't override.
            }
        }

        if let Some(winner) = winning_target {
            self.scenario.outcomes.iter().find(|o| &o.condition_target_character_id == winner)
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schema::{Character, Scene, Clue, Outcome};

    fn mock_scenario() -> Scenario {
        Scenario {
            id: "test-scenario".into(),
            title: "Test".into(),
            description: "A test".into(),
            characters: vec![
                Character {
                    id: "c1".into(),
                    name: "Alice".into(),
                    public_description: "A chef".into(),
                    private_objective: "Hide the knife".into(),
                },
                Character {
                    id: "c2".into(),
                    name: "Bob".into(),
                    public_description: "A butler".into(),
                    private_objective: "Find the knife".into(),
                },
            ],
            scenes: vec![
                Scene {
                    id: "s1".into(),
                    name: "Introduction".into(),
                    public_narrative: "Welcome".into(),
                },
            ],
            clues: vec![
                Clue {
                    id: "clue1".into(),
                    name: "The Knife".into(),
                    description: "A sharp knife".into(),
                    is_public: false,
                    authorized_characters: vec!["c2".into()],
                },
            ],
            outcomes: vec![
                Outcome {
                    id: "o1".into(),
                    condition_target_character_id: "c1".into(),
                    public_resolution: "Alice was arrested.".into(),
                },
            ],
        }
    }

    #[test]
    fn test_engine_determinism() {
        let scenario = mock_scenario();
        let mut state = GameState::new(scenario);

        let events = vec![
            JournalEvent::ParticipantJoined { participant_id: "p1".into(), name: "Player 1".into() },
            JournalEvent::CharacterAssigned { participant_id: "p1".into(), character_id: "c1".into() },
            JournalEvent::ParticipantJoined { participant_id: "p2".into(), name: "Player 2".into() },
            JournalEvent::CharacterAssigned { participant_id: "p2".into(), character_id: "c2".into() },
            JournalEvent::SceneAdvanced { scene_id: "s1".into() },
            JournalEvent::ClueRevealed { clue_id: "clue1".into() },
            JournalEvent::VoteCast { participant_id: "p1".into(), target_character_id: "c1".into() },
            JournalEvent::VoteCast { participant_id: "p2".into(), target_character_id: "c1".into() },
        ];

        for event in events {
            assert!(state.apply(&event).is_ok());
        }

        assert_eq!(state.participants.len(), 2);
        assert_eq!(state.active_scene_id, Some("s1".into()));
        assert!(state.revealed_clues.contains("clue1"));

        let outcome = state.resolve_outcome();
        assert!(outcome.is_some());
        assert_eq!(outcome.unwrap().id, "o1");
    }
}

