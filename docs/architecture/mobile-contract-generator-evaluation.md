# Mobile Contract Generator Evaluation

## Status

Executable compatibility spike completed, 2026-08-06. `quicktype-core@26.0.0`
is rejected for adoption. No generator, build plugin, runtime, transitive
dependency, or generated source is added by this document.

## Required Fit

ADR 0016 requires committed, data-only Swift and Kotlin transport models derived
from canonical JSON Schema/OpenAPI artifacts. A candidate must preserve:

- Draft 2020-12 validation meaning
- required-nullable versus optional-absent fields
- discriminated WebSocket message and command variants
- safe handling of unknown additive fields and unsupported critical variants
- deterministic offline regeneration with pinned tooling
- no generated networking, authorization, logging, persistence, or UI behavior

It must also pass ADR 0025 dependency intake before repository adoption.

## Paper Evaluation

### OpenAPI Generator 7.22.0

OpenAPI Generator is Apache-2.0 licensed, supports model-only generation controls,
and offers both the stable `swift6` generator and a Kotlin generator. Its
published compatibility table still labels OpenAPI 3.1 support beta. More
importantly, the current Kotlin generator capability table marks `oneOf`, union,
polymorphism, and the JSON `null` type unsupported. Those gaps directly overlap
the v1 envelope discriminators and required-nullable projection members.

Sources:

