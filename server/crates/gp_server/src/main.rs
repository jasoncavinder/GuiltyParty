mod ai;
mod projection;

use axum::{
    extract::{State, WebSocketUpgrade, ws::{WebSocket, Message}},
    response::IntoResponse,
    routing::get,
    Router,
};
use gp_scenario::engine::GameState;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, error};

struct AppState {
    game_state: Mutex<GameState>,
    ai_adapter: Box<dyn ai::AiAdapter>,
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    // In a real run, we'd load this from an immutable file
    let mock_scenario = gp_scenario::schema::Scenario {
        id: "mvp-scenario".into(),
        title: "MVP Test".into(),
        description: "A prototype scenario".into(),
        characters: vec![],
        scenes: vec![],
        clues: vec![],
        outcomes: vec![],
    };

    let ai_endpoint = std::env::var("LM_STUDIO_ENDPOINT").unwrap_or_else(|_| "http://127.0.0.1:1234/v1/chat/completions".to_string());
    let ai_model = std::env::var("LM_STUDIO_MODEL").unwrap_or_else(|_| "qwen/qwen3.6-27b".to_string());

    info!("Initializing server. AI endpoint: {}", ai_endpoint);

    let state = Arc::new(AppState {
        game_state: Mutex::new(GameState::new(mock_scenario)),
        ai_adapter: Box::new(ai::LmStudioAdapter::new(ai_endpoint, ai_model)),
    });

    let app = Router::new()
        .route("/api/join", get(handle_join))
        .route("/ws", get(ws_handler))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    info!("Listening on 0.0.0.0:3000");
    axum::serve(listener, app).await.unwrap();
}

async fn handle_join() -> impl IntoResponse {
    // Scaffold: HTTP REST endpoint for joining
    "Join endpoint active (prototype)"
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
    info!("New WebSocket connection");
    while let Some(msg) = socket.recv().await {
        if let Ok(msg) = msg {
            match msg {
                Message::Text(text) => {
                    info!("Received text: {}", text);
                    // Scaffold: Parse as JournalEvent, apply to state, broadcast updates.
                    
                    // To trigger AI in the MVP:
                    if text.starts_with("AI_SUGGEST") {
                        let st = state.game_state.lock().await;
                        let proj = projection::build_projection(&st, None, true);
                        if let Ok(json) = serde_json::to_string(&proj) {
                            drop(st); // Drop lock before async call
                            match state.ai_adapter.request_suggestion(&json).await {
                                Ok(suggestion) => {
                                    let _ = socket.send(Message::Text(format!("AI: {}", suggestion))).await;
                                }
                                Err(e) => {
                                    error!("AI error: {}", e);
                                    let _ = socket.send(Message::Text(format!("AI Error: {}", e))).await;
                                }
                            }
                        }
                    } else {
                        let _ = socket.send(Message::Text(format!("Echo: {}", text))).await;
                    }
                }
                Message::Close(_) => {
                    info!("WebSocket closed");
                    break;
                }
                _ => {}
            }
        } else {
            break;
        }
    }
}
