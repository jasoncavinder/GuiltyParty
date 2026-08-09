use gp_scenario::schema::Scenario;

const MVP_SCENARIO_JSON: &str = include_str!("../../../scenarios/the-stolen-artifact-v1.json");

pub fn load() -> Result<Scenario, serde_json::Error> {
    serde_json::from_str(MVP_SCENARIO_JSON)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn immutable_fixture_parses_and_validates() {
        let scenario = load().unwrap();

        assert_eq!(scenario.id, "the-stolen-artifact");
        assert_eq!(scenario.version, 1);
        scenario.validate().unwrap();
    }
}
