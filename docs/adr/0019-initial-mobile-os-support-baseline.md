# ADR 0019: Initial Mobile OS Support Baseline

## Status

Accepted

## Date

2026-08-06

---

# Context

The player Companion requires passkeys, protected storage, local service
discovery and trust, WebRTC media, adaptive phone and tablet layouts, capture
protection, permissions, and reliable lifecycle handling. Supporting very old
operating systems would increase compatibility branches, physical-device
coverage, and privacy risk for a small team. Setting the minimum to only the
newest release would unnecessarily exclude otherwise capable devices.

Deployment minimums are distinct from the SDK versions used to build and submit
an application. At this decision date, Apple requires App Store submissions to
use Xcode 26 and the iOS/iPadOS 26 SDKs, while Google Play's announced August
31, 2026 requirement is target API 36 for new Android applications and updates.
Those store target requirements can advance without automatically changing the
oldest OS on which an application runs.

# Decision

## Initial Deployment Minimums

The first supported Companion product targets:

- **iOS 18.0 or later** on iPhone
- **iPadOS 18.0 or later** on iPad
- **Android 13 / API level 33 or later** on Android phones and tablets

Phone and tablet applications use the same platform minimum. A supported OS
version does not imply that every device has every optional capability. Runtime
capability advertisement, preflight, and the approved safe-degradation policy
still apply.

These minimums apply to the supported product and beta program. They do not add
Android to the current iOS-only MVP or require the synthetic local prototype to
implement production accounts, media, or distribution.

## Build and Target Baseline

At the time of this decision:

- Apple release builds use Xcode 26 or later and an iOS/iPadOS 26 SDK or later,
  as required for App Store submission, while retaining an 18.0 deployment
  target.
- Android release builds compile against and target API level 36 or later as
  required by the applicable Google Play submission deadline, while retaining
  `minSdk` 33.

Build and target SDKs track the latest stable store requirements through normal
maintenance. Preview SDKs are not production release targets. They are used in
advance testing when upcoming behavior materially affects Guilty Party.

In particular, Android 17/API 37 testing begins before target adoption because
its local-network protection changes affect direct LAN connections and NSD.
Adopting a new target SDK requires testing its permission, background,
large-screen, security, and networking behavior rather than changing a number
only to satisfy submission validation.

## Evidence and Review Policy

The project reviews deployment minimums at least annually and before the first
public beta. A review considers:

- required platform security and privacy behavior
- operating-system and vendor security support
- required first- and third-party SDK support
- aggregate App Store and Play reach information
- support requests and compatibility defects
- device-matrix and maintenance cost
- whether the affected audience has a safe browser or alternate-device path

The project uses aggregate store, support, and compatibility evidence for this
decision and does not add behavioral tracking merely to measure OS adoption.

Raising a minimum requires a documented compatibility and user-impact review.
An older version may receive a time-bounded extension when audience evidence
justifies it, but only if authentication, transport security, secrecy, capture
behavior, media routing, accessibility, and required dependencies remain
supportable without a weaker mode. An extension never permits a security or
privacy downgrade.

## Testing Policy

Before a supported release, each platform tests at least:

- the deployment-minimum major version
- the latest stable major version
- the next preview or beta when it contains relevant compatibility changes

The physical-device matrix, representative models, intermediate OS coverage,
and exact network and media routes remain MC-DEL-002.

# Consequences

Positive:

- The project has a concrete, bounded compatibility surface for implementation
  and device planning.
- iOS 18 retains support for devices including iPhone XS, XR, and second-
  generation iPhone SE while avoiding older OS branches.
- Android API 33 supports the required passkey floor with margin and limits the
  number of permission, background, and adaptive-layout generations requiring
  full support.
- Current build SDKs can advance independently of deployment minimums.

Negative:

- Users who cannot update to iOS/iPadOS 18 or Android 13 need the browser
  fallback or another supported personal endpoint.
- Android hardware and vendor differences remain significant even within the
  selected OS range.
- Annual review, preview testing, and minimum-version physical devices add
  maintenance work.
- Raising a minimum later requires communication and compatibility planning.

# Alternatives Considered

## Support Every Version That Provides Passkeys

Rejected. Android passkeys reach API 28, but authentication availability alone
does not bound the networking, media, permission, privacy, adaptive-layout, and
maintenance surface of the full Companion.

## Require Only the Latest OS Major

Rejected. It would exclude capable hardware and users without a demonstrated
product or security need.

## Use Different Phone and Tablet Minimums

Rejected initially. First-class tablet layouts require deliberate design and
testing, not a separate older compatibility branch. A future hardware or
platform requirement may justify revisiting this.

## Never Raise the Minimum

Rejected. Store requirements, security support, dependencies, and platform
behavior change over time.

# References

- [Apple App Store submission requirements](https://developer.apple.com/news/upcoming-requirements/)
- [Apple iOS and iPadOS usage](https://developer.apple.com/support/app-store/)
- [Apple iOS 18 device compatibility](https://support.apple.com/en-us/104985)
- [Android passkey compatibility](https://developer.android.com/identity/passkeys)
- [Google Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk)
- [Android local-network permission](https://developer.android.com/privacy-and-security/local-network-permission)
- [Android adaptive application guidance](https://developer.android.com/develop/ui/compose/build-adaptive-apps)
