# ADR 0028: Mobile Release Parity

## Status

Accepted

## Date

2026-08-06

---

# Context

ADR 0015 selects separate native SwiftUI and Jetpack Compose player
Companions. ADR 0017 permits the iOS and iPadOS gameplay baseline to precede a
narrow Android slice, and ADR 0026 recognizes that one human owner may need to
work on one platform at a time. Those decisions do not define when a platform
may be described as supported, which guarantees must remain equivalent, or how
temporary and intentional differences are governed.

Guilty Party needs native platform quality without allowing sequencing to
create silent privacy gaps, incompatible scenario behavior, or misleading
product claims. Parity must therefore describe equivalent product outcomes and
guarantees rather than pixel-identical interfaces or synchronized release
dates.

# Decision

## Meaning of Parity

Mobile parity means that supported iOS/iPadOS and Android clients provide the
same accepted product guarantees and can participate safely in the same
eligible sessions. It does not require identical presentation, navigation,
operating-system integration, implementation structure, or release dates.

A platform is not described publicly as generally supported merely because it
can install, connect, or display a projection. Its applicable core parity gates
must pass on that platform with current evidence.

## Feature Classification

Every material mobile capability is assigned exactly one classification in the
living parity matrix:

1. **Core parity gate:** Required before a platform is generally supported for
   the applicable product scope.
2. **Platform adaptation:** Required outcome is equivalent, but interaction or
   implementation follows native platform capabilities and conventions.
3. **Staged parity:** One platform may receive the capability first under a
   visible, owner-approved, time-bounded tracking record.
4. **Platform-exclusive capability:** An intentional difference justified by a
   material platform capability, with a safe alternative where the scenario or
   session would otherwise depend on it.

A missing implementation is not a platform adaptation. A hidden stub is not
parity. Classification changes require owner approval and an updated matrix;
changes to accepted product or architecture requirements may also require a
new ADR.

## Core Parity Gates

Before both native platforms are represented as supported for the same scope,
each must demonstrate the applicable accepted behavior for:

- account authentication, recovery, and account-continuity semantics
- invitation, pairing, admission, participant membership, and endpoint
  authority
- the core player loop, including joining, character assignment, authorized
  clues and objectives, scene progression, voting, and outcome display
- server-enforced authorization, recipient-specific projection secrecy, and
  absence of client-side canonical scenario authority
- control-contract compatibility, idempotent commands, temporary-disconnection
  recovery, and authorized transfer between a player's endpoints
- privacy, capture protection, consent, microphone, private-audio, and
  fail-closed degradation outcomes applicable to the platform
- first-class phone and tablet behavior and accessibility-equivalent outcomes
  using the platform's native facilities
- session and scenario language metadata, locale-safe rendering, and truthful
  capability or content eligibility
- required-update, revocation, security response, and account-deletion behavior
  once those product capabilities apply

The evidence may differ by platform, but the protected outcome cannot be
weaker merely to make release dates align.

## Native and Intentional Differences

The following may differ while preserving parity:

- visual composition, navigation, gestures, system controls, and native
  terminology
- permission and local-discovery flows
- passkey, provider-authentication, Keychain, and Keystore integration
- VoiceOver, TalkBack, text scaling, switch access, and other accessibility
  mechanisms
- app-switcher, screenshot, recording, mirroring, and casting controls where
  operating-system capabilities differ
- audio-session or audio-focus behavior, Bluetooth and media-route controls,
  interruption UX, and push-to-talk integration
- Apple and Google distribution, review, notification, and account-management
  surfaces

The difference must be documented as a platform adaptation or approved
platform-exclusive capability and must preserve the accepted privacy,
authorization, accessibility, safety, and deterministic guarantees.

## Sequential and Staged Delivery

The project does not require simultaneous implementation, beta promotion, or
store release. One native platform may ship a beta or optional capability first
when all of the following are true:

- its availability and the other platform's gap are stated accurately in beta,
  store, support, host, and release communication appropriate to the audience
- server and control-plane changes remain backward compatible with every
  supported client or use an explicit required-update boundary
- scenarios and sessions do not require the missing client capability unless
  eligibility is advertised before joining and a safe supported alternative is
  available
- hosts and scheduling surfaces can determine relevant capability readiness
  without inferring it solely from an operating-system name
- the gap cannot weaken authorization, secrecy, privacy, consent, deterministic
  outcomes, account continuity, or safety on the later platform
