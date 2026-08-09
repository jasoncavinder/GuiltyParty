# Guilty Party Android Companion

This directory contains the bounded native Android player Companion described
by [ADR 0017](../../../docs/adr/0017-android-prototype-entry-checkpoint.md).
It is one Kotlin and Jetpack Compose application with deliberate compact-phone
and expanded-tablet layouts. It is not a Host Console, production account app,
or store-ready release.

## Baseline

- application ID: `com.guiltyparty.companion`
- debug application ID: `com.guiltyparty.companion.debug`
- version: `0.1.0` (1)
- minimum Android: Android 13/API 33
- compile and target SDK: API 36
- Java bytecode level: 17
- Gradle Wrapper: 9.4.1 with a pinned distribution checksum
- Android Gradle Plugin: 9.2.1
- UI: Kotlin 2.3.21 and Jetpack Compose BOM 2026.06.00
- transport: OkHttp 5.3.0 over HTTPS/WSS

The exact approved dependency intake and resolved behavior are recorded in
[`docs/legal/third-party-components.md`](../../../docs/legal/third-party-components.md).
Do not add or change a dependency without following ADR 0025 and receiving
explicit owner approval.

## Contract Integration

The application source set directly includes the first-party generated Kotlin
models at:

```text
contracts/generated/control-plane/v1/kotlin/ControlPlaneV1.generated.kt
```

Do not copy or edit that file. From the repository root, verify the canonical
schema, fixtures, generator, Swift output, and Kotlin output with:

```sh
make check-mobile-contracts
```

The Android adapters use the generated models only at the transport boundary.
Handwritten domain and UI types do not own authorization, secrecy, scenario
truth, or outcome logic.

## Build

Open `apps/mobile/android/` in Android Studio, or use the committed Wrapper. The
first online dependency hydration must use only the repositories in
`settings.gradle.kts`; subsequent review builds are offline and use strict
dependency verification:

```sh
make build-android
make check-android
```

`check-android` builds debug, unsigned release, and instrumented-test APKs, runs
local tests, and runs Android lint. Dependency versions are committed in
`app/gradle.lockfile`; artifact checksums are committed in
`gradle/verification-metadata.xml`.

Pull requests run the same build, lint, and local-test gate on GitHub's Android-
equipped Ubuntu runner. Device tests remain local because the current workflow
does not start an emulator.

Build products remain ignored under `app/build/`. Never commit an APK, Android
Studio workspace state, SDK path, signing key, certificate, device identifier,
invitation, operator proof, or session authority.

## Device Tests

Start and unlock one emulator, then run:

```sh
make test-android-device
```

The instrumented suite composes the real session screen and selects its expected
layout from the current window width. Run it once below 840dp for the compact
branch and once at or above 840dp for the expanded branch. It also verifies
strict invitation and projection handling, header-only authority, rotating
resume validation, no-cache/no-redirect transport, and the encrypted no-backup
credential boundary.

The dated emulator and artifact evidence is in
[`docs/platforms/android-companion-mvp-test-record.md`](../../../docs/platforms/android-companion-mvp-test-record.md).
Physical Android phone and tablet checks are still required before Android
external testing can be approved.

## Remote and Development Endpoints

Release builds use only:

```text
https://api.test.guiltyparty.app
wss://api.test.guiltyparty.app/ws/v1
```

Debug builds expose an optional development-origin field for synthetic LAN
testing. HTTP/WS is accepted only for literal loopback, private, or link-local
addresses (and `localhost`) in that debug variant. A persistent warning remains
visible throughout an unencrypted session. Release manifests and endpoint
validation require HTTPS/WSS. This field does not perform NSD discovery,
install a local certificate, or broaden the accepted LAN trust model.

Before a live Android handshake, deploy a reviewed test-service configuration
that admits client build `companion_android` 0.1.0 (1). Never place a pairing
proof, bearer, resume credential, or invitation in a URL.

## Implemented Slice

- strict manual/paste `GP1.` invitation intake and ephemeral nickname
- participant join with `private_display` and `touch_input` capabilities
- recipient-bound private projection display
- server-authoritative idempotent `cast_vote`
- endpoint-bound rotating resumption after temporary loss or process restart
- sequence, generation, context, and recipient validation
- 5-second negotiation, 15-second projection heartbeat, 30-second privacy
  shield, 45-second reconnect, full-jitter backoff, and 60-second stable reset
- Keystore-protected resume metadata in `noBackupFilesDir`
- immediate in-memory private-projection purge on background, lock, manual
  hide, uncertain connection, revocation, protocol failure, or session end
- active-session `FLAG_SECURE` and recents-screenshot protection
- compact phone and expanded tablet layouts

## Explicit Exclusions

This slice has no account or passkey UI, identity provider, payments, QR camera,
LAN discovery, microphone, media, notifications or Live Updates, analytics,
crash uploader, persistent private gameplay cache, Host tools, app-store
distribution, or production signing. The invitation is entered manually because
camera permission and QR intake are outside the approved baseline.
