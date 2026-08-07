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
the privacy assertions. It is not a general Draft 2020-12 implementation. A
standards validator and native model generator still require dependency intake.
The server's existing Rust privacy and deterministic replay tests remain
mandatory and independent of these fixtures.
