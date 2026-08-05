use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum JournalEvent {
    /// A participant joined the session
    ParticipantJoined { participant_id: String, name: String },
    
    /// An endpoint (device) registered its capabilities
    EndpointRegistered { endpoint_id: String, participant_id: String, capabilities: Vec<String> },
    
    /// A participant was assigned a character
    CharacterAssigned { participant_id: String, character_id: String },
    
    /// The scenario advanced to a specific scene
    SceneAdvanced { scene_id: String },
    
    /// A clue was revealed to authorized endpoints
    ClueRevealed { clue_id: String },
    
    /// A participant cast a vote for a character (e.g., who is guilty)
    VoteCast { participant_id: String, target_character_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct JournalEntry {
    pub sequence_number: u64,
    pub timestamp_unix_ms: u64,
    pub event: JournalEvent,
}
