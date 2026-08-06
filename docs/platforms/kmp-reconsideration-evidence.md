# Kotlin Multiplatform Reconsideration Evidence

## Current Status

Kotlin Multiplatform is not selected or authorized. Separate SwiftUI and Jetpack
Compose clients remain the accepted architecture under ADR 0015.

[ADR 0027](../adr/0027-kotlin-multiplatform-reconsideration-thresholds.md)
defines when evidence may justify a proposal and time-boxed experiment. Meeting
a trigger does not authorize KMP adoption or production use.

## Preconditions

Do not begin a proposal until all boxes are satisfied:

- [ ] iOS and iPadOS gameplay baseline exists
- [ ] accepted first Android phone and tablet slice exists
- [ ] both clients have at least two meaningful beta or release cycles
- [ ] generated DTOs, canonical schemas, shared fixtures, and behavioral tests
      are already in use
- [ ] baseline effort, defects, code classification, build time, binary size,
      debugging, and physical-device behavior are recorded

## Trigger Record

Record at least one sustained trigger:

| Trigger | Measurement period | Evidence | Result |
| --- | --- | --- | --- |
| At least 5,000 equivalent hand-maintained non-UI lines | | | |
| Equivalent logic is at least 20% of each client's hand-maintained non-UI logic | | | |
| At least three eligible divergence defects in a rolling quarter | | | |
| Second-platform effort is at least 30% additional across three consecutive shared slices | | | |

Exclude generated DTOs, intentionally native UI and accessibility, platform
adapters, operating-system policy, copied fixtures, vendored code, comments,
and independent tests from the duplicated-logic numerator.

## Alternatives Before KMP

Document whether the problem can instead be reduced through:

- schema or DTO generation improvements
- additional canonical fixtures or cross-language behavior tests
- a smaller or clearer server contract
- removal of unnecessary client-side authority or logic
- first-party code generation for a narrow repeated pattern
- an already approved platform-native facility

## Experiment Record

- Owner and branch:
- Start date and ten-working-day deadline:
- Candidate UI-free slice:
- Native baseline commits:
- Contracts and fixtures:
- Toolchain and dependency intake:
- Stable Apple interoperability path:
- Platforms, simulators, and physical devices:
- Removal procedure:

## Scorecard

| Criterion | Native baseline | KMP experiment | Threshold | Result |
| --- | --- | --- | --- | --- |
| Common portion of candidate implementation | N/A | | At least 60% | |
| Duplicated maintained logic removed | | | At least 30% | |
| Second-platform effort over two representative changes | | | At least 25% reduction | |
| Clean build time | | | No more than 15% regression unless separately justified | |
| Incremental build and test feedback | | | Supportable by solo owner | |
| iOS application binary size | | | No more than 10% regression unless approved | |
| Android application binary size | | | No more than 10% regression unless approved | |
| Swift API ergonomics and debugging | | | Supportable | |
| Android API ergonomics and debugging | | | Supportable | |
| Contract and deterministic fixtures | | | Equal or stronger | |
| Authorization and projection-secrecy evidence | | | Equal or stronger | |
| Accessibility, lifecycle, and physical-device evidence | | | Equal or stronger | |
| Pinning, licensing, security, and reproducibility | | | ADR 0025 satisfied | |
| Replacement through native interface | | | Demonstrated | |

Every criterion must pass. Passing authorizes only a written adoption proposal
and new ADR. Failure removes the experimental integration; it does not lower the
threshold retroactively.

## Prohibited Scope

The experiment does not include shared UI, navigation, accessibility,
authentication and secure storage, discovery and permissions, capture
protection, media and Bluetooth, lifecycle, notifications, AirPlay, store
integration, server-authoritative scenario truth, or server-side secrecy
enforcement.
