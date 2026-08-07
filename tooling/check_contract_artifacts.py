#!/usr/bin/env python3
"""Dependency-free structural and privacy checks for committed contracts."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any


REPOSITORY = Path(__file__).resolve().parent.parent
CONTRACTS = REPOSITORY / "contracts"
FIXTURES = REPOSITORY / "tests" / "contracts" / "v1"
MANIFEST = FIXTURES / "manifest.json"


def fail(message: str) -> None:
    raise ValueError(message)


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"{path.relative_to(REPOSITORY)}: {error}")


def decode_pointer_token(token: str) -> str:
    return token.replace("~1", "/").replace("~0", "~")


def resolve_pointer(document: Any, fragment: str, source: Path) -> Any:
    if fragment in ("", "#"):
        return document
    if not fragment.startswith("#/"):
        fail(f"{source.relative_to(REPOSITORY)}: unsupported JSON pointer {fragment!r}")
    current = document
    for raw_token in fragment[2:].split("/"):
        token = decode_pointer_token(raw_token)
        try:
            current = current[int(token)] if isinstance(current, list) else current[token]
        except (KeyError, IndexError, ValueError, TypeError):
            fail(
                f"{source.relative_to(REPOSITORY)}: unresolved JSON pointer {fragment!r}"
            )
    return current


def walk(value: Any, path: str = ""):
    yield path, value
    if isinstance(value, dict):
        for key, child in value.items():
            escaped = key.replace("~", "~0").replace("/", "~1")
            yield from walk(child, f"{path}/{escaped}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk(child, f"{path}/{index}")


def check_references(path: Path, document: Any, cache: dict[Path, Any]) -> int:
    checked = 0
    for _, value in walk(document):
        if not isinstance(value, dict) or "$ref" not in value:
            continue
        reference = value["$ref"]
        if not isinstance(reference, str):
            fail(f"{path.relative_to(REPOSITORY)}: $ref must be a string")
        location, separator, fragment = reference.partition("#")
        target_path = (path.parent / location).resolve() if location else path.resolve()
        try:
            target_path.relative_to(REPOSITORY.resolve())
        except ValueError:
            fail(f"{path.relative_to(REPOSITORY)}: $ref escapes the repository")
        if target_path not in cache:
            if not target_path.is_file():
                fail(
                    f"{path.relative_to(REPOSITORY)}: missing $ref target "
                    f"{target_path}"
                )
            cache[target_path] = load_json(target_path)
        resolve_pointer(cache[target_path], f"#{fragment}" if separator else "", path)
        checked += 1
    return checked


def member_parent_paths(document: Any, member_name: str) -> list[str]:
    parents: list[str] = []
    for path, value in walk(document):
        if isinstance(value, dict) and member_name in value:
            parents.append(path or "/")
    return parents


def type_matches(instance: Any, expected: str) -> bool:
    return {
        "null": instance is None,
        "object": isinstance(instance, dict),
        "array": isinstance(instance, list),
        "string": isinstance(instance, str),
        "integer": isinstance(instance, int) and not isinstance(instance, bool),
        "number": isinstance(instance, (int, float)) and not isinstance(instance, bool),
        "boolean": isinstance(instance, bool),
    }.get(expected, False)


def evaluate_fixture(
    instance: Any, schema: Any, root_schema: dict[str, Any], path: str = "/"
) -> list[str]:
    """Evaluate only the JSON Schema keywords intentionally used by v1 fixtures."""
    if isinstance(schema, bool):
        return [] if schema else [f"{path}: rejected by false schema"]
    if not isinstance(schema, dict):
        return [f"{path}: schema node is not an object"]

    errors: list[str] = []
    if "$ref" in schema:
        reference = schema["$ref"]
        if not isinstance(reference, str) or not reference.startswith("#/"):
            return [f"{path}: fixture evaluator supports internal $ref values only"]
        target = resolve_pointer(root_schema, reference, Path("control-plane.schema.json"))
        errors.extend(evaluate_fixture(instance, target, root_schema, path))

    if "allOf" in schema:
        for child in schema["allOf"]:
            errors.extend(evaluate_fixture(instance, child, root_schema, path))

    if "oneOf" in schema:
        matches = sum(
            not evaluate_fixture(instance, child, root_schema, path)
            for child in schema["oneOf"]
        )
        if matches != 1:
            errors.append(f"{path}: expected exactly one oneOf match; found {matches}")

    expected_types = schema.get("type")
    if expected_types is not None:
        if isinstance(expected_types, str):
            expected_types = [expected_types]
        if not any(type_matches(instance, expected) for expected in expected_types):
            errors.append(f"{path}: value does not match type {expected_types}")
            return errors

    if "const" in schema and instance != schema["const"]:
        errors.append(f"{path}: value does not match const")
    if "enum" in schema and instance not in schema["enum"]:
        errors.append(f"{path}: value is not in enum")

    if isinstance(instance, dict):
        for name in schema.get("required", []):
            if name not in instance:
                errors.append(f"{path}: missing required member {name!r}")
        for name, child_schema in schema.get("properties", {}).items():
            if name in instance:
                child_path = f"/{name}" if path == "/" else f"{path}/{name}"
                errors.extend(
                    evaluate_fixture(instance[name], child_schema, root_schema, child_path)
                )

    if isinstance(instance, list):
        if len(instance) < schema.get("minItems", 0):
            errors.append(f"{path}: array is shorter than minItems")
        if "maxItems" in schema and len(instance) > schema["maxItems"]:
            errors.append(f"{path}: array is longer than maxItems")
        if schema.get("uniqueItems"):
            serialized = [
                json.dumps(item, sort_keys=True, separators=(",", ":"))
                for item in instance
            ]
            if len(serialized) != len(set(serialized)):
                errors.append(f"{path}: array items are not unique")
        if "items" in schema:
            for index, item in enumerate(instance):
                child_path = f"/{index}" if path == "/" else f"{path}/{index}"
                errors.extend(
                    evaluate_fixture(item, schema["items"], root_schema, child_path)
                )

    if isinstance(instance, str):
        if len(instance) < schema.get("minLength", 0):
            errors.append(f"{path}: string is shorter than minLength")
        if "maxLength" in schema and len(instance) > schema["maxLength"]:
            errors.append(f"{path}: string is longer than maxLength")
        if "pattern" in schema and re.search(schema["pattern"], instance) is None:
            errors.append(f"{path}: string does not match pattern")

    if isinstance(instance, (int, float)) and not isinstance(instance, bool):
        if "minimum" in schema and instance < schema["minimum"]:
            errors.append(f"{path}: number is below minimum")
        if "maximum" in schema and instance > schema["maximum"]:
            errors.append(f"{path}: number is above maximum")

    return errors


def check_privacy(manifest: dict[str, Any]) -> int:
    assertions = 0
    for rule in manifest.get("privacy_assertions", []):
        fixture_path = FIXTURES / rule["file"]
        document = load_json(fixture_path)
        all_values = [value for _, value in walk(document)]

        for member_name in rule.get("forbidden_member_names", []):
            found = member_parent_paths(document, member_name)
            if found:
                fail(
                    f"{fixture_path.relative_to(REPOSITORY)}: forbidden member "
                    f"{member_name!r} at {found}"
                )
            assertions += 1

        for forbidden in rule.get("forbidden_values", []):
            if forbidden in all_values:
                fail(
                    f"{fixture_path.relative_to(REPOSITORY)}: forbidden synthetic "
                    f"canary {forbidden!r} is present"
                )
            assertions += 1

        for member_name, allowed_parents in rule.get("member_scope", {}).items():
            found = member_parent_paths(document, member_name)
            if sorted(found) != sorted(allowed_parents):
                fail(
                    f"{fixture_path.relative_to(REPOSITORY)}: {member_name!r} "
                    f"appears at {found}, expected {allowed_parents}"
                )
            assertions += 1
    return assertions


def main() -> int:
    json_paths = sorted(CONTRACTS.rglob("*.json")) + sorted(FIXTURES.rglob("*.json"))
    documents = {path.resolve(): load_json(path) for path in json_paths}

    schema_path = CONTRACTS / "control-plane" / "v1" / "control-plane.schema.json"
    schema = documents[schema_path.resolve()]
    if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema":
        fail("canonical control-plane schema must declare JSON Schema Draft 2020-12")
    definitions = schema.get("$defs")
    if not isinstance(definitions, dict) or not definitions:
        fail("canonical control-plane schema has no $defs")

    manifest = documents[MANIFEST.resolve()]
    declared_schema = (MANIFEST.parent / manifest.get("schema", "")).resolve()
    if declared_schema != schema_path.resolve():
        fail("fixture manifest must reference the canonical v1 schema")
    listed_files: set[Path] = set()
    for case in manifest.get("cases", []):
        fixture_path = (FIXTURES / case["file"]).resolve()
        if fixture_path in listed_files:
            fail(f"duplicate fixture manifest entry: {case['file']}")
        if fixture_path not in documents:
            fail(f"fixture manifest references missing file: {case['file']}")
        if case.get("definition") not in definitions:
            fail(f"fixture manifest references unknown definition: {case.get('definition')}")
        if not isinstance(case.get("expected_valid"), bool):
            fail(f"fixture manifest has no boolean expected_valid: {case['file']}")
        fixture_errors = evaluate_fixture(
            documents[fixture_path], definitions[case["definition"]], schema
        )
        actual_valid = not fixture_errors
        if actual_valid != case["expected_valid"]:
            detail = "; ".join(fixture_errors[:5]) or "fixture unexpectedly matched"
            fail(f"{case['file']}: conformance expectation failed: {detail}")
        listed_files.add(fixture_path)

    fixture_files = {
        path.resolve()
        for path in FIXTURES.rglob("*.json")
        if path.resolve() != MANIFEST.resolve()
    }
    if listed_files != fixture_files:
        missing = sorted(str(path.relative_to(FIXTURES)) for path in fixture_files - listed_files)
        extra = sorted(str(path.relative_to(FIXTURES)) for path in listed_files - fixture_files)
        fail(f"fixture manifest mismatch; unlisted={missing}, missing={extra}")

    references = sum(
        check_references(path, document, documents)
        for path, document in list(documents.items())
    )
    privacy_assertions = check_privacy(manifest)
    print(
        f"Contract artifacts OK: {len(json_paths)} JSON files, "
        f"{references} references, {len(listed_files)} fixtures, "
        f"{privacy_assertions} privacy assertions."
    )
    print(
        "The dependency-free fixture evaluator covers the v1 keyword subset; "
        "Ajv independently checks full Draft 2020-12 conformance."
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ValueError as error:
        print(f"Contract artifact check failed: {error}", file=sys.stderr)
        sys.exit(1)
