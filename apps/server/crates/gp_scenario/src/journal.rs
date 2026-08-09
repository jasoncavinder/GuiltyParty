use serde::{Deserialize, Serialize};

use crate::{
    engine::{EngineError, GameState},
    schema::{Scenario, ScenarioValidationError},
};

pub const JOURNAL_EVENT_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum JournalEvent {
    ParticipantJoined {
        participant_id: String,
        name: String,
    },
    EndpointRegistered {
        endpoint_id: String,
        participant_id: String,
        capabilities: Vec<String>,
    },
    CharacterAssigned {
        participant_id: String,
        character_id: String,
    },
    SceneAdvanced {
        scene_id: String,
    },
    ClueRevealed {
        clue_id: String,
    },
    VotingOpened,
    VoteCast {
        participant_id: String,
        target_character_id: String,
    },
    VotingClosed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct JournalEntry {
    pub scenario_id: String,
    pub scenario_version: u32,
    pub event_version: u32,
    pub sequence_number: u64,
    /// Diagnostic metadata only. Replay never uses wall-clock time.
    pub timestamp_unix_ms: u64,
    pub event: JournalEvent,
}

impl JournalEntry {
    pub fn new(
        scenario: &Scenario,
        sequence_number: u64,
        timestamp_unix_ms: u64,
        event: JournalEvent,
    ) -> Self {
        Self {
            scenario_id: scenario.id.clone(),
            scenario_version: scenario.version,
            event_version: JOURNAL_EVENT_VERSION,
            sequence_number,
            timestamp_unix_ms,
            event,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ReplayError {
    InvalidScenario(ScenarioValidationError),
    WrongScenario {
        sequence_number: u64,
        scenario_id: String,
        scenario_version: u32,
    },
    UnsupportedEventVersion {
        sequence_number: u64,
        event_version: u32,
    },
    UnexpectedSequence {
        expected: u64,
        actual: u64,
    },
    InvalidEvent {
        sequence_number: u64,
        source: EngineError,
    },
}

pub fn replay(scenario: Scenario, entries: &[JournalEntry]) -> Result<GameState, ReplayError> {
    let mut state = GameState::try_new(scenario).map_err(ReplayError::InvalidScenario)?;

    for (index, entry) in entries.iter().enumerate() {
        let expected = index as u64 + 1;
        if entry.sequence_number != expected {
            return Err(ReplayError::UnexpectedSequence {
                expected,
                actual: entry.sequence_number,
            });
        }
        if entry.scenario_id != state.scenario.id
            || entry.scenario_version != state.scenario.version
        {
            return Err(ReplayError::WrongScenario {
                sequence_number: entry.sequence_number,
                scenario_id: entry.scenario_id.clone(),
                scenario_version: entry.scenario_version,
            });
        }
        if entry.event_version != JOURNAL_EVENT_VERSION {
            return Err(ReplayError::UnsupportedEventVersion {
                sequence_number: entry.sequence_number,
                event_version: entry.event_version,
            });
        }
        state
            .apply(&entry.event)
            .map_err(|source| ReplayError::InvalidEvent {
                sequence_number: entry.sequence_number,
                source,
            })?;
    }

    Ok(state)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::schema::{Scenario, SUPPORTED_SCHEMA_VERSION};

    fn scenario() -> Scenario {
        Scenario {
            schema_version: SUPPORTED_SCHEMA_VERSION,
            id: "journal-validation".into(),
            version: 2,
            title: "Journal Validation".into(),
            description: "Synthetic".into(),
            characters: vec![],
            scenes: vec![],
            clues: vec![],
            outcomes: vec![],
        }
    }

    #[test]
    fn rejects_sequence_gaps() {
        let scenario = scenario();
        let entry = JournalEntry::new(&scenario, 2, 0, JournalEvent::VotingOpened);
        assert_eq!(
            replay(scenario, &[entry]),
            Err(ReplayError::UnexpectedSequence {
                expected: 1,
                actual: 2,
            })
        );
    }

    #[test]
    fn rejects_entries_for_another_scenario_version() {
        let scenario = scenario();
        let mut entry = JournalEntry::new(&scenario, 1, 0, JournalEvent::VotingOpened);
        entry.scenario_version = 99;
        assert!(matches!(
            replay(scenario, &[entry]),
            Err(ReplayError::WrongScenario { .. })
        ));
    }
}
