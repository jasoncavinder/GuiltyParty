mod ai;
mod auth;
mod projection;
mod scenario_fixture;

use std::{
    fs,
    path::PathBuf,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    extract::{
        ws::{Message, WebSocket},
        Query, State, WebSocketUpgrade,
    },
    http::{header, HeaderMap, HeaderValue, Method, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use gp_scenario::{
    engine::{EngineError, GameState},
    journal::{replay, JournalEntry, JournalEvent},
    schema::Scenario,
};
use gp_session::{append_entry, load_entries};
use serde::{Deserialize, Serialize};
use tokio::sync::{watch, Mutex, RwLock};
use tower_http::cors::CorsLayer;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::{
    ai::{AiAdapter, DisabledAiAdapter, OpenAiCompatibleAdapter},
    auth::AuthorityRegistry,
    projection::{build_ai_projection, build_projection, ProjectionAudience},
};

const DEFAULT_ALLOWED_ORIGINS: &str =
    "http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:8081,http://localhost:8081";
const DEFAULT_JOURNAL_PATH: &str = "data/mvp-session.jsonl";

struct AppState {
    session: Mutex<SessionState>,
    authorities: RwLock<AuthorityRegistry>,
    ai_adapter: Arc<dyn AiAdapter>,
    update_tx: watch::Sender<u64>,
    allowed_origins: Vec<HeaderValue>,
}

struct SessionState {
    game_state: GameState,
    journal: Vec<JournalEntry>,
    journal_path: PathBuf,
}

impl SessionState {
    fn load(scenario: Scenario, journal_path: PathBuf) -> Result<Self, String> {
        if let Some(parent) = journal_path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
        {
            fs::create_dir_all(parent)
                .map_err(|error| format!("could not create journal directory: {error}"))?;
        }

        let journal = if journal_path.exists() {
            load_entries(&journal_path).map_err(|error| error.to_string())?
        } else {
            Vec::new()
        };
        let game_state = replay(scenario, &journal)
            .map_err(|error| format!("journal replay failed: {error:?}"))?;

        Ok(Self {
            game_state,
            journal,
            journal_path,
        })
    }

    fn apply_event(&mut self, event: JournalEvent) -> Result<(), MutationError> {
        let mut next_state = self.game_state.clone();
        next_state.apply(&event).map_err(MutationError::Invalid)?;

        let sequence_number = self.journal.len() as u64 + 1;
        let entry = JournalEntry::new(
            &self.game_state.scenario,
            sequence_number,
            timestamp_unix_ms(),
            event,
        );
        append_entry(&self.journal_path, &entry)
            .map_err(|error| MutationError::Persistence(error.to_string()))?;

        self.game_state = next_state;
        self.journal.push(entry);
        Ok(())
    }
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

#[derive(Debug, Clone, Deserialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ClientCommand {
    AssignCharacter {
        participant_id: String,
        character_id: String,
    },
    AdvanceScene {
        scene_id: String,
    },
    RevealClue {
        clue_id: String,
    },
    OpenVoting,
    CastVote {
        target_character_id: String,
    },
    CloseVoting,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum ClientMessage {
    GetProjection,
    RequestAiSuggestion,
    SubmitCommand { command: ClientCommand },
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

#[derive(Debug)]
enum MutationError {
    Unauthorized,
    Invalid(EngineError),
    Persistence(String),
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt::init();

    let host_token = std::env::var("GP_HOST_TOKEN")
        .map_err(|_| "GP_HOST_TOKEN is required and must contain at least 24 characters")?;
    let authorities = AuthorityRegistry::new(host_token)?;
    let allowed_origins = parse_allowed_origins(
        &std::env::var("GP_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| DEFAULT_ALLOWED_ORIGINS.to_string()),
    )?;
    let journal_path = PathBuf::from(
        std::env::var("GP_JOURNAL_PATH").unwrap_or_else(|_| DEFAULT_JOURNAL_PATH.to_string()),
    );
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

    let scenario = scenario_fixture::load()?;
    let session = SessionState::load(scenario, journal_path)?;
    let (update_tx, _) = watch::channel(0_u64);
    let cors = CorsLayer::new()
        .allow_origin(allowed_origins.clone())
        .allow_methods([Method::POST])
        .allow_headers([header::CONTENT_TYPE]);
    let state = Arc::new(AppState {
        session: Mutex::new(session),
        authorities: RwLock::new(authorities),
        ai_adapter,
        update_tx,
        allowed_origins,
    });

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
                .filter(|name| valid_display_name(name))
                .ok_or((
                    StatusCode::BAD_REQUEST,
                    "participant display_name must contain 1 to 80 visible characters",
                ))?;
            let participant_id = Uuid::new_v4().simple().to_string();
            let result = state
                .session
                .lock()
                .await
                .apply_event(JournalEvent::ParticipantJoined {
                    participant_id: participant_id.clone(),
                    name: display_name.to_string(),
                });
            if let Err(error) = result {
                error!(error = ?error, "participant join could not be journaled");
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "participant could not be joined",
                ));
            }

            notify_update(&state.update_tx);
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
    headers: HeaderMap,
) -> Response {
    if !request_origin_allowed(headers.get(header::ORIGIN), &state.allowed_origins) {
        return (StatusCode::FORBIDDEN, "origin is not allowed").into_response();
    }

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
    let mut update_rx = state.update_tx.subscribe();
    if send_projection(&mut socket, &state, &audience)
        .await
        .is_err()
    {
        return;
    }

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
                                if send_error(
                                    &mut socket,
                                    "invalid_message",
                                    "expected a supported JSON control-plane message",
                                )
                                .await
                                .is_err()
                                {
                                    break;
                                }
                                continue;
                            }
                        };

                        if handle_client_message(
                            &mut socket,
                            &state,
                            &audience,
                            request,
                        )
                        .await
                        .is_err()
                        {
                            break;
                        }
                    }
                    Message::Close(_) => break,
                    Message::Binary(_) | Message::Ping(_) | Message::Pong(_) => {}
                }
            }
            update = update_rx.changed() => {
                if update.is_err()
                    || send_projection(&mut socket, &state, &audience).await.is_err()
                {
                    break;
                }
            }
        }
    }
}

