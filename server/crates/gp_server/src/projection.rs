pub use gp_scenario::projection::{build_ai_projection, build_projection, ProjectionAudience};

#[cfg(test)]
mod tests {
    use gp_scenario::{
        engine::GameState,
        journal::JournalEvent,
        schema::{Character, Clue, Scenario, Scene, SUPPORTED_SCHEMA_VERSION},
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
            scenes: vec![Scene {
                id: "scene".into(),
                name: "Public Scene".into(),
                public_narrative: "Public narrative".into(),
            }],
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
            JournalEvent::SceneAdvanced {
                scene_id: "scene".into(),
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
        assert!(!json.contains("private_objective"));
        assert!(!json.contains("has_voted"));
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
