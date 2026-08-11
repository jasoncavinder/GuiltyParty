use serde::{Deserialize, Serialize};

use crate::engine::GameState;

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
    pub scenario_title: String,
    pub active_scene: Option<ProjectedScene>,
    pub revealed_clues: Vec<ProjectedClue>,
    pub participants: Vec<ProjectedParticipant>,
    pub voting_open: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voting_phase: Option<VotingPhase>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vote_targets: Option<Vec<ProjectedVoteTarget>>,
    pub votes_cast: usize,
    pub outcome: Option<ProjectedOutcome>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProjectedScene {
    pub id: String,
    pub name: String,
    pub public_narrative: String,
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub private_objective: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub has_voted: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProjectedOutcome {
    pub id: String,
    pub public_resolution: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VotingPhase {
    NotOpen,
    Open,
    Closed,
    Resolved,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProjectedVoteTarget {
    pub character_id: String,
    pub character_name: String,
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

    let (voting_phase, vote_targets) = match audience {
        ProjectionAudience::Participant(participant_id) => state
            .participants
            .get(participant_id)
            .map(|participant| {
                let phase = if outcome.is_some() {
                    VotingPhase::Resolved
                } else if state.voting_closed {
                    VotingPhase::Closed
                } else if state.voting_open {
                    VotingPhase::Open
                } else {
                    VotingPhase::NotOpen
                };
                let targets = (phase == VotingPhase::Open
                    && participant.character_id.is_some()
                    && !state.votes.contains_key(participant_id))
                .then(|| {
                    state
                        .scenario
                        .characters
                        .iter()
                        .map(|character| ProjectedVoteTarget {
                            character_id: character.id.clone(),
                            character_name: character.name.clone(),
                        })
                        .collect()
                });
                (Some(phase), targets)
            })
            .unwrap_or((None, None)),
        ProjectionAudience::Stage | ProjectionAudience::Host => (None, None),
    };

    let active_scene = state.active_scene_id.as_ref().and_then(|scene_id| {
        state
            .scenario
            .scenes
            .iter()
            .find(|scene| &scene.id == scene_id)
            .map(|scene| ProjectedScene {
                id: scene.id.clone(),
                name: scene.name.clone(),
                public_narrative: scene.public_narrative.clone(),
            })
    });

    AuthorizedProjection {
        scenario_id: state.scenario.id.clone(),
        scenario_version: state.scenario.version,
        scenario_title: state.scenario.title.clone(),
        active_scene,
        revealed_clues,
        participants,
        voting_open: state.voting_open,
        voting_phase,
        vote_targets,
        votes_cast: state.votes.len(),
        outcome,
    }
}

impl AuthorizedProjection {
    pub fn remove_participant_voting_feature(&mut self) {
        self.voting_phase = None;
        self.vote_targets = None;
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
