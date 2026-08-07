# Control-Plane v1 Fixtures

All fixture content is synthetic. `manifest.json` maps each file to its
canonical schema and expected result.

- `positive/` contains representative valid messages, null/absence behavior,
  Unicode, and an additive unknown-field compatibility case.
- `negative/` contains inputs that must fail schema or protocol validation.
- `privacy/` contains recipient projections plus explicit forbidden-field and
  synthetic-canary assertions.

The dependency-free repository checker evaluates the JSON Schema keyword subset
used by these fixtures, verifies references and manifest coverage, and enforces
the privacy assertions. Ajv independently validates the canonical schema and
fixture expectations against Draft 2020-12. A native model generator still
requires separate dependency intake. The server's Rust protocol, privacy,
authorization, idempotency, and deterministic replay tests remain mandatory and
independent of these fixtures.
