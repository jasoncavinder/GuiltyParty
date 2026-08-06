# ADR 0023: Physical-Device Test Matrix

## Status

Accepted

## Date

2026-08-06

---

# Context

The native Companions are first-class phone and tablet experiences and interact
with operating-system authentication, secure storage, LAN discovery, camera
pairing, screen-capture protection, audio routes, Bluetooth, app lifecycle,
accessibility services, and public Stage endpoints. Simulators and emulators
are valuable for fast, repeatable coverage, but they cannot prove all behavior
that depends on physical radios, microphones, speakers, secure hardware,
operating-system composition, or a real room.

Guilty Party is currently a small project and cannot own every device. The
matrix therefore needs risk-based tiers, clear physical-only requirements, a
compact core lab, and broader supplemental coverage without making every pull
request wait on every device.

# Decision

## Coverage Tiers

Testing uses four complementary tiers:

1. **Automated and virtual coverage:** every applicable pull request runs
   deterministic engine, contract, authorization, projection-secrecy, native
   unit, UI, and lifecycle-state tests. Simulators and emulators cover phone and
   tablet layouts, orientation, supported OS versions, locales, text sizes,
   error states, and repeatable network conditions.
2. **Targeted physical coverage:** a change that touches native authentication,
   protected storage, local-network discovery, camera or microphone permission,
   screen-capture protection, media, Bluetooth, AirPlay, backgrounding,
   endpoint transfer, accessibility integration, or performance is exercised
   on representative affected hardware before merge or is explicitly recorded
   as awaiting hardware validation.
3. **Core-lab smoke coverage:** while mobile work is active, the available core
   physical pool receives a regular smoke pass at least weekly and after a
   material SDK, OS, networking, media, or security change.
4. **Beta and release qualification:** a release candidate passes the complete
   accessible physical matrix, supplemental model and OS coverage, required
   room arrangements, and all privacy-critical physical-only cases. An unmet
   required cell blocks the affected feature or platform claim unless a human
   explicitly narrows the release scope.

Virtual coverage may establish logic, schema, layout, and state-machine
behavior. It does not substitute for physical proof of a hardware, radio,
secure-storage, capture, acoustic, LAN-permission, or platform-compositor claim.

## Core Physical Mobile Pool

The target core pool consists of these coverage roles. A device may fill more
than one role only when its actual OS, form factor, performance class, and
vendor behavior satisfy each role.

| Platform | Required physical role |
| --- | --- |
| iPhone | A supported device retained on the minimum iOS 18 baseline |
| iPhone | A representative standard-size device on the latest stable iOS |
| iPad | An entry-level or constrained supported iPad on the minimum iPadOS 18 baseline |
| iPad | A current representative iPad on the latest stable iPadOS, with a materially different screen class when practical |
| Android phone | A Google-reference or comparable device retained on Android 13/API 33 |
| Android phone | A current Google-reference device on the latest stable Android |
| Android phone | A current Samsung midrange device representing a major non-Google OEM skin and lifecycle |
| Android tablet | A representative supported tablet, initially favoring a widely deployed Samsung or comparable implementation |

The pool may be owned, borrowed, rented, or accessed through an approved device
lab, but local-LAN, multi-endpoint room, acoustic, AirPlay, screen-capture, and
hands-on accessibility tests require hardware that can participate in the
actual test environment. Cloud devices supplement rather than replace that
local pool.

An upcoming developer beta or preview receives targeted compatibility coverage
under ADR 0019. It does not satisfy either the minimum-supported or latest-
stable release cell. Devices on a preview OS are never the only physical
coverage for a supported form factor.

Exact consumer models are maintained in the living
[Mobile Test Matrix](../platforms/mobile-test-matrix.md), not frozen in this
ADR. Coverage is reviewed at least annually, before public beta, when OS floors
change, and when field evidence identifies a material vendor or hardware gap.

## Required OS and Form-Factor Coverage

Release qualification includes:

- minimum supported iOS, iPadOS, and Android versions
- latest stable iOS, iPadOS, and Android versions
- the relevant next Apple and Android preview for compatibility evidence, not
  as a supported release environment
- phone and first-class tablet layouts on both mobile platforms
- portrait and landscape where the surface permits them
- constrained and large screens, default and large text, light and dark
  appearance, and reduced-motion settings

Intermediate supported OS versions and additional models use virtual, cloud,
borrowed, or external-beta coverage according to risk. A defect cluster adds a
temporary or permanent matrix cell rather than relying on market-share
assumptions alone.

## Physical-Only Verification

The following claims require real hardware on every affected platform and form
factor before release:

- passkeys, provider sign-in handoff, trusted-endpoint recovery, Keychain or
  Keystore behavior, biometric gating, and process or device restart
- QR camera flow, Bonjour or Android NSD, local-network permission grant,
  denial and revocation, paired TLS identity, and isolated-LAN reachability
- app-switcher shielding, Android secure-window behavior, iOS recording or
  mirroring response, and a separately authorized AirPlay Stage route
- microphone permission and indicators, room-microphone leases, push-to-talk,
  Stage ducking, echo behavior, and break-before-make handoff
