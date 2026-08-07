# ADR 0027: Kotlin Multiplatform Reconsideration Thresholds

## Status

Accepted

## Date

2026-08-06

---

# Context

ADR 0015 selects separate native SwiftUI and Jetpack Compose Companions that
share contracts, fixtures, behavioral evidence, design semantics, and original
assets rather than a mobile runtime. Guilty Party is currently a solo,
AI-assisted operation, which makes duplicated maintenance expensive but also
makes an additional Kotlin/Native, Gradle, Xcode, interop, debugging, and
release toolchain costly to own.

Kotlin Multiplatform can share common Kotlin code while retaining platform-
specific implementations through source sets, interfaces, and `expect` and
`actual` declarations. That capability does not establish which Guilty Party
logic should move into a shared runtime or prove that the resulting bridge is
cheaper than two clear native implementations.

The project needs measurable triggers, eligible boundaries, a reversible
experiment, and adoption gates so anticipated duplication or framework
enthusiasm cannot silently supersede the native strategy.

# Decision

## Default and Authority

Separate native SwiftUI and Jetpack Compose applications remain the default.
Kotlin Multiplatform is not authorized for the MVP, the first native baselines,
or production merely because the project has one owner.

Meeting the thresholds in this ADR authorizes only a written proposal and a
time-boxed experiment. It does not authorize a new dependency, shared runtime,
Compose Multiplatform UI, generated-model change, migration, or production use.
Any adoption requires owner approval, ADR 0025 intake, and a new ADR that
supersedes the affected portions of ADRs 0015 and 0016.

## Evidence Preconditions

No KMP proposal begins until:

- the accepted iOS and iPadOS gameplay baseline exists
- the accepted first Android phone and tablet slice exists
- each client has completed at least two meaningful beta or release cycles that
  provide comparable maintenance and defect evidence
- generated DTOs, shared schemas, fixtures, and behavioral tests under ADR 0016
  are already being used so generated duplication is not misdiagnosed as a
  runtime-sharing problem
- work effort, defects, code classification, build time, binary size, and
  platform-specific behavior can be measured from a documented baseline

Anticipated work, prototype scaffolding, generated code, copied test fixtures,
design assets, and intentionally native UI are not evidence of harmful runtime
duplication.

## Reconsideration Triggers

After the preconditions are met, a proposal requires at least one sustained
trigger:

- at least 5,000 substantially equivalent, hand-maintained, non-UI lines of
  application logic exist across the two clients
- substantially equivalent duplicated logic represents at least 20 percent of
  the hand-maintained, non-UI application logic in **each** client
- three or more confirmed cross-platform divergence defects occur in one
  rolling quarter in logic that could plausibly share one implementation
- implementation of the second platform repeatedly consumes at least 30
  percent additional engineering effort across three consecutive shared
  feature slices because the same eligible behavior is being reimplemented and
  re-debugged

The measurement excludes generated transport models, platform UI, platform
adapters, accessibility integration, operating-system policy code, tests whose
duplication intentionally proves independent behavior, comments, vendored code,
and formatting differences. Equivalent code is counted by behavior and
maintenance obligation, not textual similarity.

A trigger creates permission to investigate, not a presumption that KMP is the
answer. The proposal compares improving generation, extracting first-party
fixtures, simplifying the contract, strengthening shared tests, or removing
unnecessary client logic.

## Eligible Shared Scope

An experiment may evaluate pure, platform-neutral client logic such as:

- control-contract version and compatibility decisions
- authorized-projection decoding into a narrow application model
- idempotent command construction and client-generated request identifiers
- pure input validation that does not replace server enforcement
- deterministic client-state reduction for already-authorized projections
- platform-neutral fixtures and behavioral test utilities

Shared client logic never becomes scenario authority. The server continues to
own canonical truth, authorization, audience filtering, character assignment,
reveals, votes, outcomes, and journal acceptance. A shared module cannot weaken
the requirement that secrecy is enforced server-side.

## Native Boundaries

The following remain native under this reconsideration:

- SwiftUI, Jetpack Compose, navigation, presentation, and design adaptation
- VoiceOver, TalkBack, Dynamic Type or font scaling, switch access, and other
  platform accessibility integration
- passkeys, provider authentication, Keychain, Keystore, biometrics, and
  endpoint credential custody
- Bonjour, Android NSD, local-network permissions, QR camera behavior, paired
  certificates, and platform trust UI
- app-switcher shielding, secure windows, screenshot or recording response,
  mirroring, and AirPlay control
- microphone permission, audio sessions or focus, Bluetooth, media routing,
  push-to-talk, backgrounding, interruptions, and platform lifecycle
- notifications, store integration, platform diagnostics, and release tooling

Compose Multiplatform or any other shared UI is outside this decision. It
requires its own evidence, dependency intake, experiment, and ADR. An
implementation does not move native behavior into common code merely to raise
the measured sharing percentage.

## Experiment

The experiment uses a separate branch and one low-risk, UI-free vertical slice,
normally projection decoding, compatibility checking, and idempotent command
construction. It is time-boxed to no more than ten working days or two working
weeks of owner-supervised effort.

The branch includes:

- the exact Kotlin, Kotlin Multiplatform, Gradle, Android, Xcode, and interop
  versions and ADR 0025 intake evidence
- an equivalent native baseline and identical contract fixtures
- iOS device and simulator, Android device and emulator, clean-build, incremental-
  build, binary-size, debugging, crash-symbolication, test, and removal evidence
