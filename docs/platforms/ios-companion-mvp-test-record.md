# iOS/iPadOS Companion MVP Test Record

## Record Metadata

- Date: 2026-08-07 (Pacific/Honolulu)
- Branch: `feature/ios-companion-mvp`
- Target branch: `dev`
- Product: `GuiltyPartyCompanion` 0.1.0 (1)
- Minimum OS: iOS/iPadOS 18.0
- Host: macOS 26.6 Tahoe
- IDE: Xcode 26.6 (17F113)
- Installed simulator runtime: iOS 26.5
- Physical device available: iPhone 12 Pro Max on iOS 27 developer beta
- Physical iPad available: none

This record covers only the account-free Remote Friends Companion slice. It
contains no invitation, authority, player name, private objective, clue, vote,
device identifier, or signing-team identifier.

## Automated Verification

| Check | Destination/configuration | Result |
| --- | --- | --- |
| `make test` | repository host | Passed: contract checks, 66 Remote Friends tests, scenario parity, and all Rust unit/doc tests |
| `make check-mobile-contracts` | repository host | Passed: deterministic outputs match; Swift and Kotlin fixture suites each passed 28 cases |
| App build | generic iOS Simulator, Debug | Passed; first-party Swift compiled with warnings-as-errors |
| XCTest | iPhone 17 Pro, iOS 26.5 simulator, Debug | Passed: 30 tests after connection-health remediation |
| XCTest | iPad Pro 13-inch (M5), iOS 26.5 simulator, Debug | Passed: 30 tests after connection-health remediation |
| App build | iPhone 17 Pro, iOS 26.5 simulator, Release | Passed |
| App build | iPad Pro 13-inch (M5), iOS 26.5 simulator, Release | Passed |
| Launch/layout inspection | iPhone 17 Pro and iPad Pro 13-inch (M5) simulators | Passed for the account-free join flow |
| Test service health | `https://api.test.guiltyparty.app/health` | Passed: reported the test-gated Remote Friends profile |
| Physical iPhone build/install/launch | iPhone 12 Pro Max on iOS 27 developer beta | Passed: compatible development services mounted, signed app installed, launch succeeded, and the process remained running |
| XCTest | iPhone 12 Pro Max on iOS 27 developer beta, Debug | Passed: 23 tests |

Physical validation initially reported a missing interface-orientation
declaration for a non-full-screen universal target. Debug and Release now
declare all four orientations; the clean physical rebuild completed without
that warning.

The physical-device result predates the independent review remediation that
added WebSocket failure reporting, long-lived transport timeouts, redirect
rejection, connection-health deadlines, stable-connectivity backoff reset, and
native CI execution. No new physical-device result is claimed for those
follow-up changes.

The XCTest suite covers GP1 acceptance/rejection, generated-model JSON
round trips, shared positive and negative fixtures, additive fields, unknown
critical variants, portable numeric limits, privacy fixtures, participant
recipient boundaries, connection states, stale sockets, sequence regression,
idempotency, request credential placement, redirect rejection, distinct HTTP
and long-lived WebSocket timeouts, failed-handshake reporting, negotiation and
authenticated-activity deadlines, reconnect backoff, background/capture
clearing, and the fresh-projection reconnect gate.

## Layout Review

- iPhone: compact, focused `NavigationStack` flow with scrollable status,
  character, clues, voting, and outcome regions.
- iPad: regular-width `NavigationSplitView` with persistent connection/scene/
  language/privacy context and a bounded private detail column.
- Accessibility inspection: semantic Dynamic Type fonts, system contrast,
  VoiceOver labels/hints, text-and-symbol state communication, keyboard submit
  actions, and no information-bearing custom motion.

## Lifecycle, Capture, and Privacy Checks

| Scenario | Expected and implemented behavior | Evidence status |
| --- | --- | --- |
| Background, lock, or inactive scene | Immediate app-switcher shield, projection discarded, actions disabled | Unit covered; source inspected |
| Connection uncertainty | At 30 seconds without authenticated activity the projection is discarded and actions are disabled; at 45 seconds the socket closes and reconnect begins | Unit covered; live timing check pending |
| Reconnection | Full authorized projection required before reveal | Unit covered |
| Screen recording or mirroring | Capture trait shields content and disables actions until capture ends and a fresh projection arrives | Unit covered; source inspected; live private projection unavailable |
| Screenshot | Honest post-capture warning; no prevention/deletion claim | Source inspected; live private projection unavailable |
| Revocation or session end | Authority and projection discarded; no private actions | Unit covered; live synthetic check pending availability of an authorized invitation |
| Persistence review | No UserDefaults, Keychain, file cache, logs, analytics, or diagnostics upload | Source inspection passed |

## Generated Contract and Dependency Evidence

- The Xcode application target compiles the committed generated Swift file via
  an explicit project source reference to
  `contracts/generated/control-plane/v1/swift/ControlPlaneV1.generated.swift`.
- Generated DTOs were not copied or hand-edited.
- Shared contract fixtures are explicit test-target resources.
- No Swift Package, CocoaPod, binary, SDK, font, media, or third-party asset was
  added. UI visuals use Apple SF Symbols and code-native SwiftUI styling.
- License, ownership, and proprietary-product wording were not changed.

## Limitations and Required Owner Interaction

- The current v1 participant projection does not include vote-target character
  identifiers. The synthetic test UI accepts an identifier supplied by the test
  coordinator; canonical validation remains server-side.
- Physical signing used the owner's existing local Apple Development account
  only through command-line build overrides. No development team, profile,
  certificate, or device identifier is stored in the project or committed.
- There is no physical iPad, so this record will include simulator evidence only
  for iPadOS and will not claim physical-iPad evidence.
- A live synthetic join requires an active GP1 invitation issued through the
  authorized Host flow. No credential is sourced from logs, environment dumps,
  pasteboard inspection, or repository content.
