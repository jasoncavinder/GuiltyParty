use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

pub const SUPPORTED_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Scenario {
    /// Version of the serialized scenario format, independent of content revisions.
    pub schema_version: u32,
    /// Stable identifier shared by all published versions of this scenario.
    pub id: String,
    /// Immutable published content version used to initialize and replay a session.
    pub version: u32,
    pub title: String,
    pub description: String,
    pub characters: Vec<Character>,
    pub scenes: Vec<Scene>,
    pub clues: Vec<Clue>,
    pub outcomes: Vec<Outcome>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Character {
    pub id: String,
    pub name: String,
    pub public_description: String,
    pub private_objective: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Scene {
    pub id: String,
    pub name: String,
    pub public_narrative: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Clue {
    pub id: String,
    pub name: String,
    pub description: String,
    /// If true, everyone sees this when revealed. If false, only listed characters see it.
    pub is_public: bool,
    /// Character IDs allowed to receive this clue. Must be empty for public clues.
    pub authorized_characters: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Outcome {
    pub id: String,
    pub condition_target_character_id: String,
    pub public_resolution: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ScenarioValidationError {
    UnsupportedSchemaVersion(u32),
    InvalidPublishedVersion,
    EmptyId(&'static str),
    DuplicateId {
        kind: &'static str,
        id: String,
    },
    UnknownCharacterReference {
        source: String,
        character_id: String,
    },
    PublicClueHasPrivateAudience(String),
    PrivateClueHasNoAudience(String),
}

impl std::fmt::Display for ScenarioValidationError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "scenario validation failed: {self:?}")
    }
}

impl std::error::Error for ScenarioValidationError {}

impl Scenario {
    pub fn validate(&self) -> Result<(), ScenarioValidationError> {
        if self.schema_version != SUPPORTED_SCHEMA_VERSION {
            return Err(ScenarioValidationError::UnsupportedSchemaVersion(
                self.schema_version,
            ));
        }
        if self.version == 0 {
            return Err(ScenarioValidationError::InvalidPublishedVersion);
        }
        if self.id.trim().is_empty() {
            return Err(ScenarioValidationError::EmptyId("scenario"));
        }

        let character_ids = unique_ids("character", self.characters.iter().map(|item| &item.id))?;
        unique_ids("scene", self.scenes.iter().map(|item| &item.id))?;
        unique_ids("clue", self.clues.iter().map(|item| &item.id))?;
        unique_ids("outcome", self.outcomes.iter().map(|item| &item.id))?;

        for clue in &self.clues {
            if clue.is_public && !clue.authorized_characters.is_empty() {
                return Err(ScenarioValidationError::PublicClueHasPrivateAudience(
                    clue.id.clone(),
                ));
            }
            if !clue.is_public && clue.authorized_characters.is_empty() {
                return Err(ScenarioValidationError::PrivateClueHasNoAudience(
                    clue.id.clone(),
                ));
            }
            for character_id in &clue.authorized_characters {
                if !character_ids.contains(character_id) {
                    return Err(ScenarioValidationError::UnknownCharacterReference {
                        source: format!("clue:{}", clue.id),
                        character_id: character_id.clone(),
                    });
                }
            }
        }

        for outcome in &self.outcomes {
            if !character_ids.contains(&outcome.condition_target_character_id) {
                return Err(ScenarioValidationError::UnknownCharacterReference {
                    source: format!("outcome:{}", outcome.id),
                    character_id: outcome.condition_target_character_id.clone(),
                });
            }
        }

        Ok(())
    }
}

fn unique_ids<'a>(
    kind: &'static str,
    ids: impl Iterator<Item = &'a String>,
) -> Result<BTreeSet<String>, ScenarioValidationError> {
    let mut result = BTreeSet::new();
    for id in ids {
        if id.trim().is_empty() {
            return Err(ScenarioValidationError::EmptyId(kind));
        }
        if !result.insert(id.clone()) {
            return Err(ScenarioValidationError::DuplicateId {
                kind,
                id: id.clone(),
            });
        }
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_private_clue_without_an_explicit_audience() {
        let scenario = Scenario {
            schema_version: SUPPORTED_SCHEMA_VERSION,
            id: "test".into(),
            version: 1,
            title: "Test".into(),
            description: "Test".into(),
            characters: vec![],
            scenes: vec![],
            clues: vec![Clue {
                id: "clue".into(),
                name: "Clue".into(),
                description: "Private".into(),
                is_public: false,
                authorized_characters: vec![],
            }],
            outcomes: vec![],
        };

        assert_eq!(
            scenario.validate(),
            Err(ScenarioValidationError::PrivateClueHasNoAudience(
                "clue".into()
            ))
        );
    }
}