async fn handle_client_message(
    socket: &mut WebSocket,
    state: &AppState,
    audience: &ProjectionAudience,
    request: ClientMessage,
) -> Result<(), ()> {
    match request {
        ClientMessage::GetProjection => send_projection(socket, state, audience).await,
        ClientMessage::SubmitCommand { command } => {
            let event = match event_for_command(audience, command) {
                Ok(event) => event,
                Err(MutationError::Unauthorized) => {
                    return send_error(
                        socket,
                        "forbidden",
                        "this connection is not authorized for that command",
                    )
                    .await;
                }
                Err(_) => unreachable!("command authorization only returns Unauthorized"),
            };

            let result = state.session.lock().await.apply_event(event);
            match result {
                Ok(()) => {
                    notify_update(&state.update_tx);
                    Ok(())
                }
                Err(MutationError::Invalid(error)) => {
                    warn!(error = ?error, "scenario engine rejected a command");
                    send_error(
                        socket,
                        "invalid_command",
                        "scenario rules rejected the command",
                    )
                    .await
                }
                Err(MutationError::Persistence(error)) => {
                    error!(error = %error, "accepted command could not be journaled");
                    send_error(
                        socket,
                        "journal_unavailable",
                        "the command was not applied because the journal is unavailable",
                    )
                    .await
                }
                Err(MutationError::Unauthorized) => unreachable!(),
            }
        }
        ClientMessage::RequestAiSuggestion => {
            if !matches!(audience, ProjectionAudience::Host) {
                return send_error(socket, "forbidden", "AI suggestions are host-only").await;
            }
            let projection = {
                let session = state.session.lock().await;
                serde_json::to_string(&build_ai_projection(&session.game_state))
            };
            let Ok(projection) = projection else {
                error!("could not serialize minimized AI projection");
                return send_error(
                    socket,
                    "projection_unavailable",
                    "AI projection is unavailable",
                )
                .await;
            };
            match state.ai_adapter.request_suggestion(&projection).await {
                Ok(suggestion) => {
                    send_json(
                        socket,
                        &ServerMessage::AiSuggestion {
                            suggestion: &suggestion,
                        },
                    )
                    .await
                }
                Err(error) => {
                    warn!(error = %error, "AI suggestion unavailable");
                    send_error(
                        socket,
                        "ai_unavailable",
                        "AI suggestion unavailable; gameplay is unaffected",
                    )
                    .await
                }
            }
        }
    }
}

