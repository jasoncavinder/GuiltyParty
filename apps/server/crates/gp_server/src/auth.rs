use std::collections::BTreeMap;

use uuid::Uuid;

use crate::projection::ProjectionAudience;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AuthorityContext {
    pub audience: ProjectionAudience,
    pub session_id: String,
    pub endpoint_id: String,
    pub primary_authority_generation: u64,
}

#[derive(Debug)]
pub struct AuthorityRegistry {
    authorities: BTreeMap<String, AuthorityContext>,
}

impl AuthorityRegistry {
    pub fn new(
        host_token: String,
        session_id: String,
        host_endpoint_id: String,
    ) -> Result<Self, String> {
        if host_token.len() < 24 {
            return Err("GP_HOST_TOKEN must contain at least 24 characters".into());
        }
        let mut authorities = BTreeMap::new();
        authorities.insert(
            host_token,
            AuthorityContext {
                audience: ProjectionAudience::Host,
                session_id,
                endpoint_id: host_endpoint_id,
                primary_authority_generation: 0,
            },
        );
        Ok(Self { authorities })
    }

    pub fn issue_stage(&mut self, session_id: String, endpoint_id: String) -> String {
        self.issue(AuthorityContext {
            audience: ProjectionAudience::Stage,
            session_id,
            endpoint_id,
            primary_authority_generation: 0,
        })
    }

    pub fn issue_participant(
        &mut self,
        participant_id: String,
        session_id: String,
        endpoint_id: String,
    ) -> String {
        self.issue(AuthorityContext {
            audience: ProjectionAudience::Participant(participant_id),
            session_id,
            endpoint_id,
            primary_authority_generation: 0,
        })
    }

    pub fn authenticate(&self, token: &str) -> Option<AuthorityContext> {
        self.authorities.get(token).cloned()
    }

    fn issue(&mut self, context: AuthorityContext) -> String {
        let token = Uuid::new_v4().simple().to_string();
        self.authorities.insert(token.clone(), context);
        token
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unknown_tokens_have_no_authority() {
        let registry = AuthorityRegistry::new(
            "a-secure-host-token-for-testing".into(),
            "session-1".into(),
            "host-endpoint".into(),
        )
        .unwrap();
        assert_eq!(registry.authenticate("unknown"), None);
    }

    #[test]
    fn issued_participant_token_cannot_become_host() {
        let mut registry = AuthorityRegistry::new(
            "a-secure-host-token-for-testing".into(),
            "session-1".into(),
            "host-endpoint".into(),
        )
        .unwrap();
        let token = registry.issue_participant(
            "p1".into(),
            "session-1".into(),
            "participant-endpoint".into(),
        );
        assert_eq!(
            registry.authenticate(&token),
            Some(AuthorityContext {
                audience: ProjectionAudience::Participant("p1".into()),
                session_id: "session-1".into(),
                endpoint_id: "participant-endpoint".into(),
                primary_authority_generation: 0,
            })
        );
    }
}
