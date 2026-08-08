# Guilty Party iOS/iPadOS Companion MVP Setup

This document describes the committed native SwiftUI Companion for the
account-free Remote Friends private test. It replaces the earlier local-LAN
scaffold. The longer-term account, recovery, media, notification, and LAN
features remain outside this MVP.

The implementation follows the separate-native-client decision in
[ADR 0015](../adr/0015-native-mobile-client-strategy.md). It is one universal
iPhone and iPad application codebase with deliberate layouts for each form
factor.

## Project Configuration

- Project: `apps/mobile/GuiltyPartyCompanion.xcodeproj`
- Shared scheme and application target: `GuiltyPartyCompanion`
- Unit-test target: `GuiltyPartyCompanionTests`
- Product name: `GuiltyPartyCompanion`
- Development bundle identifier: `com.guiltyparty.companion`
- Minimum deployment target: iOS/iPadOS 18.0
- Marketing version: `0.1.1`
- Build number: `2`
- Swift language mode: Swift 6
- Supported device families: iPhone and iPad

The bundle identifier is a development identifier only. This project does not
create or imply an App Store Connect record or final store identity. The project
contains no development-team, provisioning-profile, device, or other
machine-specific signing selection.

## Contract Integration

The application target has an explicit source reference to:

`contracts/generated/control-plane/v1/swift/ControlPlaneV1.generated.swift`

The file remains owned by the first-party contract-generation workflow. Do not
copy generated DTOs into the app or edit the generated file by hand. Regenerate
and verify it from the repository root:

```sh
make generate-mobile-contracts
make check-mobile-contracts
```

The test target packages shared positive, negative, additive-field, numeric,
unknown-critical-variant, and privacy fixtures from `tests/contracts/v1/` as
explicit resources.

## Remote Friends Transport

The Companion accepts a complete `GP1.` invitation through a privacy-sensitive
paste/manual-entry field. The field is cleared before local decoding starts.
The decoder validates the prefix, bounded base64url payload, exact transfer
shape, generated invitation model, session identifier, gameplay language, and
expiry. The app never constructs an invitation URL.

Joining uses the fixed test endpoint:

```text
POST https://api.test.guiltyparty.app/api/v1/join
```

The native request sends `X-GP-Session-ID`, `Authorization: Pairing ...`, no
browser `Origin`, a participant endpoint with `private_display` and
`touch_input`, and this client-build record:

```json
{
  "application_id": "companion_ios",
  "application_version": "0.1.1",
  "build_number": 2
}
```

The returned bearer is retained only by the in-process session object. It is
not stored in UserDefaults, Keychain, files, pasteboards, logs, envelopes, or
URLs. The long-lived first-party `URLSessionWebSocketTask` connects to:

```text
wss://api.test.guiltyparty.app/ws/v1
```

The opening request supplies `Authorization: Bearer ...` and offers
`guiltyparty.control.v1`. The client continuously receives messages, supplements
the transport with control-frame pings, rejects an unexpected subprotocol or
critical variant, and applies only validated participant projections for the
issued session, endpoint, and participant.

Connection establishment uses the accepted ten-second transport deadline and a
five-second post-open deadline for the first authorized projection. Control-
plane v1 does not yet define a dedicated heartbeat envelope, so this bounded
MVP client pairs its 15-second control-frame ping with an authenticated
`get_projection` request. A valid recipient projection or other validated
server envelope refreshes authenticated activity. At 30 seconds without such
activity the app clears and shields private content while leaving the socket a
final recovery window; at 45 seconds it closes the connection and enters full-
jitter reconnect. Backoff resets only after 60 uninterrupted seconds with a
current private projection.

After every connection or reconnection the client asks for a complete fresh
projection. Private content and actions remain unavailable until that projection
passes protocol, context, recipient-boundary, portable-integer, and sequence
validation. The only submitted participant command is `cast_vote`; each command
uses unique message and endpoint-scoped idempotency identifiers plus the current
`primary_authority_generation`.

The v1 participant projection exposes a character name but does not expose a
vote-target character identifier. For this synthetic private-test slice, the
voting view accepts the target identifier supplied by the test coordinator. The
app does not infer identifiers or implement scenario truth; the server validates
the vote and remains canonical.

## Privacy and Lifecycle

The Companion maintains no persistent private gameplay cache and includes no
analytics, crash SDK, session replay, diagnostics uploader, or third-party
dependency. It does not request microphone, camera, media, local-network, or
notification permissions.

When the scene backgrounds or becomes inactive, connectivity becomes uncertain,
screen capture/recording/mirroring becomes active, access is revoked, or the
session ends, the app immediately:

- overlays an app-switcher privacy shield;
- logically discards the private projection;
- disables private actions;
- closes the retained socket where applicable; and
- requires a fresh authorized projection before revealing private content.

The app observes the scene capture trait introduced for current Apple platforms.
While capture is active, private UI and actions remain shielded. When capture
ends, reconnecting and a fresh projection are required. Apple reports screenshots
after they occur; the app therefore shows an honest local warning and does not
claim that a screenshot was prevented or deleted.

## Layout and Accessibility

Compact-width iPhone presentation uses a focused navigation-and-scroll flow.
Regular-width iPad presentation uses `NavigationSplitView`, keeping connection,
scene, language, and privacy controls in a sidebar while private character,
clue, voting, and outcome content occupies a bounded detail column.

Both layouts use semantic system colors and fonts, Dynamic Type, descriptive
VoiceOver labels and hints, minimum-contrast system materials, keyboard submit
actions, and text plus symbols for connection/privacy state. The MVP uses no
custom animation, so Reduce Motion does not lose information or control state.

## Build and Test

From the repository root, first run shared verification:

```sh
make test
make check-mobile-contracts
```

Discover locally installed simulator names with:

```sh
xcrun simctl list devices available
```

Then build and test the shared scheme on one iPhone and one iPad destination:

```sh
xcodebuild \
  -project apps/mobile/GuiltyPartyCompanion.xcodeproj \
  -scheme GuiltyPartyCompanion \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=SELECTED_IPHONE' \
  test

xcodebuild \
  -project apps/mobile/GuiltyPartyCompanion.xcodeproj \
  -scheme GuiltyPartyCompanion \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=SELECTED_IPAD' \
  test
```

Project-owned Swift warnings are treated as errors in Debug and Release. Use a
temporary DerivedData path when producing review evidence; never commit
DerivedData.

For a physical development device, choose a personal team locally in Xcode and
allow automatic signing only in local user settings. Do not commit a team ID,
profile, certificate choice, or device identifier. Developer Mode, trust,
unlock, and beta-device-support prompts require the device owner. A physical
iPad result cannot be inferred from simulator testing.

The dated implementation and verification evidence is recorded in
[iOS/iPadOS Companion MVP Test Record](ios-companion-mvp-test-record.md).

## Explicitly Unimplemented

This slice does not include Host Console behavior, accounts or passkeys,
provider authentication, recovery, notifications or Live Activities, Bonjour or
LAN transport, AirPlay, media or capture inputs, WebRTC, captions, recording,
transcription, AI Stage Manager behavior, analytics, persistent authority or
private content, third-party libraries/assets, server configuration, TestFlight,
or App Store submission.
