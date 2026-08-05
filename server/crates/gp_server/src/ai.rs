use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<Message>,
    temperature: f32,
}


#[derive(Debug, Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: Message,
}

#[async_trait::async_trait]
pub trait AiAdapter: Send + Sync {
    async fn request_suggestion(&self, projection_json: &str) -> Result<String, String>;
}

pub struct LmStudioAdapter {
    client: Client,
    endpoint: String,
    model: String,
}

impl LmStudioAdapter {
    pub fn new(endpoint: String, model: String) -> Self {
        Self {
            client: Client::new(),
            endpoint,
            model,
        }
    }
}

#[async_trait::async_trait]
impl AiAdapter for LmStudioAdapter {
    async fn request_suggestion(&self, projection_json: &str) -> Result<String, String> {
        let req_body = OpenAIRequest {
            model: self.model.clone(),
            messages: vec![
                Message {
                    role: "system".into(),
                    content: "You are the AI Stage Manager for Guilty Party. Analyze the current game state projection and suggest a brief narrative pacing action for the host. Your response should be a short paragraph.".into(),
                },
                Message {
                    role: "user".into(),
                    content: projection_json.into(),
                },
            ],
            temperature: 0.7,
        };

        let res = self.client.post(&self.endpoint)
            .json(&req_body)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let ai_res: OpenAIResponse = res.json().await.map_err(|e| e.to_string())?;
        
        ai_res.choices.into_iter().next()
            .map(|c| c.message.content)
            .ok_or_else(|| "No choices returned from AI".to_string())
    }
}

pub struct MockAiAdapter;

#[async_trait::async_trait]
impl AiAdapter for MockAiAdapter {
    async fn request_suggestion(&self, _projection_json: &str) -> Result<String, String> {
        Ok("Mock suggestion: Have the host reveal the next clue.".to_string())
    }
}
