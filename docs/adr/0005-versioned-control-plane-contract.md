# ADR 0005: Versioned Control-Plane Contract

## Status

Accepted

## Date

2026-08-05

---

# Context

Guilty Party uses HTTP and WebSockets across independently released native
Companions, browser clients, the Host Console, Stages, and local or remote
servers. App-store rollout delays and isolated-LAN deployments make an implicit
"server and every client update together" assumption unsafe. The contract must
evolve without confusing protocol compatibility with app builds, scenario
versions, journal formats, or content versions.

ADR 0004 selected HTTP and WebSockets for the MVP and deferred formal contract
descriptions until the messages stabilized. This ADR establishes the target
contract and evolution rules without requiring the local MVP to implement
production account or transport behavior.

---

# Decision

## Version Axes

The initial control-plane protocol version is `1.0`. Protocol version, client
application version, server build version, scenario version, journal format
version, and content version are independent values and must not substitute for
one another.

HTTP routes include the protocol major under `/api/v1/...`. WebSocket clients
and servers negotiate a project-scoped, major-versioned subprotocol such as
`guiltyparty.control.v1` through `Sec-WebSocket-Protocol`. Failure to agree on a
supported major fails the connection with an actionable compatibility error.

An unversioned, non-private compatibility endpoint advertises the supported
protocol majors, the preferred version, and required-upgrade information. It
does not expose session, participant, endpoint, scenario, or credential data.

## Canonical Contract Artifacts

JSON Schema Draft 2020-12 is the canonical schema dialect for control-plane
payloads. HTTP operations are described by OpenAPI 3.1-compatible documents
using those schemas. WebSocket channels, directions, and messages use the same
schemas and may additionally be described with AsyncAPI; AsyncAPI is
documentation and tooling metadata, not a runtime dependency.

Schema files, representative positive and negative fixtures, and compatibility
tests are committed as the contract source of truth before client models are
generated or maintained manually. The model-generation choice remains a
separate decision.

## WebSocket Envelope

Every application message uses a common typed envelope containing:

- a stable message type
- a unique message identifier
- a correlation identifier when responding to a request
- session and endpoint context where applicable
- a server sequence for ordered projections or events
- an idempotency identifier for commands
- a schema-validated payload

The envelope contains no authorization secrets or private data not required by
the recipient. The server remains responsible for recipient-specific
projections and authorization regardless of schema validity.

## Compatibility and Evolution

Within a protocol major:

- new fields are optional and have defined absence behavior
- clients tolerate unknown optional fields
- new message types or behavior are sent only after feature negotiation
- unknown commands are rejected with a structured error
- an unexpected unknown security-critical message causes controlled resync or
  incompatibility handling rather than silent processing
- existing field meaning, authorization, secrecy, ordering, and determinism do
  not change

Additive features increment the minor version. Documentation-only corrections
increment the patch version. Removing a field, making previously valid input
invalid, changing existing meaning, or changing authorization or secrecy
semantics requires a new protocol major.

Servers advertise feature support and never send an unnegotiated feature.
Deprecation is documented before removal. A native client version that remains
supported must retain a compatible server protocol during app-store rollout; a
major version is not removed silently or solely because a replacement client
has been submitted.

## Errors

HTTP errors use the `application/problem+json` representation defined by RFC
9457, with stable project error codes and correlation identifiers. WebSocket
errors use the same safe codes and semantics inside the common envelope.
Human-readable text is not an application control value. Errors do not expose
credentials, private projections, authorization policy details, or unnecessary
personal information.

## Verification

Contract validation includes:

- schema checks for commands, results, projections, and errors
- positive and negative fixtures shared across implementations
- compatibility tests for additive fields and negotiated features
- rejection tests for unknown commands, stale authority, and invalid envelopes
- privacy tests proving each endpoint receives only its authorized projection
- deterministic tests proving transport representation does not change
  canonical scenario truth

---

# Consequences

## Positive

- Native, browser, Stage, Host, LAN, and remote implementations share one
  explicit evolution policy.
- App-store delays and mixed-version sessions can fail clearly or remain
  compatible instead of producing undefined behavior.
- Shared schemas enable later model generation without deciding that strategy
  prematurely.
- Authorization and deterministic truth remain server and scenario-engine
  responsibilities rather than schema side effects.

## Negative

- Contract artifacts, fixtures, and compatibility tests add maintenance work.
- Supporting an older major during a client migration can temporarily increase
  server complexity.
- Additive evolution requires deliberate unknown-field and feature-negotiation
  behavior in every client.

---

# Alternatives Considered

## Version Only the Client Application

Rejected because application builds do not express protocol compatibility and
cannot coordinate browser, LAN-server, Stage, and app-store releases.

## Put a Full Semantic Version in Every HTTP Route

Rejected because minor and patch changes should remain compatible within one
major and should not fragment resource paths.

## Unversioned WebSocket Messages

Rejected because incompatible clients could establish a transport connection
and then misinterpret private or state-changing messages.

## Treat Generated Language Models as the Contract

Rejected because it makes one implementation language authoritative and risks
drift among Swift, Kotlin, JavaScript, and Rust.
