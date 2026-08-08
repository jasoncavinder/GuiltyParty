# Control-Plane Contracts

This directory contains the language-neutral control-plane contract artifacts
defined by [ADR 0005](../docs/adr/0005-versioned-control-plane-contract.md).

- `control-plane/v1/control-plane.schema.json` is the canonical JSON Schema
  Draft 2020-12 definition for shared payloads and WebSocket envelopes.
- `http/v1/openapi.json` is authoritative for HTTP paths, methods, statuses,
  and content types. It references the canonical schemas instead of copying
  them.
- `realtime/v1/README.md` records WebSocket direction, negotiation, and
  sequencing rules that JSON Schema cannot express by itself.
- `generated/control-plane/v1/` contains the committed Swift and Kotlin
  transport models derived from the canonical schema.
- `../tests/contracts/v1/` contains synthetic conformance and privacy fixtures.

Protocol `1.0` is implemented by the Rust prototype server, the remote Worker,
the browser Host and fallback Companion, the packaged Stage, and the native
iOS/iPadOS Companion. Committed native-client generation and fixture checks
prove the transport-model boundary; live release claims still require the
applicable simulator and physical-device evidence.

Native participant admission returns a device-bound rotating resume credential
in addition to the memory-only access bearer. `POST /api/v1/resume` binds that
credential to the existing session, participant, endpoint, authority
generation, last accepted sequence, and unresolved idempotency identifiers.
Resume never accepts client state as canonical and never substitutes raw
journal events for a fresh authorized projection.

Unknown optional object members are intentionally permitted within protocol
major 1. A receiver must still reject unknown message discriminators and
security-critical enum values unless they were explicitly negotiated.

Identifiers for sessions, endpoints, rooms, and participants are deliberately
separate. Endpoint platform and capability fields are coarse claims for server
validation, never hardware identifiers or grants of authority.

Every control-plane integer declares an explicit signed 64-bit minimum and
maximum. Cross-platform counters use the portable JSON integer ceiling
`9007199254740991` (`2^53 - 1`) so Rust, browser JavaScript, Swift, and Kotlin
can preserve the same exact value. Producers must enforce the canonical schema
bound even when their language offers a wider unsigned integer type.

The approved standards validator and its constrained development-only scope are
recorded in the
[third-party component inventory](../docs/legal/third-party-components.md#ajv).
`make check-contracts` runs both the first-party structural/privacy checks and
Ajv's full Draft 2020-12 meta-schema and fixture validation.
`make generate-mobile-contracts` regenerates both committed native outputs;
`make check-mobile-contracts` proves deterministic generation, native
compilation, fixture compatibility, and zero worktree drift.
