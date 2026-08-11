use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const PROTOCOL_VERSION: &str = "1.0";
pub const PREFERRED_PROTOCOL_VERSION: &str = "1.1";
pub const CONTROL_SUBPROTOCOL: &str = "guiltyparty.control.v1";
pub const PARTICIPANT_VOTING_FEATURE: &str = "participant_vote_targets_v1";
pub const PROTOCOL_FEATURES: [&str; 4] = [
    "authorized_projections",
    "command_idempotency",
    "host_ai_suggestions",
    PARTICIPANT_VOTING_FEATURE,
];

#[derive(Debug, Serialize)]
pub struct CompatibilityResponse {
    pub supported_protocol_majors: [u8; 1],
    pub preferred_protocol_version: &'static str,
    pub required_upgrade: bool,
    pub features: [&'static str; 4],
}

impl Default for CompatibilityResponse {
    fn default() -> Self {
        Self {
            supported_protocol_majors: [1],
            preferred_protocol_version: PREFERRED_PROTOCOL_VERSION,
            required_upgrade: false,
            features: PROTOCOL_FEATURES,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JoinKind {
    Participant,
    Stage,
}

#[derive(Debug, Clone, Deserialize)]
pub struct EndpointRegistration {
    pub platform: String,
    pub capabilities: Vec<String>,
    #[serde(default)]
    pub features: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct JoinRequest {
    pub protocol_version: String,
    pub kind: JoinKind,
    pub display_name: Option<String>,
    pub endpoint: EndpointRegistration,
}

#[derive(Debug, Serialize)]
pub struct JoinResponse {
    pub protocol_version: String,
    pub token: String,
    pub session_id: String,
    pub endpoint_id: String,
    pub room_id: String,
    pub participant_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ClientEnvelope {
    pub protocol_version: String,
    #[serde(rename = "type")]
    pub message_type: String,
    pub message_id: String,
    pub correlation_id: Option<String>,
    pub session_id: Option<String>,
    pub endpoint_id: Option<String>,
    pub idempotency_id: Option<String>,
    pub primary_authority_generation: Option<u64>,
    pub payload: Value,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientCommand {
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

#[derive(Debug)]
pub enum ClientRequest {
    GetProjection {
        message_id: String,
    },
    RequestAiSuggestion {
        message_id: String,
    },
    SubmitCommand {
        message_id: String,
        idempotency_id: String,
        primary_authority_generation: u64,
        command: ClientCommand,
        command_fingerprint: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProtocolError {
    pub code: &'static str,
    pub title: &'static str,
    pub correlation_id: Option<String>,
}

impl ProtocolError {
    fn new(code: &'static str, title: &'static str) -> Self {
        Self {
            code,
            title,
            correlation_id: None,
        }
    }

    fn correlated(mut self, correlation_id: &str) -> Self {
        self.correlation_id = Some(correlation_id.to_string());
        self
    }
}

#[derive(Debug, Serialize)]
pub struct ServerEnvelope<T: Serialize> {
    pub protocol_version: String,
    #[serde(rename = "type")]
    pub message_type: &'static str,
    pub message_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub correlation_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoint_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_sequence: Option<u64>,
    pub payload: T,
}

#[derive(Debug, Serialize)]
pub struct ProjectionPayload<T: Serialize> {
    pub projection: T,
}

#[derive(Debug, Serialize)]
pub struct AiSuggestionPayload<'a> {
    pub suggestion: &'a str,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(tag = "status", rename_all = "snake_case")]
pub enum CommandResultBody {
    Accepted {
        idempotency_id: String,
        primary_authority_generation: u64,
    },
    Rejected {
        idempotency_id: String,
        primary_authority_generation: u64,
        code: &'static str,
        title: &'static str,
    },
}

#[derive(Debug, Serialize)]
pub struct ErrorBody {
    pub code: &'static str,
    pub title: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retryable: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ProblemDetails {
    pub protocol_version: &'static str,
    #[serde(rename = "type")]
    pub problem_type: &'static str,
    pub title: &'static str,
    pub status: u16,
    pub code: &'static str,
    pub correlation_id: String,
    pub retryable: bool,
}

pub fn validate_join_request(request: &JoinRequest) -> Result<(), ProtocolError> {
    if !supported_protocol_version(&request.protocol_version) {
        return Err(ProtocolError::new(
            "unsupported_protocol",
            "The requested control-plane protocol is not supported",
        ));
    }

    if !valid_feature_identifier(&request.endpoint.platform) {
        return Err(ProtocolError::new(
            "invalid_endpoint",
            "The endpoint platform identifier is invalid",
        ));
    }
    let mut capabilities = BTreeSet::new();
    for capability in &request.endpoint.capabilities {
        if !valid_feature_identifier(capability) || !capabilities.insert(capability.clone()) {
            return Err(ProtocolError::new(
                "invalid_endpoint",
                "Endpoint capabilities must be valid and unique",
            ));
        }
    }
    let mut features = BTreeSet::new();
    for feature in &request.endpoint.features {
        if !valid_feature_identifier(feature) || !features.insert(feature.clone()) {
            return Err(ProtocolError::new(
                "invalid_endpoint",
                "Endpoint features must be valid and unique",
            ));
        }
    }
    if features.contains(PARTICIPANT_VOTING_FEATURE)
        && (request.protocol_version != PREFERRED_PROTOCOL_VERSION
            || !matches!(request.kind, JoinKind::Participant)
            || !capabilities.contains("private_display"))
    {
        return Err(ProtocolError::new(
            "invalid_endpoint",
            "The participant voting feature is not valid for this endpoint",
        ));
    }

    match request.kind {
        JoinKind::Participant => {
            let display_name = request
                .display_name
                .as_deref()
                .map(str::trim)
                .ok_or_else(|| {
                    ProtocolError::new("invalid_join", "A participant display name is required")
                })?;
            if !valid_display_name(display_name) {
                return Err(ProtocolError::new(
                    "invalid_join",
                    "The participant display name is invalid",
                ));
            }
        }
        JoinKind::Stage if request.display_name.is_some() => {
            return Err(ProtocolError::new(
                "invalid_join",
                "A Stage join cannot include a display name",
            ));
        }
        JoinKind::Stage => {}
    }

    Ok(())
}

pub fn decode_client_request(
    text: &str,
    expected_protocol_version: &str,
    expected_session_id: &str,
    expected_endpoint_id: &str,
) -> Result<ClientRequest, ProtocolError> {
    let envelope: ClientEnvelope = serde_json::from_str(text).map_err(|_| {
        ProtocolError::new(
            "invalid_message",
            "Expected a supported JSON control-plane envelope",
        )
    })?;

    let correlation = envelope.message_id.clone();
    if !valid_identifier(&envelope.message_id)
        || envelope
            .correlation_id
            .as_deref()
            .is_some_and(|value| !valid_identifier(value))
    {
        return Err(ProtocolError::new(
            "invalid_message",
            "The control-plane message identifier is invalid",
        ));
    }
    if envelope.protocol_version != expected_protocol_version {
        return Err(ProtocolError::new(
            "unsupported_protocol",
            "The control-plane protocol version is not supported",
        )
        .correlated(&correlation));
    }
    if envelope.session_id.as_deref() != Some(expected_session_id)
        || envelope.endpoint_id.as_deref() != Some(expected_endpoint_id)
    {
        return Err(ProtocolError::new(
            "invalid_context",
            "The message context does not match this connection",
        )
        .correlated(&correlation));
    }
    if !envelope.payload.is_object() {
        return Err(ProtocolError::new(
            "invalid_message",
            "The control-plane message payload must be an object",
        )
        .correlated(&correlation));
    }

    match envelope.message_type.as_str() {
        "get_projection" => Ok(ClientRequest::GetProjection {
            message_id: envelope.message_id,
        }),
        "request_ai_suggestion" => Ok(ClientRequest::RequestAiSuggestion {
            message_id: envelope.message_id,
        }),
        "submit_command" => {
            let idempotency_id = envelope
                .idempotency_id
                .filter(|value| valid_identifier(value));
            let Some(idempotency_id) = idempotency_id else {
                return Err(ProtocolError::new(
                    "invalid_message",
                    "A valid idempotency identifier is required for commands",
                )
                .correlated(&correlation));
            };
            let Some(primary_authority_generation) = envelope.primary_authority_generation else {
                return Err(ProtocolError::new(
                    "invalid_message",
                    "The primary-authority generation is required for commands",
                )
                .correlated(&correlation));
            };
            let command_value = envelope.payload.get("command").cloned().ok_or_else(|| {
                ProtocolError::new("invalid_message", "A supported command payload is required")
                    .correlated(&correlation)
            })?;
            let command_fingerprint = serde_json::to_string(&command_value).map_err(|_| {
                ProtocolError::new("invalid_message", "The command payload is invalid")
                    .correlated(&correlation)
            })?;
            let command = serde_json::from_value(command_value).map_err(|_| {
                ProtocolError::new("unknown_command", "The command type is not supported")
                    .correlated(&correlation)
            })?;
            Ok(ClientRequest::SubmitCommand {
                message_id: envelope.message_id,
                idempotency_id,
                primary_authority_generation,
                command,
                command_fingerprint,
            })
        }
        _ => Err(ProtocolError::new(
            "unknown_message_type",
            "The control-plane message type is not supported",
        )
        .correlated(&correlation)),
    }
}

pub fn supported_protocol_version(value: &str) -> bool {
    matches!(value, PROTOCOL_VERSION | PREFERRED_PROTOCOL_VERSION)
}

pub fn valid_display_name(name: &str) -> bool {
    let length = name.chars().count();
    (1..=80).contains(&length) && !name.chars().any(char::is_control)
}

fn valid_identifier(value: &str) -> bool {
    (1..=128).contains(&value.chars().count())
}

fn valid_feature_identifier(value: &str) -> bool {
    let bytes = value.as_bytes();
    !bytes.is_empty()
        && bytes.len() <= 128
        && bytes[0].is_ascii_lowercase()
        && bytes[1..].iter().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || matches!(byte, b'_' | b'.' | b'-')
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn context_envelope(message_type: &str, payload: Value) -> Value {
        serde_json::json!({
            "protocol_version": "1.0",
            "type": message_type,
            "message_id": "message-1",
            "session_id": "session-1",
            "endpoint_id": "endpoint-1",
            "payload": payload,
        })
    }

    #[test]
    fn join_validation_preserves_participant_and_endpoint_boundaries() {
        let participant: JoinRequest = serde_json::from_value(serde_json::json!({
            "protocol_version": "1.0",
            "kind": "participant",
            "display_name": "Synthetic Player",
            "endpoint": {
                "platform": "browser_companion",
                "capabilities": ["private_display", "touch_input"]
            }
        }))
        .unwrap();
        assert!(validate_join_request(&participant).is_ok());

        let stage: JoinRequest = serde_json::from_value(serde_json::json!({
            "protocol_version": "1.0",
            "kind": "stage",
            "display_name": "Not a participant",
            "endpoint": {"platform": "webos_stage", "capabilities": ["public_display"]}
        }))
        .unwrap();
        assert_eq!(
            validate_join_request(&stage).unwrap_err().code,
            "invalid_join"
        );
    }

    #[test]
    fn participant_voting_requires_minor_1_1_and_a_private_participant_endpoint() {
        let negotiated: JoinRequest = serde_json::from_value(serde_json::json!({
            "protocol_version": "1.1",
            "kind": "participant",
            "display_name": "Synthetic Player",
            "endpoint": {
                "platform": "ios_companion",
                "capabilities": ["private_display"],
                "features": [PARTICIPANT_VOTING_FEATURE]
            }
        }))
        .unwrap();
        assert!(validate_join_request(&negotiated).is_ok());

        for invalid in [
            serde_json::json!({
                "protocol_version": "1.0",
                "kind": "participant",
                "display_name": "Synthetic Player",
                "endpoint": {
                    "platform": "ios_companion",
                    "capabilities": ["private_display"],
                    "features": [PARTICIPANT_VOTING_FEATURE]
                }
            }),
            serde_json::json!({
                "protocol_version": "1.1",
                "kind": "stage",
                "endpoint": {
                    "platform": "webos",
                    "capabilities": ["public_display"],
                    "features": [PARTICIPANT_VOTING_FEATURE]
                }
            }),
        ] {
            let request: JoinRequest = serde_json::from_value(invalid).unwrap();
            assert_eq!(
                validate_join_request(&request).unwrap_err().code,
                "invalid_endpoint"
            );
        }
    }

    #[test]
    fn client_envelopes_require_matching_connection_context() {
        let envelope = context_envelope("get_projection", serde_json::json!({}));
        let error = decode_client_request(
            &envelope.to_string(),
            PROTOCOL_VERSION,
            "other-session",
            "endpoint-1",
        )
        .unwrap_err();
        assert_eq!(error.code, "invalid_context");
        assert_eq!(error.correlation_id.as_deref(), Some("message-1"));
    }

    #[test]
    fn command_envelopes_require_idempotency_and_generation() {
        let envelope = context_envelope(
            "submit_command",
            serde_json::json!({"command": {"type": "open_voting"}}),
        );
        assert_eq!(
            decode_client_request(
                &envelope.to_string(),
                PROTOCOL_VERSION,
                "session-1",
                "endpoint-1",
            )
            .unwrap_err()
            .code,
            "invalid_message"
        );
    }

    #[test]
    fn command_envelopes_tolerate_additive_fields() {
        let mut envelope = context_envelope(
            "submit_command",
            serde_json::json!({
                "command": {"type": "open_voting", "future_optional": true},
                "future_payload": true
            }),
        );
        let object = envelope.as_object_mut().unwrap();
        object.insert("idempotency_id".into(), Value::String("command-1".into()));
        object.insert("primary_authority_generation".into(), Value::from(0));
        object.insert("future_envelope".into(), Value::Bool(true));

        assert!(matches!(
            decode_client_request(
                &envelope.to_string(),
                PROTOCOL_VERSION,
                "session-1",
                "endpoint-1",
            ),
            Ok(ClientRequest::SubmitCommand { .. })
        ));
    }

    #[test]
    fn unknown_critical_variants_fail_safely() {
        let envelope = context_envelope("future_message", serde_json::json!({}));
        assert_eq!(
            decode_client_request(
                &envelope.to_string(),
                PROTOCOL_VERSION,
                "session-1",
                "endpoint-1",
            )
            .unwrap_err()
            .code,
            "unknown_message_type"
        );
    }

    #[test]
    fn invalid_message_identifiers_are_never_reflected() {
        let mut envelope = context_envelope("get_projection", serde_json::json!({}));
        envelope
            .as_object_mut()
            .unwrap()
            .insert("message_id".into(), Value::String(String::new()));
        envelope
            .as_object_mut()
            .unwrap()
            .insert("protocol_version".into(), Value::String("99.0".into()));

        let error = decode_client_request(
            &envelope.to_string(),
            PROTOCOL_VERSION,
            "session-1",
            "endpoint-1",
        )
        .unwrap_err();
        assert_eq!(error.code, "invalid_message");
        assert_eq!(error.correlation_id, None);
    }
}
