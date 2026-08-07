# First-Party Mobile Contract Generator Spike

## Status

Compatibility spike completed, 2026-08-06. The first-party generator satisfied
the bounded evaluation gates and was subsequently adopted by
[ADR 0034](../adr/0034-first-party-mobile-contract-generator.md). The subsequent
integration slice committed the Swift and Kotlin outputs and added offline
generation, native verification, and CI drift enforcement. Those production
integration artifacts remain distinct from this disposable spike evidence.

## Purpose and Scope

The spike tests whether a small Guilty Party-owned contract compiler can derive
faithful Swift and Kotlin transport models from the canonical control-plane v1
JSON Schema after `quicktype-core@26.0.0` failed the same semantic boundary.

The implementation is the first-party Rust binary `gp_contract_gen`. It is a
development tool in the existing Rust workspace and uses only the already
resolved `serde_json` dependency. The lockfile adds the first-party package but
no new third-party package or version.

The spike does not generate networking, authentication, authorization, secrecy
policy, logging, persistence, application state, UI behavior, or scenario
logic. All generated source and native test artifacts remain in a disposable
temporary directory and are deleted by the runner.

## Fail-Closed Schema Profile

The tool accepts only the committed Draft 2020-12 schema shape and rejects
anything outside its explicit profile.

Supported structural vocabulary:

- root `$schema`, `$id`, `title`, `description`, and `$defs`
- direct, local, nonrecursive `#/$defs/Name` references only
- `type` for object, array, string, integer, boolean, and null
- two-member nullable type arrays containing exactly one `null` and one
  supported non-null type
- `properties`, `required`, and `items`
- discriminated `oneOf` objects and nullable `oneOf`
- the narrow `allOf` refinements used by the v1 envelope definitions

Supported validation vocabulary:

- string `const`, `minLength`, `maxLength`, and `pattern`
- mandatory signed 64-bit integer `minimum` and `maximum` bounds
- array `minItems` and `uniqueItems`

`description`, `title`, `format`, and `writeOnly` remain annotations. The tool
does not silently approximate unsupported keywords, external or nested
references, ambiguous unions, or overlapping `allOf` constraints. An input
using one fails generation before either language is emitted.

Recursive reference graphs fail before named-type expansion, and malformed
nullable arrays return controlled generation errors rather than panicking.
Requiring both integer bounds prevents the schema from accepting values that
the generated Swift `Int64` and Kotlin `Long` models cannot represent. The
canonical cross-platform counters are additionally capped at JSON's portable
exact-integer ceiling (`2^53 - 1`) for browser parity.

The current `allOf` support recognizes only two proven refinements:

- an unconstrained object property refined to an object-shaped schema; and
- a bounded string property refined to a constant that satisfies its length
  bounds.

Other overlapping properties fail closed rather than using override order.

## Generated Boundaries

Swift output:

- uses only Foundation and compiles in Swift 6 language mode with warnings as
  errors;
- implements `Codable`, `Equatable`, and `Sendable` transport types;
- uses explicit enum cases for discriminated variants;
- provides validated public constructors for outbound DTOs;
- rejects explicit null for optional non-null fields;
- requires the presence of required-nullable fields and encodes nil as JSON
  null rather than omitting the member; and
- ignores unknown additive object fields while rejecting unknown critical
  discriminators.

Kotlin output:

- uses only the Kotlin/JDK standard runtime and compiles with warnings as
  errors;
- emits data classes and sealed discriminated variants in the
  `guiltyparty.contracts.v1` package;
- provides validated public constructors and bidirectional conversion through
  a small generated `GPJsonValue` boundary;
- escapes Kotlin interpolation markers in every schema-derived source literal
  and redacts values from generated DTO and `GPJsonValue` `toString()` output;
- preserves missing versus explicit-null input before model construction; and
- applies the same additive-field and critical-variant behavior as Swift.

The Kotlin spike intentionally stops at the parsed JSON-value boundary. A
handwritten Android transport adapter must convert raw platform JSON into
`GPJsonValue`. Selecting or adding a third-party Kotlin JSON runtime is not part
of this spike and would require its own dependency intake.

## Reproduction

Run from the repository root:

```sh
python3 tooling/run_contract_generator_spike.py
```

