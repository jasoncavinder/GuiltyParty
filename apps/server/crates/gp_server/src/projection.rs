pub use gp_scenario::projection::{build_ai_projection, build_projection, ProjectionAudience};

#[cfg(test)]
mod tests {
    use gp_scenario::{
        engine::GameState,
        journal::JournalEvent,
        projection::VotingPhase,
        schema::{Character, Clue, Outcome, Scenario, Scene, SUPPORTED_SCHEMA_VERSION},
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
            outcomes: vec![
                Outcome {
                    id: "avery-selected".into(),
                    condition_target_character_id: "c1".into(),
                    public_resolution: "Avery is selected.".into(),
                },
                Outcome {
                    id: "blake-selected".into(),
                    condition_target_character_id: "c2".into(),
                    public_resolution: "Blake is selected.".into(),
                },
            ],
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
    fn participant_voting_projection_distinguishes_every_canonical_phase() {
        let mut state = state_with_private_information();
        let initial = build_projection(&state, &ProjectionAudience::Participant("p1".into()));
        assert_eq!(initial.voting_phase, Some(VotingPhase::NotOpen));
        assert_eq!(initial.vote_targets, None);

        state.apply(&JournalEvent::VotingOpened).unwrap();
        let open = build_projection(&state, &ProjectionAudience::Participant("p1".into()));
        assert_eq!(open.voting_phase, Some(VotingPhase::Open));
        assert_eq!(
            open.vote_targets
                .as_ref()
                .unwrap()
                .iter()
                .map(|target| (target.character_id.as_str(), target.character_name.as_str()))
                .collect::<Vec<_>>(),
            vec![("c1", "Avery"), ("c2", "Blake")]
        );

        state
            .apply(&JournalEvent::VoteCast {
                participant_id: "p1".into(),
                target_character_id: "c1".into(),
            })
            .unwrap();
        let recorded = build_projection(&state, &ProjectionAudience::Participant("p1".into()));
        assert_eq!(recorded.voting_phase, Some(VotingPhase::Open));
        assert_eq!(recorded.vote_targets, None);
        assert_eq!(recorded.participants[0].has_voted, Some(true));

        state
            .apply(&JournalEvent::VoteCast {
                participant_id: "p2".into(),
                target_character_id: "c2".into(),
            })
            .unwrap();
        state.apply(&JournalEvent::VotingClosed).unwrap();
        let tied = build_projection(&state, &ProjectionAudience::Participant("p1".into()));
        assert_eq!(tied.voting_phase, Some(VotingPhase::Closed));
        assert_eq!(tied.vote_targets, None);
        assert_eq!(tied.outcome, None);

        let mut resolved_state = state_with_private_information();
        for event in [
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
        ] {
            resolved_state.apply(&event).unwrap();
        }
        let resolved = build_projection(
            &resolved_state,
            &ProjectionAudience::Participant("p1".into()),
        );
        assert_eq!(resolved.voting_phase, Some(VotingPhase::Resolved));
        assert_eq!(resolved.outcome.unwrap().id, "avery-selected");
    }

    #[test]
    fn negotiated_voting_fields_can_be_removed_without_changing_canonical_state() {
        let mut state = state_with_private_information();
        state.apply(&JournalEvent::VotingOpened).unwrap();
        let mut projection =
            build_projection(&state, &ProjectionAudience::Participant("p1".into()));
        projection.remove_participant_voting_feature();

        let json = serde_json::to_string(&projection).unwrap();
        assert!(!json.contains("voting_phase"));
        assert!(!json.contains("vote_targets"));
        assert!(state.voting_open);
    }

    #[test]
    fn ai_projection_is_minimized_and_excludes_all_private_information() {
        let json =
            serde_json::to_string(&build_ai_projection(&state_with_private_information())).unwrap();

        assert!(json.contains("Everyone knows"));
        assert!(!json.contains("Only Avery knows"));
        assert!(!json.contains("Avery secret"));
        assert!(!json.contains("Player One"));
        assert!(!json.contains("voting_phase"));
        assert!(!json.contains("vote_targets"));
    }
}
