use std::collections::BTreeMap;

use uuid::Uuid;

use crate::projection::ProjectionAudience;

#[derive(Debug)]
pub struct AuthorityRegistry {
    authorities: BTreeMap<String, ProjectionAudience>,
}

impl AuthorityRegistry {
    pub fn new(host_token: String) -> Result<Self, String> {
        if host_token.len() < 24 {
            return Err("GP_HOST_TOKEN must contain at least 24 characters".into());
        }
        let mut authorities = BTreeMap::new();
        authorities.insert(host_token, ProjectionAudience::Host);
        Ok(Self { authorities })
    }

    pub fn issue_stage(&mut self) -> String {
        self.issue(ProjectionAudience::Stage)
    }

    pub fn issue_participant(&mut self, participant_id: String) -> String {
        self.issue(ProjectionAudience::Participant(participant_id))
    }

    pub fn authenticate(&self, token: &str) -> Option<ProjectionAudience> {
        self.authorities.get(token).cloned()
    }

    fn issue(&mut self, audience: ProjectionAudience) -> String {
        let token = Uuid::new_v4().simple().to_string();
        self.authorities.insert(token.clone(), audience);
        token
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unknown_tokens_have_no_authority() {
        let registry = AuthorityRegistry::new("a-secure-host-token-for-testing".into()).unwrap();
        assert_eq!(registry.authenticate("unknown"), None);
    }

    #[test]
    fn issued_participant_token_cannot_become_host() {
        let mut registry =
            AuthorityRegistry::new("a-secure-host-token-for-testing".into()).unwrap();
        let token = registry.issue_participant("p1".into());
        assert_eq!(
            registry.authenticate(&token),
            Some(ProjectionAudience::Participant("p1".into()))
        );
    }
}