- a record of common, platform-adapter, bridge, generated, and native code
- two representative compatible contract or behavior changes applied to the
  baseline and experiment for effort comparison

The experiment uses only stable interop capabilities required by its critical
path. As of this decision, Kotlin's direct Swift export is documented as Alpha;
it is not a production dependency for this experiment unless its status and
limitations are reevaluated and separately accepted at experiment time.

## Success Criteria

Every criterion must pass:

- at least 60 percent of the candidate module's hand-maintained implementation
  is genuinely common rather than bridge or `expect` and `actual` scaffolding
- the design removes at least 30 percent of the duplicated maintained logic in
  the measured candidate scope
- second-platform implementation effort falls by at least 25 percent across
  the two representative changes
- clean build time increases by no more than 15 percent on the maintained
  development host unless a separately documented productivity gain clearly
  outweighs it
- each application binary increases by no more than 10 percent unless the owner
  explicitly approves a measured product benefit
- contract, authorization, projection-secrecy, deterministic, accessibility,
  lifecycle, and physical-device evidence is equal to or stronger than the
  native baseline
- Swift API use, debugging, stack traces, crash diagnosis, test isolation,
  dependency updates, and developer workflow remain supportable by the solo
  owner
- platform code can replace the module through its documented interface without
  changing the server contract or canonical scenario data
- no critical path depends on an experimental API, unreviewed binary, unclear
  license, unpinned toolchain, or provider behavior

Passing metrics still leads to an adoption proposal and new ADR, not automatic
migration.

## Failure and Exit Criteria

The experiment is rejected or removed when:

- bridging, adapter, generated, and platform-specific code erase the measured
  maintenance savings
- common code begins to own UI, permissions, media, lifecycle, security policy,
  or server-authoritative truth
- Swift ergonomics, debugging, symbolication, build stability, upgrade burden,
  or physical-device behavior is materially worse
- the toolchain cannot remain pinned and reproducible with supported Xcode,
  Android, Gradle, and store requirements
- privacy, security, accessibility, deterministic, licensing, or test evidence
  weakens
- the success thresholds are not met within the time box

The experiment branch may be closed without migration. Reusable findings and
fixtures may be retained when they are first-party and independently useful;
the unapproved KMP dependency and build integration are removed.

## Ongoing Review After Any Future Adoption

If a future ADR adopts a KMP module, its benefit and boundary are reviewed
before each major toolchain upgrade and at least annually. Falling below the
adoption benefit, repeated interop regressions, or movement of native concerns
into common code triggers a removal or boundary-reduction review. Shared code
is not permanent merely because migration once succeeded.

# Consequences

Positive:

- The native strategy remains stable until real maintenance evidence exists.
- Solo staffing is treated as a constraint, not automatic proof that another
  toolchain will reduce work.
- Clear eligible and native boundaries protect platform quality and server
  authority.
- A small, reversible experiment provides comparative data before migration.
- Adoption and continuing use require measurable benefit rather than code-share
  vanity metrics.

Negative:

- Some duplicated eligible logic may remain until both clients accumulate
  enough evidence.
- Measuring effort, defects, code classification, build performance, and binary
  size adds process work.
- The success thresholds may reject a technically functional KMP prototype.
- A successful experiment still requires another ADR and migration plan.
- Toolchain and interoperability changes require reevaluation over time.

# Alternatives Considered

## Adopt KMP When Android Development Begins

Rejected because the project would be optimizing anticipated duplication before
either native baseline provides comparative evidence.

## Use a Percentage of the Entire App

Rejected because UI, generated DTOs, fixtures, assets, tests, and platform policy
would distort the measurement and reward moving inappropriate code into common
source sets.

## Adopt Compose Multiplatform at the Same Time

Rejected because shared UI changes the accepted native experience, accessibility,
tooling, and platform-quality boundary and requires a separate decision.

## Share All Client Logic Except UI

Rejected because authentication, secure storage, discovery, capture protection,
media, lifecycle, permissions, and store integration remain deeply platform-
specific even when they are not visible UI.

## Let a Successful Spike Enter Production Directly

Rejected because a time-boxed experiment does not supply migration, dependency,
release, rollback, support, or long-term maintenance approval.

# References

- [Kotlin: Share code on platforms](https://kotlinlang.org/docs/multiplatform/multiplatform-share-on-platforms.html)
- [Kotlin: Use platform-specific APIs](https://kotlinlang.org/docs/multiplatform/multiplatform-connect-to-apis.html)
- [Kotlin: Expected and actual declarations](https://kotlinlang.org/docs/multiplatform/multiplatform-expect-actual.html)
- [Kotlin: Multiplatform compatibility guide](https://kotlinlang.org/docs/multiplatform/multiplatform-compatibility-guide.html)
- [Kotlin: Swift export](https://kotlinlang.org/docs/native-swift-export.html)
- [ADR 0005: Versioned Control-Plane Contract](0005-versioned-control-plane-contract.md)
- [ADR 0015: Native Mobile Client Strategy](0015-native-mobile-client-strategy.md)
- [ADR 0016: Generated Mobile Contract Models](0016-generated-mobile-contract-models.md)
- [ADR 0025: Third-Party Dependency and SDK Governance](0025-third-party-dependency-governance.md)
- [ADR 0026: Solo-Owner, AI-Assisted Mobile Ownership](0026-solo-owner-ai-assisted-mobile-ownership.md)
