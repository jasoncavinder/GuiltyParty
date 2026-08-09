# Android Companion MVP Test Record

## Record Metadata

- Date: 2026-08-08 (Pacific/Honolulu)
- Branch: `feature/android-companion-mvp`
- Target branch: `dev`
- Product: `Guilty Party Companion` 0.1.0 (1)
- Minimum OS: Android 13/API 33
- Compile/target SDK: API 36
- Host: macOS 26.6 Tahoe on Apple silicon
- IDE/tooling: Android Studio Quail 3, Gradle 9.4.1, AGP 9.2.1
- Build JVM: bundled Android Studio JBR 25.0.2; application bytecode level 17
- Installed emulator image: Android 17 developer preview/API 37.1,
  Google APIs Play Store, 16KB page size, arm64-v8a
- Physical Android phone/tablet available: none

This record contains only synthetic fixtures and non-secret build information.
It contains no invitation, pairing proof, bearer, resume credential, nickname,
private scenario text, participant/endpoint identifier, Android ID, signing
material, or account information.

## Automated Verification

| Check | Destination/configuration | Result |
| --- | --- | --- |
| `make check-mobile-contracts` | repository host | Passed: canonical schema and 29 fixtures; deterministic Swift/Kotlin outputs; 33 fixtures passed in each generated language |
| `npm run --silent test:remote` | repository host | Passed: 79 tests, including Android build admission |
| `cargo test --locked --workspace --all-targets` | `apps/server` Rust workspace | Passed: 47 unit tests |
| `testDebugUnitTest` | host JVM, strict offline verification | Passed: 9 state, sequence, privacy, endpoint, health, and backoff tests |
| Debug APK build | API 36, strict offline verification | Passed |
| Unsigned release APK build and lint-vital | API 36, strict offline verification | Passed |
| Instrumented-test APK build | API 36, strict offline verification | Passed |
| `lintDebug` | repository source and merged debug manifest | Passed with zero errors; only the accepted API 36-versus-installed-preview notices remain |
| Instrumented suite, compact | Medium Phone AVD, Android 17 preview, 1080x2400 at 420dpi, approximately 411dp wide | Passed: 10 tests; real Compose session selected compact layout |
| Instrumented suite, expanded | Same isolated emulator image overridden to 2560x1600 at 240dpi, `sw1067dp`/`w1707dp` | Passed: 10 tests; real Compose session selected expanded layout |

The Android 17 preview changed a hidden input API used by the current Espresso
bridge. The first semantic-rule attempt therefore failed in Espresso before
the app was evaluated. The committed adaptive test uses `ActivityScenario`,
composes the real production session surface, and observes the settled layout
branch without Espresso input injection. This is test-harness compatibility
evidence, not a product failure or a claim of Android 17 support.

## Privacy and Contract Coverage

The implementation review and local/device suites cover:

- strict bounded GP1 decoding, exact transfer keys, expiry, and malformed UTF-8
- generated join, projection, resume, and command envelopes
- native header authority with no secret in URLs or JSON bodies
- expected session, endpoint, participant, language, authority-generation, and
  server-sequence boundaries
- rejection of stale sockets, sequence regression/gaps, identity substitution,
  unexpected private fields, and non-text WebSocket control frames
- endpoint-scoped idempotency metadata and resume-result reconciliation
- 5/30/45/60-second connection-health policy and capped full-jitter backoff
- projection purge on background/lock, manual hide, and uncertain connection
- AES-GCM resume metadata protected by a non-exportable Android Keystore key,
  stored only under `noBackupFilesDir`, excluded from backup/device transfer,
  and containing no projection, clue, objective, vote target, or nickname
- compact and expanded real-Compose layout selection

## Release Artifact Reconciliation

The inspected unsigned release APK is 23 MiB and was built from the locked,
checksum-verified graph. It declares:

- `android.permission.INTERNET`
- AndroidX's generated signature-level
  `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`
- one exported launcher activity
- a non-exported AndroidX Startup provider
- the AndroidX profile-installer receiver, protected by
  `android.permission.DUMP`

It declares no camera, microphone, location, nearby-device, storage,
notification, advertising, or tracking permission. `allowBackup` is false;
backup and device-transfer rules exclude all application domains;
`usesCleartextTraffic` is false. The debug-only test host does not appear in the
release manifest. The APK includes Compose's Apache-2.0 AndroidX graphics-path
native library for four ABIs and no first-party native code.

The only configured first-party application origin in release is
`https://api.test.guiltyparty.app`; the WebSocket URL is derived as WSS. OkHttp
has no disk cache, cookie jar, redirect following, implicit retry, logging
interceptor, analytics, or other network recipient.

## Remaining Gates

- Merge and deploy the reviewed Android client-build admission policy before a
  live test-service join.
- Perform a synthetic live handshake through join, assignment, projection,
  vote, temporary disconnect/process restart, same endpoint/participant resume,
  and session end.
- Exercise active-session screenshot/recents protection and lifecycle behavior
  at the application boundary during that handshake.
- Test at least one representative physical Android phone and one physical
  tablet-class Android device before approving Android external distribution.
- A stable minimum API 33 image and current stable Google-reference/Samsung
  hardware remain open matrix cells; the preview emulator does not satisfy
  those physical-device requirements.

No Android external test, Play Console registration, production signing, or
store release is approved by this record.
