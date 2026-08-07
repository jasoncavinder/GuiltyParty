use crate::schema::pascal_case;
use crate::Language;
use serde_json::Value;
use std::fmt::Write;
use std::fs;
use std::path::Path;

#[derive(Debug)]
struct FixtureCase {
    file: String,
    definition: String,
    expected_valid: bool,
    value: Value,
}

pub(crate) fn emit(manifest_path: &Path, language: Language) -> Result<String, String> {
    let source = fs::read_to_string(manifest_path)
        .map_err(|error| format!("could not read {}: {error}", manifest_path.display()))?;
    let manifest: Value = serde_json::from_str(&source)
        .map_err(|error| format!("fixture manifest is not valid JSON: {error}"))?;
    let cases = manifest
        .get("cases")
        .and_then(Value::as_array)
        .ok_or_else(|| "fixture manifest must contain a cases array".to_string())?;
    let mut parsed = Vec::new();
    for (index, case) in cases.iter().enumerate() {
        let object = case
            .as_object()
            .ok_or_else(|| format!("fixture case {index} must be an object"))?;
        let file = required_string(object.get("file"), index, "file")?;
        let definition = required_string(object.get("definition"), index, "definition")?;
        let expected_valid = object
            .get("expected_valid")
            .and_then(Value::as_bool)
            .ok_or_else(|| format!("fixture case {index} expected_valid must be boolean"))?;
        let fixture_path = manifest_path
            .parent()
            .ok_or_else(|| "fixture manifest has no parent directory".to_string())?
            .join(&file);
        let fixture_source = fs::read_to_string(&fixture_path)
            .map_err(|error| format!("could not read {}: {error}", fixture_path.display()))?;
        let value = serde_json::from_str(&fixture_source)
            .map_err(|error| format!("{} is not valid JSON: {error}", fixture_path.display()))?;
        parsed.push(FixtureCase {
            file,
            definition,
            expected_valid,
            value,
        });
    }
    add_derived_cases(&mut parsed)?;

    match language {
        Language::Swift => Ok(emit_swift(&parsed)),
        Language::Kotlin => emit_kotlin(&parsed),
    }
}

fn add_derived_cases(cases: &mut Vec<FixtureCase>) -> Result<(), String> {
    let mut missing_nullable = fixture_value(cases, "positive/join-stage-response.json")?.clone();
    missing_nullable
        .as_object_mut()
        .ok_or_else(|| "join response fixture must be an object".to_string())?
        .remove("participant_id");
    cases.push(FixtureCase {
        file: "derived/join-response-missing-required-nullable.json".to_string(),
        definition: "JoinResponse".to_string(),
        expected_valid: false,
        value: missing_nullable,
    });

    let mut incomplete_vote = fixture_value(cases, "positive/submit-cast-vote.json")?.clone();
    incomplete_vote
        .pointer_mut("/payload/command")
        .and_then(Value::as_object_mut)
        .ok_or_else(|| "cast vote fixture must contain an object command".to_string())?
        .remove("target_character_id");
    cases.push(FixtureCase {
        file: "derived/cast-vote-missing-target.json".to_string(),
        definition: "ClientEnvelope".to_string(),
        expected_valid: false,
        value: incomplete_vote,
    });
    Ok(())
}

fn fixture_value<'a>(cases: &'a [FixtureCase], file: &str) -> Result<&'a Value, String> {
    cases
        .iter()
        .find(|case| case.file == file)
        .map(|case| &case.value)
        .ok_or_else(|| format!("required source fixture {file} is missing"))
}

fn required_string(value: Option<&Value>, index: usize, field: &str) -> Result<String, String> {
    value
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| format!("fixture case {index} {field} must be a string"))
}

