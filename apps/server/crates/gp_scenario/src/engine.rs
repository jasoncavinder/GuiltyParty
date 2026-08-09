use std::collections::{BTreeMap, BTreeSet};

use crate::{
    journal::JournalEvent,
    schema::{Outcome, Scenario, ScenarioValidationError},
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GameState {
    pub scenario: Scenario,
    pub participants: BTreeMap<String, ParticipantState>,
    pub endpoints: BTreeMap<String, EndpointState>,
    pub active_scene_id: Option<String>,
    pub revealed_clues: BTreeSet<String>,
    pub voting_open: bool,
    pub voting_closed: bool,
    pub votes: BTreeMap<String, String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParticipantState {
    pub name: String,
    pub character_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EndpointState {
    pub participant_id: String,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum EngineError {
    ParticipantNotFound(String),
    ParticipantAlreadyExists(String),
    EndpointAlreadyExists(String),
    CharacterNotFound(String),
    CharacterAlreadyAssigned(String),
    ParticipantAlreadyAssigned(String),
    SceneNotFound(String),
    ClueNotFound(String),
    SceneAlreadyActive(String),
    ClueAlreadyRevealed(String),
    VotingAlreadyOpened,
    VotingNotOpen,
    VotingAlreadyClosed,
    ParticipantNotAssigned(String),
    ParticipantAlreadyVoted(String),
}

impl GameState {
    pub fn try_new(scenario: Scenario) -> Result<Self, ScenarioValidationError> {
        scenario.validate()?;
        Ok(Self {
            scenario,
            participants: BTreeMap::new(),
            endpoints: BTreeMap::new(),
            active_scene_id: None,
            revealed_clues: BTreeSet::new(),
            voting_open: false,
            voting_closed: false,
            votes: BTreeMap::new(),
        })
    }

    pub fn apply(&mut self, event: &JournalEvent) -> Result<(), EngineError> {
        match event {
            JournalEvent::ParticipantJoined {
                participant_id,
                name,
            } => {
                if self.participants.contains_key(participant_id) {
                    return Err(EngineError::ParticipantAlreadyExists(
                        participant_id.clone(),
                    ));
                }
                self.participants.insert(
                    participant_id.clone(),
                    ParticipantState {
                        name: name.clone(),
                        character_id: None,
                    },
                );
            }
            JournalEvent::EndpointRegistered {
                endpoint_id,
                participant_id,
                capabilities,
            } => {
                if !self.participants.contains_key(participant_id) {
                    return Err(EngineError::ParticipantNotFound(participant_id.clone()));
                }
                if self.endpoints.contains_key(endpoint_id) {
                    return Err(EngineError::EndpointAlreadyExists(endpoint_id.clone()));
                }
                self.endpoints.insert(
                    endpoint_id.clone(),
                    EndpointState {
                        participant_id: participant_id.clone(),
                        capabilities: capabilities.clone(),
                    },
                );
            }
            JournalEvent::CharacterAssigned {
                participant_id,
                character_id,
            } => {
                if !self
                    .scenario
                    .characters
                    .iter()
                    .any(|character| &character.id == character_id)
                {
                    return Err(EngineError::CharacterNotFound(character_id.clone()));
                }
                if self.participants.iter().any(|(id, participant)| {
                    id != participant_id && participant.character_id.as_ref() == Some(character_id)
                }) {
                    return Err(EngineError::CharacterAlreadyAssigned(character_id.clone()));
                }
                let participant = self
                    .participants
                    .get_mut(participant_id)
                    .ok_or_else(|| EngineError::ParticipantNotFound(participant_id.clone()))?;
                if participant.character_id.is_some() {
                    return Err(EngineError::ParticipantAlreadyAssigned(
                        participant_id.clone(),
                    ));
                }
                participant.character_id = Some(character_id.clone());
            }
            JournalEvent::SceneAdvanced { scene_id } => {
                if !self
                    .scenario
                    .scenes
                    .iter()
                    .any(|scene| &scene.id == scene_id)
                {
                    return Err(EngineError::SceneNotFound(scene_id.clone()));
                }
                if self.active_scene_id.as_ref() == Some(scene_id) {
                    return Err(EngineError::SceneAlreadyActive(scene_id.clone()));
                }
                self.active_scene_id = Some(scene_id.clone());
            }
            JournalEvent::ClueRevealed { clue_id } => {
                if !self.scenario.clues.iter().any(|clue| &clue.id == clue_id) {
                    return Err(EngineError::ClueNotFound(clue_id.clone()));
                }
                if !self.revealed_clues.insert(clue_id.clone()) {
                    return Err(EngineError::ClueAlreadyRevealed(clue_id.clone()));
                }
            }
            JournalEvent::VotingOpened => {
                if self.voting_closed {
                    return Err(EngineError::VotingAlreadyClosed);
                }
                if self.voting_open {
                    return Err(EngineError::VotingAlreadyOpened);
                }
                self.voting_open = true;
            }
            JournalEvent::VoteCast {
                participant_id,
                target_character_id,
            } => {
                if !self.voting_open || self.voting_closed {
                    return Err(EngineError::VotingNotOpen);
                }
                let participant = self
                    .participants
                    .get(participant_id)
                    .ok_or_else(|| EngineError::ParticipantNotFound(participant_id.clone()))?;
                if participant.character_id.is_none() {
                    return Err(EngineError::ParticipantNotAssigned(participant_id.clone()));
                }
                if !self
                    .scenario
                    .characters
                    .iter()
                    .any(|character| &character.id == target_character_id)
                {
                    return Err(EngineError::CharacterNotFound(target_character_id.clone()));
                }
                if self.votes.contains_key(participant_id) {
                    return Err(EngineError::ParticipantAlreadyVoted(participant_id.clone()));
                }
                self.votes
                    .insert(participant_id.clone(), target_character_id.clone());
            }
            JournalEvent::VotingClosed => {
                if self.voting_closed {
                    return Err(EngineError::VotingAlreadyClosed);
                }
                if !self.voting_open {
                    return Err(EngineError::VotingNotOpen);
                }
                self.voting_open = false;
                self.voting_closed = true;
            }
        }
        Ok(())
    }

    /// Returns no outcome when voting is open, empty, or tied.
    pub fn resolve_outcome(&self) -> Option<&Outcome> {
        if !self.voting_closed || self.votes.is_empty() {
            return None;
        }

        let mut counts = BTreeMap::<&str, usize>::new();
        for target in self.votes.values() {
            *counts.entry(target).or_default() += 1;
        }
        let max_votes = counts.values().copied().max()?;
        let mut winners = counts
            .into_iter()
            .filter_map(|(target, count)| (count == max_votes).then_some(target));
        let winner = winners.next()?;
        if winners.next().is_some() {
            return None;
        }

        self.scenario
            .outcomes
            .iter()
            .find(|outcome| outcome.condition_target_character_id == winner)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        journal::{replay, JournalEntry},
        schema::{Character, Clue, Outcome, Scene, SUPPORTED_SCHEMA_VERSION},
    };

    fn scenario() -> Scenario {
        Scenario {
            schema_version: SUPPORTED_SCHEMA_VERSION,
            id: "test-scenario".into(),
            version: 1,
            title: "Test".into(),
            description: "Original synthetic test content".into(),
            characters: vec![
                Character {
                    id: "c1".into(),
                    name: "Avery".into(),
                    public_description: "A chef".into(),
                    private_objective: "Hide the recipe".into(),
                },
                Character {
                    id: "c2".into(),
                    name: "Blake".into(),
                    public_description: "A gardener".into(),
                    private_objective: "Find the recipe".into(),
                },
            ],
            scenes: vec![Scene {
                id: "s1".into(),
                name: "Introduction".into(),
                public_narrative: "Welcome".into(),
            }],
            clues: vec![Clue {
                id: "clue1".into(),
                name: "The Recipe".into(),
                description: "A handwritten recipe".into(),
                is_public: false,
                authorized_characters: vec!["c2".into()],
            }],
            outcomes: vec![Outcome {
                id: "o1".into(),
                condition_target_character_id: "c1".into(),
                public_resolution: "Avery is selected.".into(),
            }],
        }
    }

    fn complete_events() -> Vec<JournalEvent> {
        vec![
            JournalEvent::ParticipantJoined {
                participant_id: "p1".into(),
                name: "Player 1".into(),
            },
            JournalEvent::CharacterAssigned {
                participant_id: "p1".into(),
                character_id: "c1".into(),
            },
            JournalEvent::ParticipantJoined {
                participant_id: "p2".into(),
                name: "Player 2".into(),
            },
            JournalEvent::CharacterAssigned {
                participant_id: "p2".into(),
                character_id: "c2".into(),
            },
            JournalEvent::SceneAdvanced {
                scene_id: "s1".into(),
            },
            JournalEvent::ClueRevealed {
                clue_id: "clue1".into(),
            },
            JournalEvent::VotingOpened,
            JournalEvent::VoteCast {
                participant_id: "p1".into(),
                target_character_id: "c1".into(),
            },
            JournalEvent::VoteCast {
                participant_id: "p2".into(),
                target_character_id: "c1".into(),
            },
            JournalEvent::VotingClosed,
        ]
    }

    #[test]
    fn replay_reconstructs_the_same_state() {
        let scenario = scenario();
        let entries: Vec<_> = complete_events()
            .into_iter()
            .enumerate()
            .map(|(index, event)| JournalEntry::new(&scenario, index as u64 + 1, 0, event))
            .collect();

        let first = replay(scenario.clone(), &entries).unwrap();
        let second = replay(scenario, &entries).unwrap();

        assert_eq!(first, second);
        assert_eq!(
            first.resolve_outcome().map(|outcome| &outcome.id),
            Some(&"o1".into())
        );
    }

    #[test]
    fn ties_have_no_outcome_regardless_of_vote_order() {
        let mut events = complete_events();
        events[8] = JournalEvent::VoteCast {
            participant_id: "p2".into(),
            target_character_id: "c2".into(),
        };
        let mut state = GameState::try_new(scenario()).unwrap();
        for event in events {
            state.apply(&event).unwrap();
        }
        assert_eq!(state.resolve_outcome(), None);
    }

    #[test]
    fn prevents_character_sharing_and_repeat_votes() {
        let mut state = GameState::try_new(scenario()).unwrap();
        for event in complete_events().into_iter().take(3) {
            state.apply(&event).unwrap();
        }
        assert_eq!(
            state.apply(&JournalEvent::CharacterAssigned {
                participant_id: "p2".into(),
                character_id: "c1".into(),
            }),
            Err(EngineError::CharacterAlreadyAssigned("c1".into()))
        );

        state
            .apply(&JournalEvent::CharacterAssigned {
                participant_id: "p2".into(),
                character_id: "c2".into(),
            })
            .unwrap();
        state.apply(&JournalEvent::VotingOpened).unwrap();
        let vote = JournalEvent::VoteCast {
            participant_id: "p1".into(),
            target_character_id: "c1".into(),
        };
        state.apply(&vote).unwrap();
        assert_eq!(
            state.apply(&vote),
            Err(EngineError::ParticipantAlreadyVoted("p1".into()))
        );
    }
}
