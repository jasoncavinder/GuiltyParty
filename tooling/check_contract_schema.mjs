#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturesDirectory = path.join(repository, "tests", "contracts", "v1");
const manifestPath = path.join(fixturesDirectory, "manifest.json");

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function assertLocalReferences(value, location = "#") {
  if (Array.isArray(value)) {
    value.forEach((child, index) =>
      assertLocalReferences(child, `${location}/${index}`),
    );
    return;
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "$ref" && (typeof child !== "string" || !child.startsWith("#/"))) {
      throw new Error(`${location}/$ref must be an internal JSON Pointer`);
    }
    assertLocalReferences(child, `${location}/${key}`);
  }
}

function describeErrors(errors) {
  return (errors ?? [])
    .slice(0, 8)
    .map((error) => {
      const location = error.instancePath || "/";
      return `${location}: ${error.message}`;
    })
    .join("; ");
}

async function main() {
  const nodeMajor = Number.parseInt(process.versions.node.split(".")[0], 10);
  if (nodeMajor < 20) {
    throw new Error(`Node.js 20 or later is required; found ${process.versions.node}`);
  }

  const manifest = await loadJson(manifestPath);
  const schemaPath = path.resolve(fixturesDirectory, manifest.schema);
  const schema = await loadJson(schemaPath);

  assertLocalReferences(schema);

  const ajv = new Ajv2020({
    allErrors: true,
    coerceTypes: false,
    removeAdditional: false,
    strict: true,
    // Envelope properties are intentionally composed through sibling allOf
    // branches. strictRequired is an Ajv lint, not a JSON Schema assertion,
    // and cannot see those sibling property declarations.
    strictRequired: false,
    useDefaults: false,
    validateFormats: false,
  });

  if (!ajv.validateSchema(schema)) {
    throw new Error(`canonical schema is invalid: ${describeErrors(ajv.errors)}`);
  }

  ajv.addSchema(schema);
  let matchedExpectations = 0;

  for (const testCase of manifest.cases) {
    const schemaReference = `${schema.$id}#/$defs/${testCase.definition}`;
    const validate = ajv.getSchema(schemaReference);
    if (validate === undefined) {
      throw new Error(`missing schema definition: ${testCase.definition}`);
    }

    const fixture = await loadJson(path.resolve(fixturesDirectory, testCase.file));
    const actualValid = validate(fixture);
    if (actualValid !== testCase.expected_valid) {
      const detail = actualValid
        ? "fixture unexpectedly matched"
        : describeErrors(validate.errors);
      throw new Error(`${testCase.file}: conformance expectation failed: ${detail}`);
    }
    matchedExpectations += 1;
  }

  console.log(
    `Standards validation OK: Draft 2020-12 meta-schema and ${matchedExpectations} fixture expectations.`,
  );
}

main().catch((error) => {
  console.error(`Standards contract validation failed: ${error.message}`);
  process.exitCode = 1;
});
