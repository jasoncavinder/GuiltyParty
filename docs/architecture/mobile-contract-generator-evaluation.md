# Mobile Contract Generator Evaluation

## Status

Dependency intake prepared, 2026-08-06. Owner approval and the executable
compatibility spike remain pending. No generator, build plugin, runtime, or
transitive dependency is approved or added by this document.

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
packages. A lock-only, scripts-disabled resolution produced 29 non-root
packages: 2 Apache-2.0, 25 MIT, 1 BSD-3-Clause, and 1 ISC. Every resolved entry
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

Result: preferred candidate for an isolated executable compatibility spike,
subject to the proposed ADR 0025 intake and explicit owner approval. It is not
approved for repository, CI, Xcode, Gradle, or product use.

### Swift OpenAPI Generator

Apple's Swift OpenAPI Generator is Apache-2.0 licensed and supports OpenAPI 3.1,
but it solves only Swift, emphasizes generated HTTP client/server ceremony, and
normally runs as a build plugin. It does not satisfy the shared Swift/Kotlin,
committed-output, data-only workflow by itself.

Source: [Apple Swift OpenAPI Generator](https://github.com/apple/swift-openapi-generator)

Result: not selected for this contract-model role. It may be reconsidered for
a different, explicitly approved Swift HTTP boundary.

## Recommendation

Authorize a disposable, non-production `quicktype-core@26.0.0` spike under the
exact scope in the proposed ADR 0025 intake. Do not authorize the full
`quicktype` CLI. The spike runs outside ordinary Xcode and Gradle builds, uses
only committed synthetic schemas and fixtures, pins the exact package and
transitive lock, disables lifecycle scripts, and commits no generated output
until review.

The spike should use a small first-party Node wrapper with no schema-fetching
store and an explicit preflight rejection of non-fragment `$ref` values. It
should exercise Swift's platform-only `Codable` output and compare Kotlin's
plain-types and serializer-bearing output so any proposed mobile runtime
dependency is visible rather than silently adopted. A Kotlin serialization
framework is outside this approval scope.

Approval requires evidence that both generated languages:

1. compile on the accepted platform baselines;
2. decode every positive and privacy fixture;
3. reject every negative fixture at the handwritten compatibility boundary;
4. preserve absent versus null behavior;
5. represent discriminators without ambiguous merging;
6. tolerate additive fields while failing safely on unknown critical variants;
7. regenerate byte-for-byte identically; and
8. introduce no runtime networking or logging dependency.

Passing the spike would permit a separate adoption proposal; it would not make
the generator approved automatically. If quicktype-core fails, compare a
narrowly scoped first-party generator against manual DTO maintenance. Either
fallback is a separate owner decision; this evaluation does not silently choose
one.
