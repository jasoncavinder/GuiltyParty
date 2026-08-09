# iOS/iPadOS Companion MVP Test Record

## Record Metadata

- Date: 2026-08-07 through 2026-08-08 (Pacific/Honolulu)
- Branch: `feature/ios-companion-mvp`
- Target branch: `dev`
- Initial product: `GuiltyPartyCompanion` 0.1.0 (1)
- Post-remediation product: `GuiltyPartyCompanion` 0.1.1 (2)
- Resumption-checkpoint product: `GuiltyPartyCompanion` 0.2.0 (3)
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

## 2026-08-08 Remediation and Live Rehearsal

- Branch: `bugfix/native-companion-rehearsal`
- Physical destination: iPhone 12 Pro Max on iOS 27 developer beta
- Tablet destination: iPad Pro 13-inch (M5), iOS 26.5 simulator
- Packaged public display: LG 65NANO85UNA on webOS 5.6.2-21
- Remote surfaces: deployed Browser Host and Cloudflare Remote Friends service

The first live native join exposed two defects. The Companion encoded JSON
control messages as WebSocket binary frames while the server intentionally
accepts text frames only. The iPad simulator also produced repeatable UIKit
keyboard/autocorrection crashes when the focused invitation `SecureField` was
cleared and replaced during the join transition. The remediation sends only
UTF-8 text control frames, rejects non-UTF-8 payloads, resigns sensitive field
focus before replacing the join view, yields one main-actor turn for keyboard
removal, and prevents duplicate join submission while the request is pending.

Verification after remediation:

| Check | Destination/configuration | Result |
| --- | --- | --- |
| XCTest | iPhone 12 Pro Max, iOS 27 developer beta | Passed: 31 tests |
| XCTest | iPhone simulator | Passed: 31 tests |
| XCTest | iPad Pro 13-inch (M5), iOS 26.5 simulator | Passed: 31 tests |
| `make test` | repository host | Passed: contract checks, 69 Remote Friends tests, native/WebAssembly parity, and all Rust unit/doc tests |
| `make check-mobile-contracts` | repository host | Passed: Swift and Kotlin fixture suites each passed 28 cases |
| `make check-cloudflare` | repository host | Passed: scenario parity and Wrangler dry-run |

One physical Companion and one simulated tablet Companion then joined a fresh
synthetic session as distinct participants. The Browser Host, packaged LG
Stage, and both Companions completed assignment, two scenes, a public clue, a
recipient-authorized private clue, voting, aggregate vote display, and the
expected deterministic outcome. Each Companion received only its own objective
and authorized clues; the Stage received neither private objective, the private
clue, nor individual vote choices. Backgrounding and foregrounding both native
destinations hid private content, recovered a fresh projection, and restored
the completed session without a crash.

The rehearsal also exposed a server fan-out defect: admission did not notify
already-connected endpoints, and one stale socket could terminate a projection
broadcast before later recipients. The live Stage recovered through its
fresh-ticket reconnect path. This branch schedules projection broadcast after
successful admission and isolates each socket delivery so a failed endpoint
cannot starve another recipient. Those server changes passed local tests and a
Cloudflare dry-run but were not deployed during this rehearsal.

No invitation, authority, operator proof, WebSocket ticket, participant alias,
private scenario text, device identifier, or signing-team identifier is
recorded here. The iPad result remains simulator evidence; no physical-iPad
claim is made.

The post-PR #32 physical rehearsal later exposed an iPad-simulator freeze while
the Companion awaited a WebSocket ping. A read-only process sample showed
`FirstPartyWebSocket.ping()` attempting to resume the same checked continuation
again from the URL-session completion path. Xcode stopped on the resulting
runtime assertion, which also stopped UI actions and privacy timers. Companion
`0.1.1 (2)` gates that completion atomically so only its first invocation may
resume the continuation.

After PR #33 merged, exact merged `dev` source at `697e540` was built and
installed on the physical iPhone and the iPad (A16), iOS 26.5 simulator. Both
Companions joined a fresh synthetic session with the Browser Host and packaged
LG Stage. After more than 60 seconds of steady connectivity—at least four
15-second ping intervals—the iPad privacy-view control still responded
immediately. Ending the session then cleared private content and reported the
ended state on both Companions; the Host and Stage also reported the end, and
the iPad remained responsive. This closes the observed duplicate-completion
freeze and live session-end privacy check. It does not establish persistent
participant identity or automatic recovery after application termination.

After participant-resumption support and the repository relocations merged,
exact reviewed `dev` source at
`af43fa47ac956e967d361698d41b4144ae01eae4` was deployed as Cloudflare Worker
version `1aecea5a-e07b-4f61-97ad-b9da1da6ece1`. Companion 0.2.0 (3) was built
from that source for the physical iPhone and iPad (A16), iOS 26.5 simulator.
Both joined a fresh session as distinct participants and received separate
assignments and authorized private projections.

Terminating and relaunching the physical iPhone without its invitation restored
the same participant and endpoint with a fresh private projection and no
duplicate roster entry. Repeating termination immediately after one vote kept
the Host total at exactly one and reconciled the pending action without a
second submission. The iPad cast the other vote; the resulting one-to-one tie
deterministically produced no public outcome. After explicit session end, both
applications cleared private content, and neither could restore that content
or reuse the ended session after relaunch.

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
| Repeated WebSocket ping | A completion callback may settle each async ping only once | Unit covered; live steady-connection check passed across at least four ping intervals on physical iPhone and iPad simulator |
| Reconnection | Full authorized projection required before reveal | Unit covered |
| Screen recording or mirroring | Capture trait shields content and disables actions until capture ends and a fresh projection arrives | Unit covered; source inspected; live private projection unavailable |
| Screenshot | Honest post-capture warning; no prevention/deletion claim | Source inspected; live private projection unavailable |
| Revocation or session end | Authority and projection discarded; no private actions | Unit covered; live synthetic session-end check passed on physical iPhone and iPad simulator |
| Persistence review | No private gameplay cache, UserDefaults authority, logs, analytics, or diagnostics upload; only a device-only Keychain resume credential and minimum opaque metadata persist | Source inspection and unit coverage passed; physical restart and post-end invalidation passed; backup/transfer behavior not physically exercised |
| Application restart | Rotate endpoint-bound resume authority, preserve participant and endpoint, resolve pending idempotency IDs, and require a fresh projection | Contract, Worker, Durable Object, and native unit coverage passed; deployed physical-iPhone exercise passed with iPad-simulator peer |

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
- Short-lived participant access authority remains memory-only. Companion
  `0.2.0 (3)` adds an endpoint-bound rotating resume credential and minimum
  opaque resumption metadata in device-only, non-synchronizing Keychain
  storage. Automated contract, server, and native tests and the deployed
  physical-iPhone restart exercise cover the candidate. The duplicate-
  participant defect is closed for automatic same-installation resumption in
  this tested configuration. Android application work remains blocked until
  the owner explicitly accepts the checkpoint in
  `android-entry-checkpoint-evidence.md`.