- the parity matrix records an owner, rationale, evidence, user-visible impact,
  fallback, and next review date

Staged parity has no automatic calendar deadline because a solo operation may
need evidence-driven sequencing. It is reviewed during each applicable planning
cycle and before beta or general-release promotion. A repeatedly deferred gap
must be reclassified honestly as unsupported or platform-exclusive rather than
remaining indefinitely described as imminent.

## Capability Negotiation and Scenario Eligibility

Clients advertise versioned capabilities and limitations. The server makes
authorization, command, projection, and scenario-eligibility decisions from
trusted session state and the versioned capability contract, not from a simple
`iOS` or `Android` branch and never from a client claim alone where authority is
required.

Unsupported commands are denied safely. A scenario declares any required
participant or Stage capabilities and any approved fallback. A participant
learns about a material incompatibility before joining or accepting a role.
Platform-specific convenience cannot become an undisclosed requirement for
canonical scenario progress.

## Security and Privacy Exceptions

A security, privacy, authorization, or safety fix may ship immediately on one
platform without waiting for synchronized release. If equivalent protection is
not yet available elsewhere, the affected capability or client version is
disabled, revoked, constrained to a safe mode, or placed behind an
update-required boundary. Schedule parity never justifies continued unsafe
operation or a weaker protection.

## Tracking and Release Claims

The living mobile parity matrix records:

- stable feature or guarantee identifier and classification
- applicable product scope and scenario capabilities
- iOS/iPadOS and Android status
- contract, automated, simulator, physical-device, accessibility, privacy, and
  security evidence as applicable
- known gap, user-visible disclosure, and safe fallback
- accountable human owner and next review date

Only the human project owner approves classifications, exceptions, beta
promotion, supported-platform claims, and general release. An AI agent, green
build, common code path, or successful simulator run is evidence rather than
release authority.

The browser Companion remains a real capability-limited fallback. Its presence
does not satisfy a native platform's parity gate or justify describing an
unimplemented native platform as supported.

# Consequences

Positive:

- Product guarantees remain stable while native experiences follow their
  platforms.
- Solo development can sequence work without promising simultaneous releases.
- Capability negotiation and scenario eligibility make differences explicit
  before they disrupt a session.
- Privacy and security fixes are not delayed for cosmetic schedule alignment.
- The parity matrix creates durable evidence for public support claims and
  future team handoffs.

Negative:

- Each material capability needs classification, evidence, and gap tracking.
- A functional client may remain beta or unsupported until its core gates pass.
- Backward compatibility and scenario fallbacks add contract and test work.
- Some optional features may remain intentionally asymmetric or ship at
  different times.
- The solo owner remains accountable for deciding when evidence is sufficient.

# Alternatives Considered

## Require Identical Features and Release Dates

Rejected because it would delay safe platform-specific fixes, ignore native
capabilities, and impose an unrealistic synchronization burden on a solo
operation without improving product guarantees.

## Let Each Platform Evolve Independently

Rejected because incompatible behavior and silent privacy or scenario gaps
would undermine participant trust and cross-platform sessions.

## Treat Identical Screens as Parity

Rejected because visual sameness does not establish equivalent authorization,
privacy, accessibility, media, lifecycle, or recovery behavior.

## Make Every Difference Platform-Exclusive

Rejected because that label could hide unfinished work and misleading support
claims. Exclusive behavior requires material platform justification and a safe
alternative where product participation depends on it.

## Use the Browser Fallback to Satisfy Native Parity

Rejected because the browser intentionally has different local trust, secure
storage, media, capture, and lifecycle capabilities.

# References

- [ADR 0005: Versioned Control-Plane Contract](0005-versioned-control-plane-contract.md)
- [ADR 0015: Native Mobile Client Strategy](0015-native-mobile-client-strategy.md)
- [ADR 0017: Android Prototype Entry Checkpoint](0017-android-prototype-entry-checkpoint.md)
- [ADR 0023: Physical-Device Test Matrix](0023-physical-device-test-matrix.md)
- [ADR 0024: Mobile Beta Distribution](0024-mobile-beta-distribution.md)
- [ADR 0026: Solo-Owner, AI-Assisted Mobile Ownership](0026-solo-owner-ai-assisted-mobile-ownership.md)
- [ADR 0027: Kotlin Multiplatform Reconsideration Thresholds](0027-kotlin-multiplatform-reconsideration-thresholds.md)
