use std::{net::IpAddr, time::Duration};

use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};

const MAX_RESPONSE_BYTES: usize = 64 * 1024;
const MAX_SUGGESTION_BYTES: usize = 2_000;

#[derive(Debug, Serialize)]
struct OpenAiRequest<'a> {
    model: &'a str,
    messages: Vec<Message<'a>>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct Message<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Debug, Deserialize)]
struct OpenAiResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: OwnedMessage,
}

#[derive(Debug, Deserialize)]
struct OwnedMessage {
    content: String,
}

#[async_trait::async_trait]
pub trait AiAdapter: Send + Sync {
    async fn request_suggestion(&self, projection_json: &str) -> Result<String, String>;
}

pub struct OpenAiCompatibleAdapter {
    client: Client,
    endpoint: Url,
    model: String,
}

impl OpenAiCompatibleAdapter {
    pub fn new(endpoint: String, model: String) -> Result<Self, String> {
        let endpoint =
            Url::parse(&endpoint).map_err(|error| format!("invalid AI endpoint: {error}"))?;
        validate_local_endpoint(&endpoint)?;
        if model.trim().is_empty() {
            return Err("GP_AI_MODEL must not be empty".into());
        }
        let client = Client::builder()
            .connect_timeout(Duration::from_secs(2))
            .timeout(Duration::from_secs(15))
            .build()
            .map_err(|error| format!("could not create AI HTTP client: {error}"))?;
        Ok(Self {
            client,
            endpoint,
            model,
        })
    }
}

#[async_trait::async_trait]
impl AiAdapter for OpenAiCompatibleAdapter {
    async fn request_suggestion(&self, projection_json: &str) -> Result<String, String> {
        let request = OpenAiRequest {
            model: &self.model,
            messages: vec![
                Message {
                    role: "system",
                    content: "You are the advisory AI Stage Manager for Guilty Party. Suggest one brief pacing action for the human host using only the supplied public, minimized state. Do not invent or change scenario truth.",
                },
                Message {
                    role: "user",
                    content: projection_json,
                },
            ],
            temperature: 0.4,
            max_tokens: 180,
        };

        let mut response = self
            .client
            .post(self.endpoint.clone())
            .json(&request)
            .send()
            .await
            .map_err(|error| format!("AI request failed: {error}"))?
            .error_for_status()
            .map_err(|error| format!("AI endpoint rejected the request: {error}"))?;

        if response
            .content_length()
            .is_some_and(|length| length > MAX_RESPONSE_BYTES as u64)
        {
            return Err("AI response exceeded the 64 KiB limit".into());
        }

        let mut body = Vec::new();
        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|error| format!("could not read AI response: {error}"))?
        {
            if body.len() + chunk.len() > MAX_RESPONSE_BYTES {
                return Err("AI response exceeded the 64 KiB limit".into());
            }
            body.extend_from_slice(&chunk);
        }

        let response: OpenAiResponse = serde_json::from_slice(&body)
            .map_err(|error| format!("AI response was not valid JSON: {error}"))?;
        let suggestion = response
            .choices
            .into_iter()
            .next()
            .map(|choice| choice.message.content)
            .ok_or_else(|| "AI response contained no choices".to_string())?;
        validate_suggestion(suggestion)
    }
}

pub struct DisabledAiAdapter;

#[async_trait::async_trait]
impl AiAdapter for DisabledAiAdapter {
    async fn request_suggestion(&self, _projection_json: &str) -> Result<String, String> {
        Err("local AI is disabled; set GP_AI_ENDPOINT and GP_AI_MODEL to enable it".into())
    }
}

fn validate_local_endpoint(endpoint: &Url) -> Result<(), String> {
    if endpoint.scheme() != "http" {
        return Err("the prototype AI endpoint must use HTTP on the trusted local network".into());
    }
    let host = endpoint
        .host_str()
        .ok_or_else(|| "AI endpoint has no host".to_string())?;
    if host.eq_ignore_ascii_case("localhost") {
        return Ok(());
    }
    let address: IpAddr = host
        .parse()
        .map_err(|_| "AI endpoint must use localhost or an explicit private LAN IP address")?;
    let is_local = match address {
        IpAddr::V4(address) => address.is_private() || address.is_loopback(),
        IpAddr::V6(address) => address.is_loopback() || address.is_unique_local(),
    };
    is_local
        .then_some(())
        .ok_or_else(|| "remote/public AI endpoints are excluded from this prototype".into())
}

fn validate_suggestion(suggestion: String) -> Result<String, String> {
    let suggestion = suggestion.trim();
    if suggestion.is_empty() {
        return Err("AI returned an empty suggestion".into());
    }
    if suggestion.len() > MAX_SUGGESTION_BYTES {
        return Err("AI suggestion exceeded the 2,000-byte limit".into());
    }
    if suggestion
        .chars()
        .any(|character| character.is_control() && !character.is_whitespace())
    {
        return Err("AI suggestion contained unsupported control characters".into());
    }
    Ok(suggestion.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_public_ai_endpoint() {
        assert!(OpenAiCompatibleAdapter::new(
            "https://example.com/v1/chat/completions".into(),
            "model".into()
        )
        .is_err());
    }

    #[test]
    fn accepts_loopback_and_private_lan_endpoints() {
        for endpoint in [
            "http://127.0.0.1:1234/v1/chat/completions",
            "http://192.168.1.20:11434/v1/chat/completions",
            "http://localhost:1234/v1/chat/completions",
        ] {
            assert!(OpenAiCompatibleAdapter::new(endpoint.into(), "model".into()).is_ok());
        }
    }

    #[test]
    fn validates_ai_output_bounds() {
        assert!(validate_suggestion("  Keep the pace steady.  ".into()).is_ok());
        assert!(validate_suggestion("".into()).is_err());
        assert!(validate_suggestion("x".repeat(MAX_SUGGESTION_BYTES + 1)).is_err());
    }
}
