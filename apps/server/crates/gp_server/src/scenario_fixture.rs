use gp_scenario::schema::Scenario;

const MVP_SCENARIO_JSON: &str = include_str!("../../../scenarios/the-stolen-artifact-v2.json");

pub fn load() -> Result<Scenario, serde_json::Error> {
    serde_json::from_str(MVP_SCENARIO_JSON)
}

#[cfg(test)]
mod tests {
    use super::*;

    const ORIGINAL_SCENARIO_JSON: &str =
        include_str!("../../../scenarios/the-stolen-artifact-v1.json");

    #[test]
    fn current_immutable_fixture_parses_and_validates() {
        let scenario = load().unwrap();

        assert_eq!(scenario.id, "the-stolen-artifact");
        assert_eq!(scenario.version, 2);
        scenario.validate().unwrap();
    }

    #[test]
    fn version_two_preserves_version_one_canonical_content() {
        let original: Scenario = serde_json::from_str(ORIGINAL_SCENARIO_JSON).unwrap();
        let mut current = load().unwrap();
        assert_eq!(original.version, 1);
        current.version = 1;
        assert_eq!(current, original);
    }
}
