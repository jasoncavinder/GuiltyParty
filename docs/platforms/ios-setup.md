# Guilty Party iOS/iPadOS Companion MVP Setup

This document describes the committed native SwiftUI Companion for the
account-free Remote Friends private test. It replaces the earlier local-LAN
scaffold. Endpoint-bound gameplay-session recovery is included; longer-term
account recovery, media, notification, and LAN features remain outside this
MVP.

The implementation follows the separate-native-client decision in
[ADR 0015](../adr/0015-native-mobile-client-strategy.md). It is one universal
iPhone and iPad application codebase with deliberate layouts for each form
factor.

## Project Configuration

- Project: `apps/mobile/iOS/GuiltyPartyCompanion.xcodeproj`
- Shared scheme and application target: `GuiltyPartyCompanion`
- Unit-test target: `GuiltyPartyCompanionTests`
- Internal Xcode product name: `GuiltyPartyCompanion`
- Public display and future store-listing name: `Guilty Party`
- Durable application identifier: `app.guiltyparty.companion`
- Minimum deployment target: iOS/iPadOS 18.0
- Marketing version: `0.3.0`
- Build number: `4`
- Swift language mode: Swift 6
- Supported device families: iPhone and iPad

The project owner approved this durable store identity on 2026-08-09. This
repository decision does not create an App Store Connect record, register the
identifier with Apple, or select a signing team. The project contains no
development-team, provisioning-profile, device, or other machine-specific
signing selection.

An installed build using the former development bundle identifier remains a
separate application and Keychain access group. Remove it explicitly when no
longer needed. The project does not migrate a resume credential or private
state from the pre-store identity.

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
unknown-critical-variant, compatibility, participant-voting-state, and privacy
fixtures from `tests/contracts/v1/` as explicit resources.

## Remote Friends Transport

The Companion accepts a complete `GP1.` invitation through a privacy-sensitive
paste/manual-entry field. The field is cleared before local decoding starts.
The decoder validates the prefix, bounded base64url payload, exact transfer
shape, generated invitation model, session identifier, gameplay language, and
expiry. The app never constructs an invitation URL.

Before a fresh join, the app performs an unauthenticated, no-store compatibility
check against:

```text
GET https://api.test.guiltyparty.app/api/protocol
```

The current build requires preferred protocol `1.1` and the additive
`participant_vote_targets_v1` feature. It then joins through the fixed test
endpoint:

```text
POST https://api.test.guiltyparty.app/api/v1/join
```

The native request sends `X-GP-Session-ID`, `Authorization: Pairing ...`, no
browser `Origin`, a participant endpoint with `private_display` and
`touch_input`, advertises `participant_vote_targets_v1`, negotiates protocol
`1.1`, and supplies this client-build record:

```json
{
  "application_id": "companion_ios",
  "application_version": "0.3.0",
  "build_number": 4
}
```

The returned access bearer is retained only by the in-process session object.
It is not stored in UserDefaults, Keychain, files, pasteboards, logs,
envelopes, or URLs. Native admission separately returns an opaque
endpoint-bound resume credential. The app stores that value and only the
minimum opaque resumption metadata in a non-synchronizing
`kSecAttrAccessibleWhenUnlockedThisDeviceOnly` Keychain item. No projection,
clue, objective, vote, action payload, or display name is stored there.
The negotiated protocol version is stored as non-secret recovery metadata.
Credentials written by earlier builds do not contain that field and therefore
resume as protocol `1.0`; they are never silently upgraded. A fresh invitation
is required to obtain direct participant voting.

After an app restart or expired in-memory access bearer, the Companion sends:

```text
POST https://api.test.guiltyparty.app/api/v1/resume
Authorization: Resume <device-only credential>
X-GP-Replacement-Resume: <staged device-only replacement>
```

Both resume credentials are absent from the URL and JSON body. Before sending,
the app generates and durably stages the replacement in the same device-only
Keychain record. An exact retry reuses that staged value, allowing a lost
response or interrupted Keychain update to complete without revoking the
endpoint; a different replacement for a consumed credential still fails
closed. The request includes the same participant and endpoint identifiers,
authority generation, last accepted server sequence, and unresolved
idempotency identifiers. A successful response confirms the staged credential
and rotates the access generation. All private content remains covered until a
full, fresh recipient-specific projection passes validation. Expiry,
revocation, session end, protocol failure, or an explicit manual rejoin clears
the local resume record.

The long-lived first-party `URLSessionWebSocketTask` connects to:

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

For protocol `1.1`, the server supplies a lifecycle state and the exact
participant-authorized vote targets. The app displays character names, retains
identifiers only as opaque action values, and submits only a current projected
choice. Targets are absent before voting opens, after this participant votes,
and after voting closes. Protocol `1.0` recovery remains read-only for voting;
the app does not infer identifiers or implement scenario truth. The server
validates every vote and remains canonical.

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

Compact-width iPhone presentation uses one focused navigation-and-scroll flow.
Regular-width iPad presentation uses `NavigationSplitView`, keeping connection,
scene, human-readable session language, and privacy controls in a context rail
while private character, objective, clue, voting, and outcome content occupies
a bounded primary column. Accessibility Dynamic Type sizes collapse the tablet
to the single-column order rather than compressing either column.

Both layouts adapt the approved Refined Case File language with semantic native
colors, system serif/display and body roles, Dynamic Type, descriptive VoiceOver
labels and hints, keyboard submit actions, and text plus symbols for
connection/privacy state. A device-local, non-secret appearance preference lets
the player follow the system or select light or dark presentation. Player copy
is localization-catalog ready, while server-authored scenario content continues
to use the session's advertised BCP 47 gameplay language. The MVP uses no custom
animation, so Reduce Motion does not lose information or control state.

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
  -project apps/mobile/iOS/GuiltyPartyCompanion.xcodeproj \
  -scheme GuiltyPartyCompanion \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=SELECTED_IPHONE' \
  test

xcodebuild \
  -project apps/mobile/iOS/GuiltyPartyCompanion.xcodeproj \
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
provider authentication, account recovery, notifications or Live Activities, Bonjour or
LAN transport, AirPlay, media or capture inputs, WebRTC, captions, recording,
transcription, AI Stage Manager behavior, analytics, long-lived account
authority, persistent private content beyond the bounded device-only resume
credential, third-party libraries/assets, translated interface catalogs,
server configuration, TestFlight, or App Store submission.
