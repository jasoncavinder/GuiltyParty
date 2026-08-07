# ADR 0034: First-Party Mobile Contract Generator Adoption

## Status

Accepted

## Date

2026-08-06

---

# Context

ADR 0005 makes the versioned JSON Schema the canonical source for control-plane
payload shapes. ADR 0015 selects separate native Swift and Kotlin Companions,
and ADR 0016 requires committed generated transport models behind handwritten
application boundaries while deferring selection of the generator.

The focused evaluation rejected `quicktype-core@26.0.0`. Although its output
was deterministic, it did not preserve required-nullable members or exhaustive
discriminated variants, failed the accepted Swift 6 compilation mode, and
needed an additional unapproved runtime to provide useful Kotlin serialization.

The subsequent bounded spike implemented `gp_contract_gen`, a first-party Rust
contract compiler for the closed control-plane v1 schema profile. It generated
Swift and Kotlin five times byte-for-byte, compiled with Swift 6.3.3 and
Kotlin/JVM 2.3.10, and passed all 18 committed fixtures plus four derived
compatibility cases in both languages. The output introduced no networking,
logging, native runtime dependency, or application behavior.

The project now needs to select that implementation, define ownership and
regeneration behavior, and establish a safe response when the canonical schema
outgrows the supported profile. This decision adopts the generator; it does not
itself add generated product sources or native application build integration.

# Decision

## Selected Generator and Authority

Guilty Party adopts the first-party `gp_contract_gen` Rust crate as the sole
generator for Swift and Kotlin control-plane v1 transport models.

The committed JSON Schema remains authoritative. Generator source and generated
language models are derived implementation artifacts. A generator bug, emitted
type, platform annotation, or handwritten adapter must not redefine the wire
contract, authorization policy, projection audience, or deterministic scenario
truth.

The generator remains a deliberately incomplete contract compiler rather than
a general JSON Schema implementation. It accepts only its documented,
fail-closed profile. Unsupported keywords, unresolved or nonlocal references,
recursive reference graphs, unbounded integer domains, malformed nullable
arrays, ambiguous unions, and overlapping constraints stop generation instead
of being ignored, approximated, panicked over, or expanded indefinitely.

Generated code remains limited to:

- version-namespaced transport data types;
- decoding, encoding, and schema-derived value validation; and
- the minimal language-local value representation needed by those operations.

It must not generate networking, retry or reconnection behavior, credential
handling, authorization, secrecy policy, scenario logic, persistence,
analytics, diagnostics, payload logging, UI, or application-domain state.
Generated Kotlin DTO and `GPJsonValue` string representations redact contained
values so incidental object logging cannot expose tokens or private projection
content. Schema-derived Kotlin literals must escape interpolation markers.

Every generated integer domain must declare finite `minimum` and `maximum`
bounds representable by Swift `Int64` and Kotlin `Long`. Cross-platform
control-plane counters use the canonical portable JSON ceiling `2^53 - 1` so
browser JavaScript also preserves their values exactly. A producer with a wider
native unsigned type remains responsible for enforcing the schema maximum.

## Generated Output Ownership and Locations

The contract area owns the committed derived sources at:

- `contracts/generated/control-plane/v1/swift/ControlPlaneV1.generated.swift`
- `contracts/generated/control-plane/v1/kotlin/ControlPlaneV1.generated.kt`

Each output is one reviewable file for the protocol major. The Swift types keep
the `GPV1` prefix. Kotlin types keep the `guiltyparty.contracts.v1` package and
the `GPV1` prefix. A future protocol major receives a separate directory,
namespace, and generated output so two majors can coexist during migration.

The iOS/iPadOS Xcode project and Android Gradle project compile these committed
files through explicit source references or source-set configuration. They do
not copy the files into separately editable platform trees. Generated sources
are never edited by hand and do not contain platform application models.

This contract-owned location avoids choosing an Android application directory
before ADR 0017's entry checkpoint while still fixing one canonical path for
each derived artifact.

## Regeneration and Drift Commands

The generation integration slice will add these root commands:

- `make generate-mobile-contracts` validates the canonical schema and fixtures,
  builds the locked first-party generator offline, generates both languages in
  a temporary directory, verifies both outputs, and atomically replaces the two
  committed files only after every step succeeds.
