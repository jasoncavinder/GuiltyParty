# Mobile Contract Generator Evaluation

## Status

Pre-adoption evaluation, 2026-08-06. No generator, build plugin, runtime, or
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

### quicktype 26.0.0

quicktype accepts JSON Schema and produces Swift and Kotlin models. The npm
package currently identifies Apache-2.0 licensing. It is closer to the desired
data-only scope than a complete API client generator. Its public documentation
does not establish the exact Draft 2020-12, discriminator, absent/null, and
unknown-variant behavior this contract requires, and its package has a
meaningful Node transitive toolchain that requires review.

Sources:

- [canonical repository](https://github.com/glideapps/quicktype)
- [published package](https://www.npmjs.com/package/quicktype)

Result: best candidate for an isolated executable compatibility spike, but not
approved for repository or build use.

### Swift OpenAPI Generator

Apple's Swift OpenAPI Generator is Apache-2.0 licensed and supports OpenAPI 3.1,
but it solves only Swift, emphasizes generated HTTP client/server ceremony, and
normally runs as a build plugin. It does not satisfy the shared Swift/Kotlin,
committed-output, data-only workflow by itself.

Source: [Apple Swift OpenAPI Generator](https://github.com/apple/swift-openapi-generator)

Result: not selected for this contract-model role. It may be reconsidered for
a different, explicitly approved Swift HTTP boundary.

## Recommendation

Authorize a disposable, non-production quicktype 26.0.0 spike only after its
standard ADR 0025 intake record is complete. The spike should run outside
ordinary Xcode and Gradle builds, use only committed synthetic schemas and
fixtures, pin the exact package and transitive lock, and commit no generated
output until review.

Approval requires evidence that both generated languages:

1. compile on the accepted platform baselines;
2. decode every positive and privacy fixture;
3. reject every negative fixture at the handwritten compatibility boundary;
4. preserve absent versus null behavior;
5. represent discriminators without ambiguous merging;
6. tolerate additive fields while failing safely on unknown critical variants;
7. regenerate byte-for-byte identically; and
8. introduce no runtime networking or logging dependency.

If quicktype fails, compare a narrowly scoped first-party generator against
manual DTO maintenance. Either fallback is a separate owner decision; this
evaluation does not silently choose one.
