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
- `../tests/contracts/v1/` contains synthetic conformance and privacy fixtures.

Protocol `1.0` is the target contract. The current browser prototype still
uses the earlier unversioned routes and unenveloped WebSocket messages. No
client should claim v1 compatibility until the server/client migration and the
contract checks described by the fixture manifest are complete.

Unknown optional object members are intentionally permitted within protocol
major 1. A receiver must still reject unknown message discriminators and
security-critical enum values unless they were explicitly negotiated.

Identifiers for sessions, endpoints, rooms, and participants are deliberately
separate. Endpoint platform and capability fields are coarse claims for server
validation, never hardware identifiers or grants of authority.

The approved standards validator and its constrained development-only scope are
recorded in the
[third-party component inventory](../docs/legal/third-party-components.md#ajv).
`make check-contracts` runs both the first-party structural/privacy checks and
Ajv's full Draft 2020-12 meta-schema and fixture validation.