The runner requires Swift 6 and a Kotlin compiler. It discovers Kotlin in a
standard Android Studio installation or a read-only mounted Android Studio
image. Explicit `--swiftc`, `--kotlin-home`, and `--java` paths are also
supported. It performs no installation or network request.

The runner:

1. builds the first-party generator offline from the locked Rust workspace;
2. generates each language five times and requires one byte-identical hash;
3. rejects networking, logging, or unexpected import markers in output;
4. compiles Swift 6 with warnings as errors;
5. compiles Kotlin with warnings as errors;
6. decodes, validates, and re-encodes all 18 committed fixtures;
7. rejects derived cases for a missing required-nullable member and an
   incomplete cast-vote command;
8. accepts the portable maximum counter and rejects the next integer;
9. constructs outbound DTOs and proves constructor validation;
10. verifies that required-nullable output is encoded as JSON null; and
11. verifies that Kotlin DTO and raw-value stringification cannot expose a
    synthetic private value.

## Measured Results

Environment:

- Rust 2021 workspace with locked `serde_json@1.0.151`
- Apple Swift 6.3.3
- Kotlin/JVM 2.3.10 on the Android Studio bundled JRE 25.0.2

Results:

| Gate | Result |
| --- | --- |
| Parse the complete control-plane v1 schema | Pass |
| Reject unsupported schema vocabulary and ambiguous `allOf` | Pass |
| Emit complete namespaced Swift and Kotlin models | Pass |
| Preserve required-nullable and optional-non-null semantics | Pass |
| Preserve exhaustive discriminated variants | Pass |
| Tolerate additive fields and reject unknown critical variants | Pass |
| Compile at both native language baselines with warnings as errors | Pass |
| Pass 18 committed and 4 derived fixture cases in both languages | Pass |
| Validate outbound construction, required-nullable encoding, integer limits, and redacted Kotlin stringification | Pass |
| Regenerate byte-for-byte across five fresh outputs | Pass |
| Add no networking, logging, or new third-party dependency | Pass |
| Remove disposable generated and compiled artifacts | Pass |

Final deterministic output hashes:

- Swift: `53e4735218b2a7f08534e7e43a87997a241a7bc3ac22554c43b8cf90a67ed08a`
- Kotlin: `a7dfd4f65d25870b6fc1a139be2af9d8e92429f65b98077d24c22b951f3411a0`

The temporary Swift output was 2,958 lines and 122,040 bytes. The temporary
Kotlin output was 2,492 lines and 112,900 bytes. The same bytes are now
committed by the subsequent integration slice.

The first-party implementation and generation wrappers total approximately
3,210 lines.
That is a real maintenance cost, but it is bounded to the current vocabulary,
covered by fail-closed parser tests, and smaller than maintaining more than
5,000 generated transport lines independently across two languages.

The Kotlin compiler emits JDK warnings about deprecated or restricted APIs used
inside the bundled compiler process. Generated Kotlin compiles with
`-Werror` and emits no source warning. The warnings do not identify generated
runtime behavior, but the Android toolchain should be rechecked at adoption and
upgrade time.

## Assessment and Remaining Decisions

The spike does not hit the documented stop conditions. It implements a closed
schema profile rather than broad JSON Schema, uses a small language-neutral
intermediate model, needs no language-specific contract exception, and does not
duplicate handwritten validation outside generated code.

The evidence supported adoption rather than falling back to manual DTO
maintenance. ADR 0034 records the owner's decisions on:

- the maintenance cost of the first-party compiler;
- the use of the pending-retrospective-review `serde_json` component for this
  build-tool purpose under ADR 0025;
- the Kotlin raw-JSON-to-`GPJsonValue` adapter boundary;
- final generated-source locations and module ownership;
- the command used to regenerate committed output;
- CI drift enforcement and supported toolchain baselines; and
- removal or supersession behavior if the canonical schema outgrows the closed
  profile.

The crate is now the accepted generator. The spike runner remains evaluation
evidence. The committed outputs, regeneration command, native compiler checks,
and CI drift enforcement are implemented by the separately reviewable
integration slice authorized by ADR 0034. Native application build references
remain deferred until the corresponding native projects exist.