fn event_for_command(
    audience: &ProjectionAudience,
    command: ClientCommand,
) -> Result<JournalEvent, MutationError> {
    match (audience, command) {
        (
            ProjectionAudience::Host,
            ClientCommand::AssignCharacter {
                participant_id,
                character_id,
            },
        ) => Ok(JournalEvent::CharacterAssigned {
            participant_id,
            character_id,
        }),
        (ProjectionAudience::Host, ClientCommand::AdvanceScene { scene_id }) => {
            Ok(JournalEvent::SceneAdvanced { scene_id })
        }
        (ProjectionAudience::Host, ClientCommand::RevealClue { clue_id }) => {
            Ok(JournalEvent::ClueRevealed { clue_id })
        }
        (ProjectionAudience::Host, ClientCommand::OpenVoting) => Ok(JournalEvent::VotingOpened),
        (ProjectionAudience::Host, ClientCommand::CloseVoting) => Ok(JournalEvent::VotingClosed),
        (
            ProjectionAudience::Participant(participant_id),
            ClientCommand::CastVote {
                target_character_id,
            },
        ) => Ok(JournalEvent::VoteCast {
            participant_id: participant_id.clone(),
            target_character_id,
        }),
        _ => Err(MutationError::Unauthorized),
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

async fn send_error(
    socket: &mut WebSocket,
    code: &'static str,
    message: &'static str,
) -> Result<(), ()> {
    send_json(socket, &ServerMessage::Error { code, message }).await
}

async fn send_json<T: Serialize>(socket: &mut WebSocket, value: &T) -> Result<(), ()> {
    let json = serde_json::to_string(value).map_err(|_| ())?;
    socket.send(Message::Text(json)).await.map_err(|_| ())
}

fn notify_update(sender: &watch::Sender<u64>) {
    sender.send_modify(|revision| *revision = revision.wrapping_add(1));
}

fn timestamp_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn valid_display_name(name: &str) -> bool {
    let length = name.chars().count();
    (1..=80).contains(&length) && !name.chars().any(char::is_control)
}

fn parse_allowed_origins(value: &str) -> Result<Vec<HeaderValue>, String> {
    let mut origins = Vec::new();
    for origin in value
        .split(',')
        .map(str::trim)
        .filter(|item| !item.is_empty())
    {
        if origin == "*" {
            return Err("GP_ALLOWED_ORIGINS must list exact origins; wildcard is forbidden".into());
        }
        if origin != "null" {
            let parsed = reqwest::Url::parse(origin)
                .map_err(|error| format!("invalid allowed origin {origin:?}: {error}"))?;
            if !matches!(parsed.scheme(), "http" | "https")
                || parsed.origin().ascii_serialization() != origin
            {
                return Err(format!(
                    "allowed origin {origin:?} must be an exact HTTP(S) origin without a path"
                ));
            }
        }
        origins.push(
            HeaderValue::from_str(origin)
                .map_err(|error| format!("invalid allowed origin header {origin:?}: {error}"))?,
        );
    }
    if origins.is_empty() {
        return Err("GP_ALLOWED_ORIGINS must contain at least one exact origin".into());
    }
    Ok(origins)
}

fn request_origin_allowed(origin: Option<&HeaderValue>, allowed_origins: &[HeaderValue]) -> bool {
    origin.is_none_or(|origin| allowed_origins.contains(origin))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temporary_journal_path() -> PathBuf {
        std::env::temp_dir().join(format!(
            "guilty-party-server-test-{}-{}.jsonl",
            std::process::id(),
            timestamp_unix_ms()
        ))
    }

    #[test]
    fn command_authority_creates_server_owned_events() {
        assert_eq!(
            event_for_command(
                &ProjectionAudience::Host,
                ClientCommand::AdvanceScene {
                    scene_id: "scene_1".into(),
                },
            )
            .unwrap(),
            JournalEvent::SceneAdvanced {
                scene_id: "scene_1".into(),
            }
        );
        assert!(matches!(
            event_for_command(
                &ProjectionAudience::Participant("p1".into()),
                ClientCommand::AdvanceScene {
                    scene_id: "scene_1".into(),
                },
            ),
            Err(MutationError::Unauthorized)
        ));
        assert_eq!(
            event_for_command(
                &ProjectionAudience::Participant("p1".into()),
                ClientCommand::CastVote {
                    target_character_id: "char_1".into(),
                },
            )
            .unwrap(),
            JournalEvent::VoteCast {
                participant_id: "p1".into(),
                target_character_id: "char_1".into(),
            }
        );
        assert!(matches!(
            event_for_command(
                &ProjectionAudience::Host,
                ClientCommand::CastVote {
                    target_character_id: "char_1".into(),
                },
            ),
            Err(MutationError::Unauthorized)
        ));
    }

    #[test]
    fn persisted_events_reconstruct_server_state() {
        let path = temporary_journal_path();
        let scenario = scenario_fixture::load().unwrap();
        let mut session = SessionState::load(scenario.clone(), path.clone()).unwrap();
        session
            .apply_event(JournalEvent::ParticipantJoined {
                participant_id: "p1".into(),
                name: "Synthetic Player".into(),
            })
            .unwrap();
        session
            .apply_event(JournalEvent::CharacterAssigned {
                participant_id: "p1".into(),
                character_id: "char_1".into(),
            })
            .unwrap();

        let restored = SessionState::load(scenario, path.clone()).unwrap();
        fs::remove_file(path).unwrap();

        assert_eq!(restored.game_state, session.game_state);
        assert_eq!(restored.journal, session.journal);
    }

    #[tokio::test]
    async fn update_notifications_preserve_the_latest_revision() {
        let (sender, mut receiver) = watch::channel(0_u64);
        notify_update(&sender);
        notify_update(&sender);

        receiver.changed().await.unwrap();
        assert_eq!(*receiver.borrow_and_update(), 2);
    }

    #[test]
    fn origins_are_exact_and_native_clients_may_omit_origin() {
        let allowed = parse_allowed_origins("http://localhost:8080,null").unwrap();
        assert!(request_origin_allowed(None, &allowed));
        assert!(request_origin_allowed(
            Some(&HeaderValue::from_static("http://localhost:8080")),
            &allowed
        ));
        assert!(!request_origin_allowed(
            Some(&HeaderValue::from_static("https://malicious.example")),
            &allowed
        ));
        assert!(parse_allowed_origins("*").is_err());
        assert!(parse_allowed_origins("http://localhost:8080/path").is_err());
    }

    #[test]
    fn display_names_reject_controls_and_excess_length() {
        assert!(valid_display_name("Synthetic Player"));
        assert!(!valid_display_name("line\nbreak"));
        assert!(!valid_display_name(&"x".repeat(81)));
    }
}