- `make check-mobile-contracts` performs the same offline generation into a
  temporary directory and fails when either result differs from its committed
  output. It never modifies the worktree.

Both commands use:

- `contracts/control-plane/v1/control-plane.schema.json` as the only model
  input;
- the committed contract fixture manifest as compatibility evidence;
- `cargo --locked --offline` and the repository-pinned Rust toolchain; and
- no network request, URL-based schema resolution, Xcode build plugin, Gradle
  plugin, or install-time download.

Generated headers identify the generator crate and version, protocol major,
canonical source path, and source digest. Timestamps, absolute paths, machine
names, temporary directories, and other environment-dependent values are
forbidden.

Ordinary Xcode and Gradle builds consume committed output and never invoke the
generator. This keeps native builds available offline and prevents a build
plugin from silently rewriting reviewed source.

## Continuous Integration and Review

Continuous integration runs `make check-mobile-contracts` whenever the
canonical contract, fixtures, generator, generation wrapper, or committed
outputs change. It also:

- runs the Rust generator unit tests and fail-closed vocabulary tests;
- compiles the generated Swift in Swift 6 language mode with warnings as
  errors;
- compiles the generated Kotlin with warnings as errors;
- executes the shared positive, negative, additive-field, unsupported-variant,
  numeric, Unicode, nullability, and privacy fixtures in both languages; and
- confirms generated imports and source contain no networking or logging
  behavior.

A contract-changing pull request includes the schema, fixtures, and both
generated diffs in one reviewable change. CI drift or a failure in either native
language blocks the change. Generator-only changes must prove that an unchanged
schema either produces no diff or includes an explained, reviewed migration in
both outputs.

## Kotlin Raw JSON Boundary

The generated Kotlin output terminates at the generated `GPJsonValue` boundary.
A small handwritten Android transport adapter owns conversion between raw
network bytes or the platform-selected JSON parser and `GPJsonValue`.

That adapter must:

- preserve missing members independently from explicit JSON null;
- preserve JSON object, array, string, Boolean, null, and integral-number
  distinctions required by the schema;
- reject non-integral numbers where integers are required, unsupported numeric
  ranges, malformed input, and configured size or nesting-limit violations;
- return controlled compatibility or protocol errors rather than partially
  constructed transport objects; and
- avoid logging raw payloads, private projections, credentials, or validation
  values.

The adapter contains no authorization or scenario policy. Its behavior receives
fixture parity tests with the Swift decoder and Rust contract checks. This ADR
does not approve a Kotlin JSON library. A third-party parser or serialization
runtime requires a separate ADR 0025 intake and owner approval before use.

## Toolchain Baselines and Updates

The initial reproducibility baseline is:

- Rust 1.97.1 from `rust-toolchain.toml` for the first-party generator;
- Swift language mode 6, initially verified with Swift 6.3.3; and
- Kotlin/JVM 2.3, initially verified with Kotlin 2.3.10 on JRE 25.0.2.

The generation and CI integration must pin the exact native toolchain releases
it installs or selects. Moving a baseline requires a reviewable toolchain
change, regeneration, warnings-as-errors compilation, the complete fixture
suite, and confirmation that unchanged contracts remain semantically and
byte-for-byte stable or have an explained output migration.

The Kotlin compiler's current warnings originate in the installed compiler's
own use of JDK APIs rather than generated source. They do not weaken
warnings-as-errors for generated code. The integration must not broadly silence
source warnings; a compiler or JRE upgrade is required before those toolchain
warnings become build failures.

## `serde_json` Scope Approval

The generator may use the already locked `serde_json@1.0.151` dependency with
its existing default `std` feature for local development and CI generation.
This is an explicit, narrow purpose extension under ADR 0025, approved with
this decision.

The exact locked package has checksum
`c841b55ecdae098c80dcae9cf767f6f8a0c2cdb3416bbef72181df4d0fe73f14`
and declares `MIT OR Apache-2.0`. The generator adds no new resolved package or
version: its normal transitive graph is the graph already present for existing
workspace uses. Its build script selects arithmetic configuration from Cargo's
target environment and performs no network access. The generator processes
committed contract files and synthetic fixtures only.

This approval does not approve a version update, a new feature, private or
production data processing, inclusion in a native app, redistribution beyond
existing obligations, or broader external-beta/commercial use. Those scopes
remain subject to the repository's retrospective component review and normal
ADR 0025 update gates.

