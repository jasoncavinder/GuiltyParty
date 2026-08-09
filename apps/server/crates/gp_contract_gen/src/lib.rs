mod harness;
mod kotlin;
mod schema;
mod swift;

use schema::Contract;
use std::fs;
use std::path::Path;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Language {
    Swift,
    Kotlin,
}

pub fn generate(schema_path: &Path, language: Language) -> Result<String, String> {
    let source = fs::read_to_string(schema_path)
        .map_err(|error| format!("could not read {}: {error}", schema_path.display()))?;
    let contract = Contract::parse(&source)?;
    match language {
        Language::Swift => swift::emit(&contract),
        Language::Kotlin => kotlin::emit(&contract),
    }
}

pub fn generate_harness(manifest_path: &Path, language: Language) -> Result<String, String> {
    harness::emit(manifest_path, language)
}
