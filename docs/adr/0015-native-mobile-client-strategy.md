# ADR 0015: Native Mobile Client Strategy

## Status

Accepted

## Date

2026-08-06

---

# Context

The long-term player Companion targets iPhone, iPad, Android phones, and Android
tablets. It must support first-class tablet layouts and platform-sensitive
features including:

- passkeys and platform identity providers
- protected credential storage
- local service discovery and paired LAN certificate trust
- WebRTC media, audio routing, and interruption handling
- system and in-product capture indicators
- app-switcher protection and the strongest honest capture controls available
- foreground, background, and reconnection lifecycle behavior

The Companion remains a player-only surface. Host tools belong in web and
possible future desktop applications. The browser Companion remains a real
fallback for players, with capability limits documented where browsers cannot
provide the same LAN trust or device integration as installed applications.

ADR 0001 selected a standards-focused multi-platform direction but deliberately
left the mobile sharing strategy open. ADR 0004 separately selected Swift and
SwiftUI for the account-free, iOS-only local MVP. The project now needs a
long-term direction that preserves platform quality without prematurely adding
a cross-platform runtime or placing canonical scenario truth in clients.

# Decision

## Separate Native Applications

Guilty Party will build separate native player Companion applications:

- **iOS and iPadOS:** one Swift and SwiftUI application codebase with deliberate
  phone and tablet layouts. UIKit interoperability may be used where a required
  Apple platform capability is not adequately exposed through SwiftUI.
- **Android phones and tablets:** one Kotlin and Jetpack Compose application
  codebase with adaptive layouts. Android platform APIs and View
  interoperability may be used where required.

The applications must satisfy the same product, protocol, authorization,
privacy, accessibility, and deterministic-recovery contracts. They are not
required to have pixel-identical interfaces or to ignore platform conventions.
This decision does not require simultaneous implementation or release; Android
prototype timing and release parity remain separate decisions.

## Shared Contracts and Evidence, Not a Shared Runtime

The initial sharing boundary is language-neutral artifacts and behavior rather
than an in-process mobile runtime. The two native applications will share:

- versioned HTTP and WebSocket schemas and compatibility rules
- protocol examples, fixtures, and negative privacy tests
- authentication, authorization, reconnection, projection, and recovery
  acceptance suites
- deterministic scenario fixtures and server simulations
- product terminology, accessibility expectations, design tokens, and original
  project-owned assets where appropriate

Whether Swift and Kotlin transport models are generated from the canonical
schemas is decided separately under MC-NET-002.

The project will not initially use Flutter, React Native, Kotlin Multiplatform,
Compose Multiplatform UI, mobile WebAssembly, or another shared mobile runtime.
Kotlin Multiplatform may be reconsidered for proven, platform-independent
client logic after the project defines and reaches a measurable duplication or
delivery threshold under MC-ARCH-002. A shared UI framework would require a new
ADR.

## Platform Boundaries

Platform adapters own behavior that depends on the operating system, including:

- passkeys, provider sign-in, Keychain, and Android Keystore integration
- Bonjour or Android NSD discovery and application-controlled LAN trust
- native LiveKit/WebRTC SDK integration and audio-session or audio-route policy
- privacy surfaces, capture signals, permissions, and lifecycle transitions

Shared schemas or test fixtures do not move authorization policy or canonical
scenario truth into a client. The server remains authoritative, and each client
receives only its authorized projection.

## Other Surfaces

The browser Companion continues to use HTML, CSS, and JavaScript as an
individually authorized player fallback. The Host Console remains a web surface,
and Rust remains the server and deterministic scenario-engine language. A
possible desktop host application and embedded LAN server remain a separate
decision.

## Dependencies and Tooling

This ADR selects languages and native UI approaches, not specific third-party
libraries, generators, analytics products, or application architectures. Any
new dependency or SDK still requires the project's licensing, privacy, security,
maintenance, and removal review before adoption.

# Consequences

Positive:

- Platform security, media, networking, privacy, and accessibility capabilities
  can be integrated directly and tested against their real lifecycle behavior.
- iPad and Android tablet experiences can be designed deliberately rather than
  treated as enlarged phone layouts.
- Shared contracts and behavioral tests reduce semantic drift without making a
  cross-platform runtime part of the security boundary.
- The approach stays aligned with the native iOS MVP and preserves a clear path
  to an Android application.

Negative:

- The project will maintain two mobile build, test, signing, and release
  pipelines.
- Some presentation and client-state orchestration will be duplicated in Swift
  and Kotlin.
- Feature delivery may differ by platform unless a later release-parity policy
  requires synchronization.
- A small team must prioritize platform sequencing carefully.

# Alternatives Considered

## Flutter or Another Shared UI Runtime

Rejected initially. A single UI codebase could reduce presentation duplication,
but Guilty Party's authentication, local trust, media, audio, capture, and
lifecycle requirements would still require substantial native integration and
another runtime and dependency surface.

## Kotlin Multiplatform from the Start

Rejected initially. Sharing selected pure logic may become valuable, but the
project does not yet have measured duplication that justifies its build,
interoperability, debugging, and ownership costs. It remains an explicit
reconsideration path rather than a permanent prohibition.

## Web Application Wrapped as Both Installed Apps

Rejected. The browser Companion remains useful, but it cannot be assumed to
provide the same local trust, secure storage, media routing, privacy controls,
or operating-system integration as native clients.

## Shared Rust or WebAssembly Client Logic

Rejected initially. Rust remains appropriate for deterministic server logic,
but no current mobile requirement demonstrates enough benefit to justify a
foreign-function or WebAssembly boundary in both apps.

# References

- [SwiftUI](https://developer.apple.com/swiftui/)
- [Jetpack Compose](https://developer.android.com/compose)
- [Build adaptive apps with Compose](https://developer.android.com/develop/ui/compose/build-adaptive-apps)
- [Kotlin Multiplatform platform sharing](https://kotlinlang.org/docs/multiplatform/multiplatform-share-on-platforms.html)
- [Flutter platform channels](https://docs.flutter.dev/platform-integration/platform-channels)
- [LiveKit platform SDKs](https://docs.livekit.io/intro/basics/connect/)
