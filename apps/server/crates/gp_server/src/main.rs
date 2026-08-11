mod ai;
mod auth;
mod projection;
mod protocol;
mod scenario_fixture;

use std::{
    collections::{BTreeMap, VecDeque},
    fs,
    path::PathBuf,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    extract::{
        rejection::JsonRejection,
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
    auth::{AuthorityContext, AuthorityRegistry},
    projection::{build_ai_projection, build_projection, ProjectionAudience},
    protocol::{
        decode_client_request, validate_join_request, AiSuggestionPayload, ClientCommand,
        ClientRequest, CommandResultBody, CompatibilityResponse, ErrorBody, JoinKind, JoinRequest,
        JoinResponse, ProblemDetails, ProjectionPayload, ProtocolError, ServerEnvelope,
        CONTROL_SUBPROTOCOL, PARTICIPANT_VOTING_FEATURE, PREFERRED_PROTOCOL_VERSION,
        PROTOCOL_VERSION,
    },
};

const DEFAULT_ALLOWED_ORIGINS: &str =
    "http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:8081,http://localhost:8081";
const DEFAULT_JOURNAL_PATH: &str = "data/mvp-session.jsonl";
const MAX_IDEMPOTENCY_RECORDS: usize = 256;

struct AppState {
    session: Mutex<SessionState>,
    authorities: RwLock<AuthorityRegistry>,
    ai_adapter: Arc<dyn AiAdapter>,
    update_tx: watch::Sender<u64>,
    allowed_origins: Vec<HeaderValue>,
    session_id: String,
    room_id: String,
}

struct SessionState {
    game_state: GameState,
    journal: Vec<JournalEntry>,
    journal_path: PathBuf,
    idempotency_records: BTreeMap<String, IdempotencyRecord>,
    idempotency_order: VecDeque<String>,
}

#[derive(Debug, Clone)]
struct IdempotencyRecord {
    command_fingerprint: String,
    result: CommandResultBody,
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
            idempotency_records: BTreeMap::new(),
            idempotency_order: VecDeque::new(),
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

    fn server_sequence(&self) -> u64 {
        self.journal.len() as u64
    }

    fn idempotency_record(
        &self,
        endpoint_id: &str,
        idempotency_id: &str,
    ) -> Option<&IdempotencyRecord> {
        self.idempotency_records
            .get(&idempotency_key(endpoint_id, idempotency_id))
    }

    fn remember_command_result(
        &mut self,
        endpoint_id: &str,
        idempotency_id: &str,
        command_fingerprint: String,
        result: CommandResultBody,
    ) {
        let key = idempotency_key(endpoint_id, idempotency_id);
        if !self.idempotency_records.contains_key(&key) {
            self.idempotency_order.push_back(key.clone());
        }
        self.idempotency_records.insert(
            key,
            IdempotencyRecord {
                command_fingerprint,
                result,
            },
        );
        while self.idempotency_order.len() > MAX_IDEMPOTENCY_RECORDS {
            if let Some(expired) = self.idempotency_order.pop_front() {
                self.idempotency_records.remove(&expired);
            }
        }
    }
}

#[derive(Debug, Deserialize)]
struct WebSocketQuery {
    token: Option<String>,
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
    let session_id = new_identifier("session");
    let room_id = new_identifier("room");
    let host_endpoint_id = new_identifier("endpoint");
    let authorities = AuthorityRegistry::new(host_token, session_id.clone(), host_endpoint_id)?;
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
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([header::CONTENT_TYPE]);
    let state = Arc::new(AppState {
        session: Mutex::new(session),
        authorities: RwLock::new(authorities),
        ai_adapter,
        update_tx,
        allowed_origins,
        session_id,
        room_id,
    });

    let app = Router::new()
        .route("/api/protocol", get(handle_protocol))
        .route("/api/v1/join", post(handle_join))
        .route("/ws/v1", get(ws_handler))
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await?;
    info!("Guilty Party prototype listening on 0.0.0.0:3000");
    axum::serve(listener, app).await?;
    Ok(())
}

async fn handle_protocol() -> Json<CompatibilityResponse> {
    Json(CompatibilityResponse::default())
}

async fn handle_join(
    State(state): State<Arc<AppState>>,
    request: Result<Json<JoinRequest>, JsonRejection>,
) -> Result<Response, ApiProblem> {
    let Json(request) = request.map_err(|_| {
        ApiProblem::bad_request(
            "invalid_request",
            "The join request must be valid JSON matching protocol v1",
        )
    })?;
    validate_join_request(&request).map_err(ApiProblem::from_protocol)?;

    let endpoint_id = new_identifier("endpoint");
    match request.kind {
        JoinKind::Stage => {
            let token = state.authorities.write().await.issue_stage(
                request.protocol_version.clone(),
                request.endpoint.features.clone(),
                state.session_id.clone(),
                endpoint_id.clone(),
            );
            Ok(join_response(JoinResponse {
                protocol_version: request.protocol_version,
                token,
                session_id: state.session_id.clone(),
                endpoint_id,
                room_id: state.room_id.clone(),
                participant_id: None,
            }))
        }
        JoinKind::Participant => {
            let display_name = request
                .display_name
                .as_deref()
                .map(str::trim)
                .expect("validated participant join has a display name");
            let participant_id = new_identifier("participant");
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
                return Err(ApiProblem::internal(
                    "join_unavailable",
                    "The participant could not be joined",
                ));
            }

            notify_update(&state.update_tx);
            let token = state.authorities.write().await.issue_participant(
                participant_id.clone(),
                request.protocol_version.clone(),
                request.endpoint.features.clone(),
                state.session_id.clone(),
                endpoint_id.clone(),
            );
            Ok(join_response(JoinResponse {
                protocol_version: request.protocol_version,
                token,
                session_id: state.session_id.clone(),
                endpoint_id,
                room_id: state.room_id.clone(),
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
        return ApiProblem::forbidden("origin_forbidden", "The request origin is not allowed")
            .into_response();
    }
    if !offers_control_subprotocol(headers.get(header::SEC_WEBSOCKET_PROTOCOL)) {
        return ApiProblem::new(
            StatusCode::UPGRADE_REQUIRED,
            "unsupported_subprotocol",
            "The Guilty Party control-plane v1 WebSocket subprotocol is required",
            false,
        )
        .into_response();
    }

    let authority = {
        let authorities = state.authorities.read().await;
        query
            .token
            .as_deref()
            .and_then(|token| authorities.authenticate(token))
    };
    let Some(authority) = authority else {
        return ApiProblem::unauthorized(
            "invalid_authority",
            "The connection authority is invalid or missing",
        )
        .into_response();
    };

    ws.protocols([CONTROL_SUBPROTOCOL])
        .max_message_size(16 * 1024)
        .max_frame_size(16 * 1024)
        .on_upgrade(move |socket| handle_socket(socket, state, authority))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>, authority: AuthorityContext) {
    let mut update_rx = state.update_tx.subscribe();
    if send_projection(&mut socket, &state, &authority, None)
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
                        let request = match decode_client_request(
                            &text,
                            &authority.protocol_version,
                            &authority.session_id,
                            &authority.endpoint_id,
                        ) {
                            Ok(request) => request,
                            Err(error) => {
                                if send_protocol_error(&mut socket, &authority, error)
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
                            &authority,
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
                    || send_projection(&mut socket, &state, &authority, None).await.is_err()
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
    authority: &AuthorityContext,
    request: ClientRequest,
) -> Result<(), ()> {
    match request {
        ClientRequest::GetProjection { message_id } => {
            send_projection(socket, state, authority, Some(message_id)).await
        }
        ClientRequest::SubmitCommand {
            message_id,
            idempotency_id,
            primary_authority_generation,
            command,
            command_fingerprint,
        } => {
            let (result, server_sequence, notify) = {
                let mut session = state.session.lock().await;
                process_command(
                    &mut session,
                    authority,
                    idempotency_id,
                    primary_authority_generation,
                    command,
                    command_fingerprint,
                )
            };

            send_command_result(socket, authority, message_id, server_sequence, result).await?;
            if notify {
                notify_update(&state.update_tx);
            }
            Ok(())
        }
        ClientRequest::RequestAiSuggestion { message_id } => {
            if !matches!(authority.audience, ProjectionAudience::Host) {
                return send_error(
                    socket,
                    authority,
                    Some(message_id),
                    "forbidden",
                    "AI suggestions are host-only",
                    false,
                )
                .await;
            }
            let projection = {
                let session = state.session.lock().await;
                serde_json::to_string(&build_ai_projection(&session.game_state))
            };
            let Ok(projection) = projection else {
                error!("could not serialize minimized AI projection");
                return send_error(
                    socket,
                    authority,
                    Some(message_id),
                    "projection_unavailable",
                    "AI projection is unavailable",
                    true,
                )
                .await;
            };
            match state.ai_adapter.request_suggestion(&projection).await {
                Ok(suggestion) => {
                    send_ai_suggestion(socket, authority, message_id, &suggestion).await
                }
                Err(error) => {
                    warn!(error = %error, "AI suggestion unavailable");
                    send_error(
                        socket,
                        authority,
                        Some(message_id),
                        "ai_unavailable",
                        "AI suggestion unavailable; gameplay is unaffected",
                        true,
                    )
                    .await
                }
            }
        }
    }
}

fn process_command(
    session: &mut SessionState,
    authority: &AuthorityContext,
    idempotency_id: String,
    primary_authority_generation: u64,
    command: ClientCommand,
    command_fingerprint: String,
) -> (CommandResultBody, u64, bool) {
    if let Some(record) = session
        .idempotency_record(&authority.endpoint_id, &idempotency_id)
        .cloned()
    {
        let result = if record.command_fingerprint == command_fingerprint {
            record.result
        } else {
            rejected_command_result(
                idempotency_id,
                authority.primary_authority_generation,
                "idempotency_conflict",
                "The idempotency identifier was reused for different content",
            )
        };
        return (result, session.server_sequence(), false);
    }

    let result = if primary_authority_generation != authority.primary_authority_generation {
        rejected_command_result(
            idempotency_id.clone(),
            authority.primary_authority_generation,
            "stale_authority",
            "The primary-authority generation is stale",
        )
    } else {
        match event_for_command(&authority.audience, command) {
            Err(MutationError::Unauthorized) => rejected_command_result(
                idempotency_id.clone(),
                authority.primary_authority_generation,
                "forbidden",
                "This endpoint is not authorized for that command",
            ),
            Err(_) => unreachable!("command authorization only returns Unauthorized"),
            Ok(event) => match session.apply_event(event) {
                Ok(()) => CommandResultBody::Accepted {
                    idempotency_id: idempotency_id.clone(),
                    primary_authority_generation: authority.primary_authority_generation,
                },
                Err(MutationError::Invalid(error)) => {
                    warn!(error = ?error, "scenario engine rejected a command");
                    rejected_command_result(
                        idempotency_id.clone(),
                        authority.primary_authority_generation,
                        "invalid_command",
                        "Scenario rules rejected the command",
                    )
                }
                Err(MutationError::Persistence(error)) => {
                    error!(error = %error, "accepted command could not be journaled");
                    rejected_command_result(
                        idempotency_id.clone(),
                        authority.primary_authority_generation,
                        "journal_unavailable",
                        "The command was not applied because the journal is unavailable",
                    )
                }
                Err(MutationError::Unauthorized) => unreachable!(),
            },
        }
    };
    let notify = matches!(result, CommandResultBody::Accepted { .. });
    session.remember_command_result(
        &authority.endpoint_id,
        &idempotency_id,
        command_fingerprint,
        result.clone(),
    );
    (result, session.server_sequence(), notify)
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
    authority: &AuthorityContext,
    correlation_id: Option<String>,
) -> Result<(), ()> {
    let (mut projection, server_sequence) = {
        let session = state.session.lock().await;
        (
            build_projection(&session.game_state, &authority.audience),
            session.server_sequence(),
        )
    };
    if authority.protocol_version != PREFERRED_PROTOCOL_VERSION
        || !authority
            .features
            .iter()
            .any(|feature| feature == PARTICIPANT_VOTING_FEATURE)
    {
        projection.remove_participant_voting_feature();
    }
    send_json(
        socket,
        &ServerEnvelope {
            protocol_version: authority.protocol_version.clone(),
            message_type: "projection",
            message_id: new_identifier("message"),
            correlation_id,
            session_id: Some(authority.session_id.clone()),
            endpoint_id: Some(authority.endpoint_id.clone()),
            server_sequence: Some(server_sequence),
            payload: ProjectionPayload { projection },
        },
    )
    .await
}

async fn send_error(
    socket: &mut WebSocket,
    authority: &AuthorityContext,
    correlation_id: Option<String>,
    code: &'static str,
    title: &'static str,
    retryable: bool,
) -> Result<(), ()> {
    send_json(
        socket,
        &ServerEnvelope {
            protocol_version: authority.protocol_version.clone(),
            message_type: "error",
            message_id: new_identifier("message"),
            correlation_id,
            session_id: Some(authority.session_id.clone()),
            endpoint_id: Some(authority.endpoint_id.clone()),
            server_sequence: None,
            payload: ErrorBody {
                code,
                title,
                retryable: Some(retryable),
            },
        },
    )
    .await
}

async fn send_protocol_error(
    socket: &mut WebSocket,
    authority: &AuthorityContext,
    error: ProtocolError,
) -> Result<(), ()> {
    send_error(
        socket,
        authority,
        error.correlation_id,
        error.code,
        error.title,
        false,
    )
    .await
}

async fn send_ai_suggestion(
    socket: &mut WebSocket,
    authority: &AuthorityContext,
    correlation_id: String,
    suggestion: &str,
) -> Result<(), ()> {
    send_json(
        socket,
        &ServerEnvelope {
            protocol_version: authority.protocol_version.clone(),
            message_type: "ai_suggestion",
            message_id: new_identifier("message"),
            correlation_id: Some(correlation_id),
            session_id: Some(authority.session_id.clone()),
            endpoint_id: Some(authority.endpoint_id.clone()),
            server_sequence: None,
            payload: AiSuggestionPayload { suggestion },
        },
    )
    .await
}

async fn send_command_result(
    socket: &mut WebSocket,
    authority: &AuthorityContext,
    correlation_id: String,
    server_sequence: u64,
    result: CommandResultBody,
) -> Result<(), ()> {
    send_json(
        socket,
        &ServerEnvelope {
            protocol_version: authority.protocol_version.clone(),
            message_type: "command_result",
            message_id: new_identifier("message"),
            correlation_id: Some(correlation_id),
            session_id: Some(authority.session_id.clone()),
            endpoint_id: Some(authority.endpoint_id.clone()),
            server_sequence: Some(server_sequence),
            payload: result,
        },
    )
    .await
}

async fn send_json<T: Serialize>(socket: &mut WebSocket, value: &T) -> Result<(), ()> {
    let json = serde_json::to_string(value).map_err(|_| ())?;
    socket.send(Message::Text(json)).await.map_err(|_| ())
}

fn notify_update(sender: &watch::Sender<u64>) {
    sender.send_modify(|revision| *revision = revision.wrapping_add(1));
}

fn rejected_command_result(
    idempotency_id: String,
    primary_authority_generation: u64,
    code: &'static str,
    title: &'static str,
) -> CommandResultBody {
    CommandResultBody::Rejected {
        idempotency_id,
        primary_authority_generation,
        code,
        title,
    }
}

fn idempotency_key(endpoint_id: &str, idempotency_id: &str) -> String {
    format!("{endpoint_id}\0{idempotency_id}")
}

fn new_identifier(prefix: &str) -> String {
    format!("{prefix}_{}", Uuid::new_v4().simple())
}

fn timestamp_unix_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
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

fn offers_control_subprotocol(header: Option<&HeaderValue>) -> bool {
    header
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| {
            value
                .split(',')
                .map(str::trim)
                .any(|protocol| protocol == CONTROL_SUBPROTOCOL)
        })
}

fn join_response(response: JoinResponse) -> Response {
    let mut response = Json(response).into_response();
    response
        .headers_mut()
        .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
    response
}

struct ApiProblem {
    status: StatusCode,
    body: ProblemDetails,
}

impl ApiProblem {
    fn new(status: StatusCode, code: &'static str, title: &'static str, retryable: bool) -> Self {
        Self {
            status,
            body: ProblemDetails {
                protocol_version: PROTOCOL_VERSION,
                problem_type: "about:blank",
                title,
                status: status.as_u16(),
                code,
                correlation_id: new_identifier("correlation"),
                retryable,
            },
        }
    }

    fn bad_request(code: &'static str, title: &'static str) -> Self {
        Self::new(StatusCode::BAD_REQUEST, code, title, false)
    }

    fn unauthorized(code: &'static str, title: &'static str) -> Self {
        Self::new(StatusCode::UNAUTHORIZED, code, title, false)
    }

    fn forbidden(code: &'static str, title: &'static str) -> Self {
        Self::new(StatusCode::FORBIDDEN, code, title, false)
    }

    fn internal(code: &'static str, title: &'static str) -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, code, title, true)
    }

    fn from_protocol(error: ProtocolError) -> Self {
        Self::bad_request(error.code, error.title)
    }
}

impl IntoResponse for ApiProblem {
    fn into_response(self) -> Response {
        let mut response = (self.status, Json(self.body)).into_response();
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            HeaderValue::from_static("application/problem+json"),
        );
        response
            .headers_mut()
            .insert(header::CACHE_CONTROL, HeaderValue::from_static("no-store"));
        response
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temporary_journal_path() -> PathBuf {
        std::env::temp_dir().join(format!(
            "guilty-party-server-test-{}-{}.jsonl",
            std::process::id(),
            Uuid::new_v4().simple()
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
    fn websocket_subprotocol_negotiation_is_exact() {
        assert!(offers_control_subprotocol(Some(&HeaderValue::from_static(
            "example, guiltyparty.control.v1"
        ))));
        assert!(!offers_control_subprotocol(Some(
            &HeaderValue::from_static("guiltyparty.control.v10")
        )));
        assert!(!offers_control_subprotocol(None));
    }

    #[test]
    fn command_retries_are_idempotent_and_conflicts_fail_closed() {
        let path = temporary_journal_path();
        let scenario = scenario_fixture::load().unwrap();
        let mut session = SessionState::load(scenario, path.clone()).unwrap();
        let authority = AuthorityContext {
            audience: ProjectionAudience::Host,
            protocol_version: PROTOCOL_VERSION.into(),
            features: Vec::new(),
            session_id: "session-1".into(),
            endpoint_id: "host-endpoint".into(),
            primary_authority_generation: 0,
        };
        let command = ClientCommand::AdvanceScene {
            scene_id: "scene_1".into(),
        };

        let (first, first_sequence, first_notify) = process_command(
            &mut session,
            &authority,
            "command-1".into(),
            0,
            command.clone(),
            "advance-scene-1".into(),
        );
        assert!(matches!(first, CommandResultBody::Accepted { .. }));
        assert_eq!(first_sequence, 1);
        assert!(first_notify);

        let (retry, retry_sequence, retry_notify) = process_command(
            &mut session,
            &authority,
            "command-1".into(),
            0,
            command,
            "advance-scene-1".into(),
        );
        assert_eq!(retry, first);
        assert_eq!(retry_sequence, 1);
        assert!(!retry_notify);
        assert_eq!(session.journal.len(), 1);

        let (conflict, _, conflict_notify) = process_command(
            &mut session,
            &authority,
            "command-1".into(),
            0,
            ClientCommand::OpenVoting,
            "open-voting".into(),
        );
        assert!(matches!(
            conflict,
            CommandResultBody::Rejected {
                code: "idempotency_conflict",
                ..
            }
        ));
        assert!(!conflict_notify);
        assert_eq!(session.journal.len(), 1);

        fs::remove_file(path).unwrap();
    }

    #[test]
    fn stale_authority_and_unauthorized_commands_do_not_mutate_truth() {
        let path = temporary_journal_path();
        let scenario = scenario_fixture::load().unwrap();
        let mut session = SessionState::load(scenario, path).unwrap();
        let host = AuthorityContext {
            audience: ProjectionAudience::Host,
            protocol_version: PROTOCOL_VERSION.into(),
            features: Vec::new(),
            session_id: "session-1".into(),
            endpoint_id: "host-endpoint".into(),
            primary_authority_generation: 0,
        };

        let (stale, _, stale_notify) = process_command(
            &mut session,
            &host,
            "stale-command".into(),
            1,
            ClientCommand::OpenVoting,
            "open-voting".into(),
        );
        assert!(matches!(
            stale,
            CommandResultBody::Rejected {
                code: "stale_authority",
                ..
            }
        ));
        assert!(!stale_notify);

        let participant = AuthorityContext {
            audience: ProjectionAudience::Participant("participant-1".into()),
            endpoint_id: "participant-endpoint".into(),
            ..host
        };
        let (forbidden, _, forbidden_notify) = process_command(
            &mut session,
            &participant,
            "forbidden-command".into(),
            0,
            ClientCommand::AdvanceScene {
                scene_id: "scene_1".into(),
            },
            "advance-scene-1".into(),
        );
        assert!(matches!(
            forbidden,
            CommandResultBody::Rejected {
                code: "forbidden",
                ..
            }
        ));
        assert!(!forbidden_notify);
        assert!(session.journal.is_empty());
    }

    #[test]
    fn idempotency_records_are_endpoint_scoped_and_bounded() {
        let path = temporary_journal_path();
        let scenario = scenario_fixture::load().unwrap();
        let mut session = SessionState::load(scenario, path).unwrap();

        for index in 0..=MAX_IDEMPOTENCY_RECORDS {
            let idempotency_id = format!("command-{index}");
            session.remember_command_result(
                "endpoint-1",
                &idempotency_id,
                format!("fingerprint-{index}"),
                rejected_command_result(
                    idempotency_id.clone(),
                    0,
                    "synthetic_rejection",
                    "Synthetic rejection",
                ),
            );
        }

        assert_eq!(session.idempotency_records.len(), MAX_IDEMPOTENCY_RECORDS);
        assert!(session
            .idempotency_record("endpoint-1", "command-0")
            .is_none());
        assert!(session
            .idempotency_record("endpoint-1", "command-256")
            .is_some());
        assert!(session
            .idempotency_record("endpoint-2", "command-256")
            .is_none());
    }

    #[test]
    fn http_problems_are_safe_and_not_cacheable() {
        let response =
            ApiProblem::bad_request("invalid_request", "Invalid request").into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        assert_eq!(
            response.headers().get(header::CONTENT_TYPE).unwrap(),
            "application/problem+json"
        );
        assert_eq!(
            response.headers().get(header::CACHE_CONTROL).unwrap(),
            "no-store"
        );
    }
}
