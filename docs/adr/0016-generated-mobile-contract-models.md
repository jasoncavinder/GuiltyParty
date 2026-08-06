# ADR 0016: Generated Mobile Contract Models

## Status

Accepted

## Date

2026-08-06

---

# Context

ADR 0005 makes JSON Schema Draft 2020-12 the canonical representation for
control-plane payloads and uses OpenAPI 3.1-compatible documents to describe
HTTP operations. ADR 0015 selects separately implemented Swift/SwiftUI and
Kotlin/Jetpack Compose Companions and makes language-neutral contracts and
behavioral tests the primary mobile sharing boundary.

Maintaining all transport structures by hand in Swift and Kotlin would invite
small differences in optionality, enum handling, envelope fields, and error
semantics. Treating generated language types as the contract, however, would
reverse ADR 0005 and make a generator's interpretation authoritative. The
project needs a reproducible boundary that reduces mechanical duplication while
keeping authorization, scenario truth, logging, and application behavior out of
generated code.

# Decision

## Canonical Inputs

Swift and Kotlin control-plane transport data-transfer objects will be
generated from committed, language-neutral contract artifacts:

- JSON Schema is authoritative for payload, envelope, and shared error shapes.
- OpenAPI is authoritative for HTTP operation paths, methods, parameters,
  response status mappings, and content types while referencing the shared
  schemas.
- WebSocket messages use those same JSON Schemas. AsyncAPI may describe channel
  and direction metadata, but it is not a second source for payload shapes.

Generated Swift or Kotlin types are derived artifacts. They never become the
contract source of truth, and a language-specific annotation or convenience
must not silently change the wire contract.

## Generation Scope

Generation initially produces data-only transport models and their serialization
metadata. It does not generate:

- application or view models
- networking, retry, or reconnection policy
- credential handling or authorization decisions
- recipient projection or secrecy rules
- canonical scenario logic
- persistence behavior
- analytics, diagnostics, or payload logging

Handwritten platform adapters own HTTP and WebSocket execution and map generated
transport objects into handwritten application-domain state. Views consume the
application boundary rather than generated wire objects directly. Generated
files are clearly marked and are never edited by hand.

## Repository and Build Behavior

Generated Swift and Kotlin outputs are committed to the repository. Ordinary
Xcode and Gradle builds therefore do not need the generator or network access.
The generator version, configuration, templates or customization, and all
transitive tooling needed for generation must be pinned and reproducible.

Continuous integration regenerates the outputs from a clean checkout and fails
when the committed results differ. Generation must be deterministic across the
supported development environment. The exact generator is selected only after
a focused Swift/Kotlin compatibility evaluation and dependency, license,
security, and maintenance review.

## Compatibility Behavior

Generated decoders must implement ADR 0005 compatibility rules:

- tolerate unknown additive object fields
- preserve defined absent-versus-null semantics
- represent discriminated message variants without ambiguous fallback
- treat an unsupported message type or security-critical enum variant as a
  controlled unsupported-feature, incompatibility, or resynchronization path
  rather than a crash or silent state transition
- keep protocol-major types in an explicit namespace or module boundary so two
  majors may coexist during a migration

The handwritten boundary converts decoding and compatibility outcomes into safe
application states and user-facing errors. It also owns payload redaction and
must not rely on generated string descriptions for production logging.

## Verification

The contract suite includes:

- representative positive fixtures decoded by Rust, Swift, Kotlin, and
  JavaScript implementations as applicable
- negative fixtures for invalid envelopes, commands, and projection shapes
- additive-field and negotiated-feature compatibility cases
- absent, null, enum, discriminator, numeric-boundary, and Unicode cases
- privacy fixtures proving that generation and decoding do not broaden an
  authorized projection
- CI drift detection for both native languages

Generation validates representation; it does not prove authorization. Server
projection and deterministic replay tests remain independently required.

# Consequences

Positive:

- Swift and Kotlin transport shapes remain mechanically aligned with the same
  reviewed source.
- Contract changes create reviewable schema, fixture, and generated-code diffs.
- Native application code works with deliberate domain models rather than wire
  representation details.
- Developers and release builds do not need generation tools or network access
  for ordinary builds.

Negative:

- Generated sources add repository size and can make contract pull requests
  noisier.
- The project must maintain a pinned generation pipeline and periodically
  evaluate generator upgrades.
- Mapping between transport and application models adds explicit code.
- Generator limitations may require schema adjustments or narrowly reviewed
  templates rather than language-specific contract divergence.

# Alternatives Considered

## Maintain Swift and Kotlin Models Manually

Rejected as the default because two independently maintained representations
would duplicate mechanical work and make optionality, discriminator, and error
drift harder to detect.

## Generate Complete Networking Clients

Rejected initially. Transport execution, local trust, credential handling,
WebSocket lifecycle, and reconnect behavior are platform-sensitive security and
reliability boundaries that should remain explicit handwritten code.

## Generate During Every App Build

Rejected. It would couple ordinary Xcode and Gradle builds to generator
availability and could introduce environment or network-dependent output.

## Do Not Commit Generated Output

Rejected. Reviewers need visibility into generated API changes, and reproducible
offline app builds should not require a separate generation step.

## Select a Generator in This ADR

Deferred. Tool quality varies across the schema features the project requires.
A small compatibility evaluation and the normal dependency intake process must
precede tool adoption.
