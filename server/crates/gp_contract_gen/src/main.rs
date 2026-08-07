use gp_contract_gen::{generate, generate_harness, Language};
use std::env;
use std::fs;
use std::path::PathBuf;

fn usage() -> ! {
    eprintln!(
        "usage:\n  gp_contract_gen generate <schema.json> <swift|kotlin> <output>\n  \
         gp_contract_gen harness <manifest.json> <swift|kotlin> <output>"
    );
    std::process::exit(2);
}

fn parse_language(value: &str) -> Language {
    match value {
        "swift" => Language::Swift,
        "kotlin" => Language::Kotlin,
        _ => usage(),
    }
}

fn main() {
    let arguments: Vec<String> = env::args().collect();
    if arguments.len() != 5 {
        usage();
    }

    let operation = &arguments[1];
    let input = PathBuf::from(&arguments[2]);
    let language = parse_language(&arguments[3]);
    let output = PathBuf::from(&arguments[4]);

    let result = match operation.as_str() {
        "generate" => generate(&input, language),
        "harness" => generate_harness(&input, language),
        _ => usage(),
    };

    match result.and_then(|content| {
        fs::write(&output, content)
            .map_err(|error| format!("could not write {}: {error}", output.display()))
    }) {
        Ok(()) => {}
        Err(error) => {
            eprintln!("contract generation failed: {error}");
            std::process::exit(1);
        }
    }
}