## Schema Growth, Maintenance, and Removal

The project accepts the maintenance cost of the bounded first-party compiler
because its semantic behavior is directly tested in both target languages and
avoids maintaining the same DTO constraints manually twice.

When a proposed canonical schema change uses an unsupported construct, the
change stops. It must not weaken the schema, add a language-specific exception,
or bypass drift checks merely to fit the generator. A subsequent decision may:

1. extend the closed compiler profile with parser, emitter, native compilation,
   and fixture evidence;
2. choose a newly evaluated replacement generator; or
3. supersede ADR 0016 and this ADR with a deliberate handwritten-model policy.

Extending into broad JSON Schema implementation, substantial language runtime
machinery, duplicated handwritten validation, or inconsistent Swift/Kotlin
semantics triggers architectural reconsideration rather than incremental
workarounds.

Removing or replacing the generator includes its crate, wrappers, Make targets,
CI jobs, toolchain configuration, generated headers and outputs, documentation,
and dependency-purpose approval. Native projects must move atomically to the
replacement committed sources; they must never silently retain stale generated
models.

## Implementation Boundary

This ADR authorizes a focused follow-up pull request to add the two committed
outputs, generation and drift commands, native compiler checks, and CI
enforcement described above. It does not authorize networking, authentication,
application functionality, an Android application before ADR 0017's checkpoint,
or any additional dependency.

This decision completes the generator-selection deferral in ADR 0016. It does
not supersede ADR 0016's canonical-input, generated-scope, repository, or
compatibility rules.

# Consequences

Positive:

- Swift and Kotlin receive faithful models from the same canonical schema.
- The generator fails visibly instead of silently discarding unsupported
  contract meaning.
- Generated sources remain reviewable and ordinary native builds stay offline.
- No third-party generator, native serialization runtime, or build plugin is
  introduced.
- Protocol-major namespacing and shared fixture evidence reduce cross-platform
  drift.

Negative:

- Guilty Party owns and must maintain approximately 2,845 lines of generator
  and compatibility-runner code.
- Committed generated files add more than 5,000 lines and will enlarge contract
  diffs once the integration slice lands.
- CI requires compatible Swift and Kotlin compiler environments.
- Kotlin still needs a small handwritten raw-JSON adapter with its own parity
  and input-limit tests.
- A schema feature outside the closed profile blocks contract evolution until
  explicitly supported or the generator strategy changes.

# Alternatives Considered

## Maintain Swift and Kotlin DTOs by Hand

Rejected as the default. It avoids compiler maintenance but duplicates
optionality, discriminator, and validation behavior across two native clients
and makes semantic drift harder to detect.

## Adopt `quicktype-core@26.0.0`

Rejected by executable evidence. It did not preserve required-nullable or
discriminated-union semantics, failed Swift 6 compilation, and required an
additional Kotlin runtime for useful serialization.

## Adopt a Broader Third-Party Generator

Rejected for the current contract. Evaluated tools either lacked the required
Kotlin schema semantics, generated a broader client/runtime surface, or added a
disproportionate dependency and maintenance graph. A future version may be
reconsidered through a new focused evaluation.

## Generate During Every Native Build

Rejected. It would make ordinary Xcode and Gradle builds depend on the Rust
tool and could rewrite derived source outside an explicit contract change.

## Keep Generated Outputs Outside the Repository

Rejected by ADR 0016. Review and reproducible offline native builds require the
exact derived sources to be committed.

# References

- [ADR 0005: Versioned Control-Plane Contract](0005-versioned-control-plane-contract.md)
- [ADR 0015: Native Mobile Client Strategy](0015-native-mobile-client-strategy.md)
- [ADR 0016: Generated Mobile Contract Models](0016-generated-mobile-contract-models.md)
- [ADR 0017: Android Prototype Entry Checkpoint](0017-android-prototype-entry-checkpoint.md)
- [ADR 0025: Third-Party Dependency and SDK Governance](0025-third-party-dependency-governance.md)
- [Mobile Contract Generator Evaluation](../architecture/mobile-contract-generator-evaluation.md)
- [First-Party Mobile Contract Generator Spike](../architecture/first-party-contract-generator-spike.md)
- [`serde_json@1.0.151` manifest](https://github.com/serde-rs/json/blob/v1.0.151/Cargo.toml)
