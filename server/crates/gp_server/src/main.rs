mod ai;
mod auth;
mod projection;

use std::{
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    extract::{
        ws::{Message, WebSocket},
        Query, State, WebSocketUpgrade,
    },
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use gp_scenario::{
    engine::GameState,
    journal::{JournalEntry, JournalEvent},
    schema::{Character, Clue, Outcome, Scenario, Scene, SUPPORTED_SCHEMA_VERSION},
};
use serde::{Deserialize, Serialize};
use tokio::sync::{broadcast, Mutex, RwLock};
use tower_http::cors::{Any, CorsLayer};
use tracing::{error, info, warn};
use uuid::Uuid;


use crate::{
    ai::{AiAdapter, DisabledAiAdapter, OpenAiCompatibleAdapter},
    auth::AuthorityRegistry,
    projection::{build_ai_projection, build_projection, ProjectionAudience},
};

struct AppState {
    session: Mutex<SessionState>,
    authorities: RwLock<AuthorityRegistry>,
    ai_adapter: Arc<dyn AiAdapter>,
    update_tx: broadcast::Sender<()>,
}


struct SessionState {
    game_state: GameState,
    journal: Vec<JournalEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum JoinKind {
    Participant,
    Stage,
}

#[derive(Debug, Deserialize)]
struct JoinRequest {
    kind: JoinKind,
    display_name: Option<String>,
}

#[derive(Debug, Serialize)]
struct JoinResponse {
    token: String,
    participant_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct WebSocketQuery {
    token: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ClientMessage {
    GetProjection,
    RequestAiSuggestion,
    SubmitEvent { event: JournalEvent },
}


#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ServerMessage<'a> {
    Projection {
        projection: projection::AuthorizedProjection,
    },
    AiSuggestion {
        suggestion: &'a str,
    },
    Error {
        code: &'a str,
        message: &'a str,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let host_token = std::env::var("GP_HOST_TOKEN")
        .map_err(|_| "GP_HOST_TOKEN is required and must contain at least 24 characters")?;
    let authorities = AuthorityRegistry::new(host_token)?;
    let ai_adapter: Arc<dyn AiAdapter> = match (
        std::env::var("GP_AI_ENDPOINT").ok(),
        std::env::var("GP_AI_MODEL").ok(),
    ) {
        (Some(endpoint), Some(model)) => {
            info!("local AI adapter enabled");
            Arc::new(OpenAiCompatibleAdapter::new(endpoint, model)?)
        }
        (None, None) => {
            warn!("local AI adapter disabled; deterministic gameplay remains available");
            Arc::new(DisabledAiAdapter)
        }
        _ => return Err("GP_AI_ENDPOINT and GP_AI_MODEL must be set together".into()),
    };

    let (update_tx, _) = broadcast::channel(100);

    let scenario = Scenario {
        schema_version: SUPPORTED_SCHEMA_VERSION,
        id: "mvp-scenario".into(),
        version: 1,
        title: "The Stolen Artifact".into(),
        description: "A prototype synthetic scenario.".into(),
        characters: vec![
            Character {
                id: "char_1".into(),
                name: "Alice".into(),
                public_description: "A wealthy art collector.".into(),
                private_objective: "Hide the fact that you stole the artifact.".into(),
            },
            Character {
                id: "char_2".into(),
                name: "Bob".into(),
                public_description: "A private investigator.".into(),
                private_objective: "Find out who stole the artifact.".into(),
            }
        ],
        scenes: vec![
            Scene {
                id: "scene_1".into(),
                name: "The Gala".into(),
                public_narrative: "Everyone has gathered at the museum gala.".into(),
            },
            Scene {
                id: "scene_2".into(),
                name: "The Discovery".into(),
                public_narrative: "The artifact is missing! The doors are locked.".into(),
            }
        ],
        clues: vec![
            Clue {
                id: "clue_1".into(),
                name: "Muddy Footprints".into(),
                description: "Footprints leading away from the pedestal.".into(),
                is_public: true,
                authorized_characters: vec![],
            },
            Clue {
                id: "clue_2".into(),
                name: "Security Badge".into(),
                description: "A badge dropped near the exit. It belongs to Alice.".into(),
                is_public: false,
                authorized_characters: vec!["char_2".into()],
            }
        ],
        outcomes: vec![
            Outcome {
                id: "outcome_1".into(),
                condition_target_character_id: "char_1".into(),
                public_resolution: "Alice is arrested for the theft!".into(),
            },
            Outcome {
                id: "outcome_2".into(),
                condition_target_character_id: "char_2".into(),
                public_resolution: "Bob is falsely accused of the theft!".into(),
            }
        ],
    };
    let game_state = GameState::try_new(scenario)?;
    let state = Arc::new(AppState {
        session: Mutex::new(SessionState {
            game_state,
            journal: Vec::new(),
        }),
        authorities: RwLock::new(authorities),
        ai_adapter,
        update_tx,
    });


    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/join", post(handle_join))
        .route("/ws", get(ws_handler))
        .layer(cors)
        .with_state(state);


    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    info!("Guilty Party prototype listening on 0.0.0.0:3000");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn handle_join(
    State(state): State<Arc<AppState>>,
    Json(request): Json<JoinRequest>,
) -> Result<Json<JoinResponse>, (StatusCode, &'static str)> {
    match request.kind {
        JoinKind::Stage => {
            let token = state.authorities.write().await.issue_stage();
            Ok(Json(JoinResponse {
                token,
                participant_id: None,
            }))
        }
        JoinKind::Participant => {
            let display_name = request
                .display_name
                .as_deref()
                .map(str::trim)
                .filter(|name| !name.is_empty() && name.len() <= 80)
                .ok_or((
                    StatusCode::BAD_REQUEST,
                    "participant display_name must contain 1 to 80 characters",
                ))?;
            let participant_id = Uuid::new_v4().simple().to_string();
            let mut session = state.session.lock().await;
            let event = JournalEvent::ParticipantJoined {
                participant_id: participant_id.clone(),
                name: display_name.to_string(),
            };
            session
                .game_state
                .apply(&event)
                .map_err(|_| (StatusCode::CONFLICT, "participant could not be joined"))?;
            let sequence_number = session.journal.len() as u64 + 1;
            let timestamp_unix_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;
            let entry = JournalEntry::new(
                &session.game_state.scenario,
                sequence_number,
                timestamp_unix_ms,
                event,
            );
            session.journal.push(entry);
            drop(session);
            let _ = state.update_tx.send(());
            let token = state

                .authorities
                .write()
                .await
                .issue_participant(participant_id.clone());
            Ok(Json(JoinResponse {
                token,
                participant_id: Some(participant_id),
            }))
        }
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<WebSocketQuery>,
    State(state): State<Arc<AppState>>,
) -> Response {
    let audience = {
        let authorities = state.authorities.read().await;
        query
            .token
            .as_deref()
            .and_then(|token| authorities.authenticate(token))
    };
    let Some(audience) = audience else {
        return (
            StatusCode::UNAUTHORIZED,
            "invalid or missing authority token",
        )
            .into_response();
    };

    ws.max_message_size(16 * 1024)
        .max_frame_size(16 * 1024)
        .on_upgrade(move |socket| handle_socket(socket, state, audience))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>, audience: ProjectionAudience) {
    if send_projection(&mut socket, &state, &audience)
        .await
        .is_err()
    {
        return;
    }

    let mut update_rx = state.update_tx.subscribe();

    loop {
        tokio::select! {
            message = socket.recv() => {
                let Some(Ok(message)) = message else {
                    break;
                };
                match message {
                    Message::Text(text) => {
                        let request: ClientMessage = match serde_json::from_str(&text) {
                            Ok(request) => request,
                            Err(_) => {
                                let _ = send_json(
                                    &mut socket,
                                    &ServerMessage::Error {
                                        code: "invalid_message",
                                        message: "expected a supported JSON control-plane message",
                                    },
                                )
                                .await;
                                continue;
                            }
                        };
                        match request {
                            ClientMessage::GetProjection => {
                                if send_projection(&mut socket, &state, &audience)
                                    .await
                                    .is_err()
                                {
                                    break;
                                }
                            }
                            ClientMessage::SubmitEvent { event } => {
                                if !matches!(audience, ProjectionAudience::Host) {
                                    let _ = send_json(
                                        &mut socket,
                                        &ServerMessage::Error {
                                            code: "forbidden",
                                            message: "Only the host can submit events in the MVP",
                                        },
                                    ).await;
                                    continue;
                                }
                                let mut session = state.session.lock().await;
                                if let Err(_e) = session.game_state.apply(&event) {
                                    let _ = send_json(
                                        &mut socket,
                                        &ServerMessage::Error {
                                            code: "invalid_event",
                                            message: "Failed to apply event to game state",
                                        },
                                    ).await;
                                    continue;
                                }
                                let sequence_number = session.journal.len() as u64 + 1;
                                let timestamp_unix_ms = SystemTime::now()
                                    .duration_since(UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_millis() as u64;
                                let entry = JournalEntry::new(
                                    &session.game_state.scenario,
                                    sequence_number,
                                    timestamp_unix_ms,
                                    event,
                                );
                                session.journal.push(entry);
                                drop(session);
                                let _ = state.update_tx.send(());
                            }
                            ClientMessage::RequestAiSuggestion => {
                                if !matches!(audience, ProjectionAudience::Host) {
                                    let _ = send_json(
                                        &mut socket,
                                        &ServerMessage::Error {
                                            code: "forbidden",
                                            message: "AI suggestions are host-only",
                                        },
                                    )
                                    .await;
                                    continue;
                                }
                                let projection = {
                                    let session = state.session.lock().await;
                                    serde_json::to_string(&build_ai_projection(&session.game_state))
                                };
                                let Ok(projection) = projection else {
                                    error!("could not serialize minimized AI projection");
                                    continue;
                                };
                                match state.ai_adapter.request_suggestion(&projection).await {
                                    Ok(suggestion) => {
                                        let _ = send_json(
                                            &mut socket,
                                            &ServerMessage::AiSuggestion {
                                                suggestion: &suggestion,
                                            },
                                        )
                                        .await;
                                    }
                                    Err(error) => {
                                        warn!(error = %error, "AI suggestion unavailable");
                                        let _ = send_json(
                                            &mut socket,
                                            &ServerMessage::Error {
                                                code: "ai_unavailable",
                                                message:
                                                    "AI suggestion unavailable; gameplay is unaffected",
                                            },
                                        )
                                        .await;
                                    }
                                }
                            }
                        }
                    }
                    Message::Close(_) => break,
                    Message::Binary(_) | Message::Ping(_) | Message::Pong(_) => {}
                }
            }
            Ok(_) = update_rx.recv() => {
                if send_projection(&mut socket, &state, &audience)
                    .await
                    .is_err()
                {
                    break;
                }
            }
        }
    }
}


async fn send_projection(
    socket: &mut WebSocket,
    state: &AppState,
    audience: &ProjectionAudience,
) -> Result<(), ()> {
    let projection = {
        let session = state.session.lock().await;
        build_projection(&session.game_state, audience)
    };
    send_json(socket, &ServerMessage::Projection { projection }).await
}

async fn send_json<T: Serialize>(socket: &mut WebSocket, value: &T) -> Result<(), ()> {
    let json = serde_json::to_string(value).map_err(|_| ())?;
    socket.send(Message::Text(json)).await.map_err(|_| ())
}