- [project and license](https://github.com/OpenAPITools/openapi-generator)
- [Swift 6 generator](https://openapi-generator.tech/docs/generators/swift6/)
- [Kotlin generator capability table](https://openapi-generator.tech/docs/generators/kotlin/)
- [generation controls](https://openapi-generator.tech/docs/customization/)

Result: do not adopt from the paper evaluation. A later version may be
reconsidered, or a model-by-model spike may prove a safe constrained use, but
the current published capability gaps prevent approval now.

### quicktype CLI 26.0.0

quicktype accepts JSON Schema and produces Swift and Kotlin models. The current
npm package and source repository identify Apache-2.0 licensing, and the
project FAQ states that generated code has no intellectual-property
restrictions. It is closer to the desired data-only scope than a complete API
client generator.

The published CLI is nevertheless broader than this use. A lock-only,
scripts-disabled resolution on 2026-08-06 produced 107 non-root packages. It
includes GraphQL and TypeScript input adapters, TypeScript, `ts-node`,
`typescript-json-schema`, and `vm2`, none of which is needed to turn the
committed Guilty Party JSON Schema into Swift and Kotlin. The lock declared no
install scripts, native-platform selectors, missing integrity values, or known
npm-audit vulnerability, but the avoidable breadth remains a supply-chain and
maintenance cost.

Sources:

- [canonical repository](https://github.com/glideapps/quicktype)
- [26.0.0 release](https://github.com/glideapps/quicktype/releases/tag/v26.0.0)
- [published CLI package](https://www.npmjs.com/package/quicktype/v/26.0.0)
- [generated-code licensing FAQ](https://github.com/glideapps/quicktype/blob/v26.0.0/FAQ.md#am-i-allowed-to-use-the-generated-code-in-my-software)

Result: do not use the full CLI for the spike while a narrower official package
provides the required engine.

### quicktype-core 26.0.0

`quicktype-core` is the official quicktype engine as a library and exposes the
same Swift and Kotlin renderers without the CLI's GraphQL and TypeScript input
packages. A lock-only, scripts-disabled resolution produced 29 packages total:
2 Apache-2.0, 25 MIT, 1 BSD-3-Clause, and 1 ISC. Every resolved entry
had an integrity value and license identifier; none declared an install script,
native-platform selector, or deprecation, and the isolated npm audit reported
zero known vulnerabilities. npm supplies a registry signature and SLSA
provenance for the exact release, and its source commit is GitHub-verified.

This narrower graph does not establish contract compatibility. quicktype 26
added selected 2020-12 features, but its documentation does not claim complete
Draft 2020-12 support. An open issue reports incorrect handling of `oneOf`
inside array items, and another reports Swift 6 strict-`Sendable` failures when
generated open-value helpers are present. Kotlin generation defaults to Jackson;
the plain-types mode avoids an unapproved runtime but also omits serialization
metadata. Those behaviors overlap Guilty Party's discriminator, additive-field,
and native-build requirements and must be measured rather than inferred.

The engine includes an optional fetching schema store capable of reading URLs.
The proposed first-party spike wrapper must not instantiate it. It will supply
the committed schema as an in-memory string, reject non-fragment references,
use only synthetic fixtures, and make no runtime network request.

Sources:

- [published core package](https://www.npmjs.com/package/quicktype-core/v/26.0.0)
- [core API example](https://github.com/glideapps/quicktype/blob/v26.0.0/README.md#calling-quicktype-from-javascript)
- [Kotlin renderer options](https://github.com/glideapps/quicktype/blob/v26.0.0/packages/quicktype-core/src/language/Kotlin/language.ts)
- [Swift renderer options](https://github.com/glideapps/quicktype/blob/v26.0.0/packages/quicktype-core/src/language/Swift/language.ts)
- [`oneOf` array issue](https://github.com/glideapps/quicktype/issues/2310)
- [Swift 6 `Sendable` issue](https://github.com/glideapps/quicktype/issues/2858)

Result: selected for the isolated executable compatibility spike after its ADR
0025 intake and exact owner approval. The measured result is recorded below; it
remains unapproved for repository, CI, Xcode, Gradle, or product use.

### Swift OpenAPI Generator

Apple's Swift OpenAPI Generator is Apache-2.0 licensed and supports OpenAPI 3.1,
but it solves only Swift, emphasizes generated HTTP client/server ceremony, and
normally runs as a build plugin. It does not satisfy the shared Swift/Kotlin,
committed-output, data-only workflow by itself.

Source: [Apple Swift OpenAPI Generator](https://github.com/apple/swift-openapi-generator)

Result: not selected for this contract-model role. It may be reconsidered for
a different, explicitly approved Swift HTTP boundary.

## Spike Acceptance Criteria

The approved disposable spike ran outside ordinary Xcode and Gradle builds,
used only committed synthetic schemas and fixtures, pinned the exact package
and transitive lock, disabled lifecycle scripts, and committed no generated
output. The full `quicktype` CLI and any Kotlin serialization framework were
outside its scope.

The spike used a small first-party Node wrapper with no schema-fetching store
and an explicit preflight rejection of non-fragment `$ref` values. It exercised
Swift's platform-only `Codable` output and compared Kotlin's plain-types and
serializer-bearing output so generated runtime requirements were visible.

Adoption would have required evidence that both generated languages:

1. compile on the accepted platform baselines;
2. decode every positive and privacy fixture;
3. reject every negative fixture at the handwritten compatibility boundary;
4. preserve absent versus null behavior;
5. represent discriminators without ambiguous merging;
6. tolerate additive fields while failing safely on unknown critical variants;
7. regenerate byte-for-byte identically; and
8. introduce no runtime networking or logging dependency.

The spike failed criteria 1, 3, 4, and 5; criteria 2 and 6 remained incomplete
for Kotlin; and criteria 7 and 8 passed. Compare a narrowly scoped first-party
generator against manual DTO maintenance as a separate owner decision; this
evaluation does not silently choose either fallback.

## Executable Compatibility Spike

### Approved Scope and Environment

The project owner approved exactly `quicktype-core@26.0.0` for one disposable,
local, synthetic-data Swift/Kotlin compatibility spike under the controls in
the component intake. The approval did not cover permanent adoption, CI,
committed generated output, a Kotlin serialization runtime, the full quicktype
CLI, private or production data, or distribution.

The spike ran outside the repository with:

- Node.js 26.6.0 and npm 12.0.2
- a lock containing the exact 29-package reviewed graph
- `npm ci --ignore-scripts` and a zero-vulnerability npm audit result
- Apple Swift 6.3.3 from the installed Xcode toolchain
- the committed control-plane v1 schema and 18 synthetic fixtures only
- a first-party wrapper that rejected non-fragment `$ref` values, did not
  instantiate `FetchingJSONSchemaStore`, trapped `fetch`, and failed on console
  output

The installed Android Studio and Kotlin compiler reported in the earlier device
inventory were not accessible in this execution environment. No replacement
compiler, Gradle distribution, generated runtime, or other dependency was
downloaded. This prevented a Kotlin compiler check, but the language-neutral
semantic failures and Swift 6 failure were already independently dispositive.

### Measured Results

| Requirement | Result | Evidence |
| --- | --- | --- |
| Emit Swift and Kotlin | Partial pass | Codable Swift, Sendable Swift, plain Kotlin, and Jackson Kotlin sources were emitted. |
| Compile accepted native baselines | Fail | Plain Swift compiled in Swift 5 mode. Both ordinary and Sendable output failed Swift 6: generated `JSONCodingKey` is a non-final `Sendable` class, and Sendable models also contain non-Sendable `JSONAny`. Kotlin compilation was unavailable. |
| Decode positive and privacy fixtures | Partial pass | Swift 5 decoded all 12 expected-valid fixtures, including both privacy projections. |
| Reject negative fixtures | Fail | Generated Swift incorrectly accepted 3 of 6: missing command idempotency, Stage join with `display_name`, and explicit-null private objective. |
| Preserve required-nullable versus optional-absent | Fail | Both became ordinary optionals. A Stage join response missing the required-nullable `participant_id` was accepted, and absent versus explicit-null private objective became indistinguishable. |
| Preserve discriminated variants | Fail | `ClientCommand`, `ClientEnvelope`, and `ServerEnvelope` became structs with a discriminator enum and merged optional fields instead of distinct variants. An incomplete cast vote and a command payload paired with `get_projection` were both accepted. |
| Additive and unknown-critical compatibility | Pass in Swift test | The committed additive-field fixture decoded, while the unknown message-type fixture failed decoding. |
| Deterministic regeneration | Pass | Five fresh processes for each of four configurations produced one byte-identical SHA-256 per configuration. |
| No generator network or logging | Pass | All four generation modes completed with the network and console traps untouched. Generated Swift imported only Foundation; plain Kotlin imported no runtime. |
| No unapproved generated runtime | Fail for serializer-bearing Kotlin | Plain Kotlin omitted serialization names and metadata. Serializer-bearing Kotlin imported Jackson packages that are outside the approved scope. |

The five-run output hashes were:

- Swift Codable: `a0d0808e0559774a83956a465c65b7a04fc129248a0c4f51387b0582834e859d`
- Swift Codable plus Sendable: `3baafc23ba585c6a126334bcfff90ecff3704e85cc07c0c212f475128e67f507`
- Kotlin plain types: `f5998493e61f1621ec8edeb07e682e1c51f83a34c114ba8298d241d5f66346d8`
- Kotlin Jackson: `2070c21b661d4449422cf686837a0435cb1f7fd9ae636f3c431c45f9ce0fe462`

### Decision

Reject `quicktype-core@26.0.0` for Guilty Party mobile contract generation. Its
output is deterministic and can tolerate additive fields, but it does not
preserve the v1 contract's required-nullable semantics or discriminated
variants, fails Swift 6 compilation, and cannot provide usable Kotlin
serialization without an additional runtime. A handwritten predecoder could
reimplement the lost constraints, but doing so would duplicate the canonical
schema and defeat the purpose of choosing this generator.

No generated source, wrapper, package manifest, lockfile, or installed package
from the spike is retained in the repository.

## Follow-up Evaluation Decision

On 2026-08-06, the project owner approved a bounded evaluation of a narrow
first-party generator. Handwritten Swift and Kotlin DTO maintenance remains the
fallback. This approval permits a focused design and compatibility spike; it
does not adopt a generator, authorize generated product code, change the
canonical contract, or approve a new dependency.

The evaluation must treat the tool as a Guilty Party contract compiler rather
than a general-purpose JSON Schema generator. It will:

- accept only the committed control-plane schema and an explicitly documented
  subset of its JSON Schema Draft 2020-12 vocabulary;
- fail closed on unsupported keywords, ambiguous constructs, unresolved
  references, or schema shapes outside that subset;
- generate only namespaced, data-only Swift and Kotlin transport models and
  serialization behavior;
- preserve required-nullable versus optional-absent values and emit distinct,
  exhaustive discriminated variants;
- tolerate additive object fields while routing unknown critical variants to a
  controlled compatibility outcome;
- add no networking, authorization, secrecy policy, logging, persistence,
  application state, or UI behavior;
- generate deterministic, reviewable output suitable for committing and CI
  drift detection; and
- pass the existing positive, negative, additive-field, unsupported-variant,
  and privacy fixtures in both native languages at accepted compiler baselines.

The first proof should cover the complete join, envelope, command, projection,
and error subset rather than a favorable isolated type. Existing repository
languages and already approved components should be preferred; any new
third-party component requires its own ADR 0025 intake and owner approval.

Stop the evaluation and return to the handwritten-DTO alternative if faithful
generation requires broad JSON Schema implementation, substantial native
runtime machinery, language-specific contract exceptions, or duplicated
handwritten validation that makes generation merely cosmetic. Permanent
adoption or a decision to supersede ADR 0016 must be recorded separately after
the spike evidence is reviewed.

The completed implementation and compatibility evidence are recorded in
[First-Party Mobile Contract Generator Spike](first-party-contract-generator-spike.md).

## Subsequent Adoption

[ADR 0034](../adr/0034-first-party-mobile-contract-generator.md) adopts the
bounded first-party generator after the successful spike. The rejection of
`quicktype-core@26.0.0` and the evidence in this evaluation remain historical
records.