fn emit_swift(cases: &[FixtureCase]) -> String {
    let mut output = String::new();
    output.push_str(
        r#"import Foundation

private struct FixtureCase {
    let file: String
    let definition: String
    let expectedValid: Bool
    let json: String
}

private let cases: [FixtureCase] = [
"#,
    );
    for case in cases {
        writeln!(
            output,
            "    .init(file: {}, definition: {}, expectedValid: {}, json: {}),",
            quoted(&case.file),
            quoted(&case.definition),
            case.expected_valid,
            quoted(
                &serde_json::to_string(&case.value)
                    .expect("fixture JSON serialization cannot fail")
            )
        )
        .unwrap();
    }
    output.push_str(
        r#"]

private func validate(_ definition: String, data: Data) throws {
    let decoder = JSONDecoder()
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    switch definition {
"#,
    );
    let mut definitions: Vec<&str> = cases.iter().map(|case| case.definition.as_str()).collect();
    definitions.sort_unstable();
    definitions.dedup();
    for definition in definitions {
        writeln!(output, "    case {}:", quoted(definition)).unwrap();
        writeln!(
            output,
            "        let decoded = try decoder.decode(GPV1{definition}.self, from: data)"
        )
        .unwrap();
        writeln!(
            output,
            "        _ = try decoder.decode(GPV1{definition}.self, from: encoder.encode(decoded))"
        )
        .unwrap();
    }
    output.push_str(
        r#"    default:
        throw GPContractError.constraint("unknown fixture definition")
    }
}

private func verifyConstruction() throws {
    let identifier = try GPV1Identifier("synthetic-character")
    _ = try GPV1CastVoteCommand(targetCharacterId: identifier, type: "cast_vote")
    let invalidRejected: Bool
    do {
        _ = try GPV1CastVoteCommand(targetCharacterId: identifier, type: "wrong")
        invalidRejected = false
    } catch {
        invalidRejected = true
    }
    guard invalidRejected else {
        throw GPContractError.constraint("invalid constructed discriminator was accepted")
    }

    let response = try GPV1JoinResponse(
        endpointId: try GPV1Identifier("synthetic-endpoint"),
        participantId: nil,
        protocolVersion: GPV1ProtocolVersion(),
        roomId: try GPV1Identifier("synthetic-room"),
        sessionId: try GPV1Identifier("synthetic-session"),
        token: try GPV1Token("synthetic-token")
    )
    let encoded = try JSONEncoder().encode(response)
    let object = try JSONSerialization.jsonObject(with: encoded) as? [String: Any]
    guard object?["participant_id"] is NSNull else {
        throw GPContractError.constraint("required nullable member was omitted on encode")
    }
}

var failures: [String] = []
for fixture in cases {
    let data = Data(fixture.json.utf8)
    let accepted: Bool
    do {
        try validate(fixture.definition, data: data)
        accepted = true
    } catch {
        accepted = false
    }
    if accepted != fixture.expectedValid {
        failures.append("\(fixture.file): expected valid=\(fixture.expectedValid), got \(accepted)")
    }
}

if !failures.isEmpty {
    failures.forEach { FileHandle.standardError.write(Data(($0 + "\n").utf8)) }
    exit(1)
}

try verifyConstruction()
print("Swift contract fixtures: \(cases.count) passed")
"#,
    );
    output
}

fn emit_kotlin(cases: &[FixtureCase]) -> Result<String, String> {
    let mut output = String::new();
    output.push_str(
        r#"package guiltyparty.contracts.v1

private data class FixtureCase(
    val file: String,
    val definition: String,
    val expectedValid: Boolean,
    val value: GPJsonValue,
)

private val cases = listOf(
"#,
    );
    for case in cases {
        writeln!(output, "    FixtureCase(").unwrap();
        writeln!(output, "        file = {},", quoted_kotlin(&case.file)).unwrap();
        writeln!(
            output,
            "        definition = {},",
            quoted_kotlin(&case.definition)
        )
        .unwrap();
        writeln!(output, "        expectedValid = {},", case.expected_valid).unwrap();
        writeln!(output, "        value = {},", kotlin_value(&case.value)?).unwrap();
        output.push_str("    ),\n");
    }
    output.push_str(")\n\n");
    output.push_str("private fun validate(definition: String, value: GPJsonValue) {\n");
    output.push_str("    when (definition) {\n");
    let mut definitions: Vec<&str> = cases.iter().map(|case| case.definition.as_str()).collect();
    definitions.sort_unstable();
    definitions.dedup();
    for definition in definitions {
        let type_name = format!("GPV1{}", pascal_case(definition));
        writeln!(
            output,
            "        {} -> {}.from(value).let {{ decoded -> {}.from(decoded.toJson()) }}",
            quoted_kotlin(definition),
            type_name,
            type_name
        )
        .unwrap();
    }
    output.push_str("        else -> throw GPContractException(\"unknown fixture definition\")\n");
    output.push_str("    }\n");
    output.push_str("}\n\n");
    output.push_str(
        r#"private fun verifyConstruction() {
    val identifier = GPV1Identifier("synthetic-character")
    GPV1CastVoteCommand(targetCharacterId = identifier, type = "cast_vote")
    try {
        GPV1CastVoteCommand(targetCharacterId = identifier, type = "wrong")
        throw IllegalStateException("invalid constructed discriminator was accepted")
    } catch (_: GPContractException) {
        // Expected.
    }

    val response = GPV1JoinResponse(
        endpointId = GPV1Identifier("synthetic-endpoint"),
        participantId = null,
        protocolVersion = GPV1ProtocolVersion("1.0"),
        roomId = GPV1Identifier("synthetic-room"),
        sessionId = GPV1Identifier("synthetic-session"),
        token = GPV1Token("synthetic-token"),
    )
    val member = (response.toJson() as GPJsonValue.ObjectValue).members["participant_id"]
    if (member != GPJsonValue.NullValue) {
        throw IllegalStateException("required nullable member was omitted on encode")
    }
}

fun main() {
    val failures = mutableListOf<String>()
    cases.forEach { fixture ->
        val accepted = try {
            validate(fixture.definition, fixture.value)
            true
        } catch (_: GPContractException) {
            false
        }
        if (accepted != fixture.expectedValid) {
            failures += "${fixture.file}: expected valid=${fixture.expectedValid}, got $accepted"
        }
    }
    if (failures.isNotEmpty()) {
        failures.forEach(System.err::println)
        throw IllegalStateException("Kotlin contract fixture failures")
    }
    verifyConstruction()
    println("Kotlin contract fixtures: ${cases.size} passed")
}
"#,
    );
    Ok(output)
}

fn kotlin_value(value: &Value) -> Result<String, String> {
    match value {
        Value::Null => Ok("GPJsonValue.NullValue".to_string()),
        Value::Bool(value) => Ok(format!("GPJsonValue.BooleanValue({value})")),
        Value::Number(value) => value
            .as_i64()
            .map(|value| format!("GPJsonValue.IntegerValue({value}L)"))
            .ok_or_else(|| "fixture contains a non-integer or out-of-range number".to_string()),
        Value::String(value) => Ok(format!("GPJsonValue.StringValue({})", quoted_kotlin(value))),
        Value::Array(values) => {
            let values = values
                .iter()
                .map(kotlin_value)
                .collect::<Result<Vec<_>, _>>()?;
            Ok(if values.is_empty() {
                "GPJsonValue.ArrayValue(emptyList())".to_string()
            } else {
                format!("GPJsonValue.ArrayValue(listOf({}))", values.join(", "))
            })
        }
        Value::Object(values) => {
            let entries = values
                .iter()
                .map(|(name, value)| {
                    Ok(format!(
                        "{} to {}",
                        quoted_kotlin(name),
                        kotlin_value(value)?
                    ))
                })
                .collect::<Result<Vec<_>, String>>()?;
            Ok(if entries.is_empty() {
                "GPJsonValue.ObjectValue(emptyMap())".to_string()
            } else {
                format!("GPJsonValue.ObjectValue(mapOf({}))", entries.join(", "))
            })
        }
    }
}

fn quoted(value: &str) -> String {
    serde_json::to_string(value).expect("serializing a string cannot fail")
}

fn quoted_kotlin(value: &str) -> String {
    quoted(value).replace('$', "\\$")
}