- built-in speaker, wired output where supported, classic or LE Bluetooth
  routes as applicable, multipoint or automatic switching, calls, audio-focus
  loss, backgrounding, screen lock, and media-service reset
- phone-to-tablet endpoint transfer during an active session
- VoiceOver, TalkBack, hardware keyboard or switch-access paths where supported,
  Dynamic Type or font scaling, and accessible capture controls
- thermal, memory, battery, radio, and rendering behavior where it can affect
  a session or expose stale private content

Synthetic accounts, scenarios, media, and participant data are used for all
test environments unless a separately approved test plan permits otherwise.

## Network and Room Matrix

Release qualification covers at least:

- official remote service over ordinary Wi-Fi
- an isolated LAN with the supported local Guilty Party server and no internet
- brief network loss and recovery, server restart, Wi-Fi change, and endpoint
  reauthorization
- local permission denial, later grant, revocation, and router client-isolation
  failure
- one physical room with a Stage and at least two separate private Companions
- a split route using a Companion microphone and Stage speaker with required
  push-to-talk and acknowledged ducking
- an explicitly selected shared room microphone with separate Companions
- at least two physical rooms to verify logical mix-minus and audience routing
- phone-to-tablet replacement during an active session
- browser Companion fallback without using a shared Stage as the private
  endpoint

Network impairment may be simulated for repeatability, but LAN discovery,
permission, paired server identity, actual endpoint transfer, and acoustic-room
claims require physical endpoints on the real route.

## Supplemental Device Services and External Coverage

An approved cloud device service may broaden model, vendor, OS, locale, and
screen coverage and may run native automated tests. Adoption requires the
normal dependency, licensing, privacy, account, artifact-retention, and access
review. Uploaded builds and test artifacts contain synthetic data and no
production credentials, private scenario content, participant communications,
or retained authentication secrets.

External beta coverage may identify additional devices and defects, but it is
not a substitute for the known core physical matrix. Beta cohort, feedback,
artifact, and expiry policy remains MC-DEL-003.

## Evidence and Exceptions

Each qualifying run records the application build, contract version, scenario
fixture version, device coverage role, hardware model, OS version, relevant
route and network class, result, and issue reference. It does not collect raw
private media, account secrets, unnecessary device identifiers, unrelated
device activity, or behavioral analytics.

A pull request may merge with a clearly marked physical check pending only when
the unverified behavior is not enabled for users and the affected release gate
remains closed. A release exception names the exact unsupported or disabled
scope, rationale, owner, and expiry; it does not silently relabel virtual
coverage as physical proof.

# Consequences

Positive:

- Privacy-, media-, LAN-, and lifecycle-sensitive behavior receives real-
  hardware proof.
- Fast virtual coverage remains available on ordinary pull requests.
- Phone and tablet support is explicit on both mobile platforms.
- A small team can grow the lab over time without pretending to own every
  device.
- A living inventory exposes gaps and prevents preview hardware from being
  mistaken for stable release coverage.

Negative:

- The complete target pool requires acquiring or arranging access to several
  devices over time.
- Minimum-version Apple hardware is difficult to recreate after it has been
  upgraded and therefore requires deliberate retention.
- Room, Bluetooth, AirPlay, capture, and interruption testing is partly manual.
- Cloud and external-beta services introduce separate privacy, licensing,
  access, and artifact-lifecycle work.
- Release qualification takes longer than simulator-only testing.

# Alternatives Considered

## Test Only on the Developer's Current Phone

Rejected because one preview phone cannot represent minimum and stable OS
behavior, tablets, Android vendors, LAN permissions, or the supported room
matrix.

## Require the Full Matrix on Every Pull Request

Rejected because it would create disproportionate latency for documentation,
server-only, and low-risk changes while providing little additional evidence.

## Use Only Simulators, Emulators, and Cloud Devices

Rejected because several required privacy, local-network, secure-hardware,
audio, Bluetooth, AirPlay, accessibility, and physical-room behaviors cannot be
proven faithfully outside the local hardware arrangement.

## Permanently Name Specific Consumer Models in the ADR

Rejected because model availability and relevance change. Stable coverage
roles belong in the ADR; exact inventory belongs in a maintained platform
document.

# References

- [Apple: Running on simulated or physical devices](https://developer.apple.com/documentation/xcode/running-your-app-on-simulated-or-physical-devices)
- [Firebase Test Lab](https://firebase.google.com/docs/test-lab)
- [Firebase Test Lab virtual-device limitations](https://firebase.google.com/docs/test-lab/android/avds)
- [ADR 0009: Connection and Resumption Policy](0009-connection-resumption-policy.md)
- [ADR 0011: Room Audio Processing Ownership](0011-room-audio-processing-ownership.md)
- [ADR 0015: Native Mobile Client Strategy](0015-native-mobile-client-strategy.md)
- [ADR 0019: Initial Mobile OS Support Baseline](0019-initial-mobile-os-support-baseline.md)
- [ADR 0020: Android LAN Discovery and Permission UX](0020-android-lan-discovery-and-permission-ux.md)
- [ADR 0021: Mobile Screen Capture and Stage Casting](0021-mobile-screen-capture-and-stage-casting.md)
- [ADR 0022: Mobile Audio Route and Interruption Policy](0022-mobile-audio-route-and-interruption-policy.md)
