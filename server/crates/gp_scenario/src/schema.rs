use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Scenario {
    pub id: String,
    pub title: String,
    pub description: String,
    pub characters: Vec<Character>,
    pub scenes: Vec<Scene>,
    pub clues: Vec<Clue>,
    pub outcomes: Vec<Outcome>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Character {
    pub id: String,
    pub name: String,
    pub public_description: String,
    pub private_objective: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Scene {
    pub id: String,
    pub name: String,
    pub public_narrative: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Clue {
    pub id: String,
    pub name: String,
    pub description: String,
    /// If true, everyone sees this when revealed. If false, only specific characters see it.
    pub is_public: bool,
    /// If not public, which character IDs can see this clue when revealed.
    pub authorized_characters: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Outcome {
    pub id: String,
    pub condition_target_character_id: String,
    pub public_resolution: String,
}
