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
| `testDebugUnitTest` | host JVM, strict offline verification | Passed: 10 state, sequence, privacy, endpoint, socket-interruption, health, and backoff tests |
| Debug APK build | API 36, strict offline verification | Passed |
| Unsigned release APK build and lint-vital | API 36, strict offline verification | Passed |
| Instrumented-test APK build | API 36, strict offline verification | Passed |
| `lintDebug` | repository source and merged debug manifest | Passed with zero errors; only the accepted API 36-versus-installed-preview notices remain |
| Instrumented suite, compact | Medium Phone AVD, Android 17 preview, 1080x2400 at 420dpi, approximately 411dp wide | Passed: 10 tests; real Compose session selected compact layout |
| Instrumented suite, expanded | Same isolated emulator image overridden to 2560x1600 at 240dpi, `sw1067dp`/`w1707dp` | Passed: 10 tests; real Compose session selected expanded layout |
| Instrumented suite, native tablet | Pixel Tablet AVD, Android 17 preview, 2560x1600 at 320dpi | Passed: 10 tests; zero failures; real Compose session selected expanded layout |

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

## Live Remote Emulator Acceptance

The reviewed Android build-admission policy from PR #40 was promoted manually
from exact merged `dev` commit `c9a8b91` to the existing synthetic Cloudflare
test Worker on 2026-08-08 HST. No secret, binding, schema, route, or new
Cloudflare resource changed. Both the Worker hostname and
`api.test.guiltyparty.app` admitted `companion_android` build 1 after the
Custom Domain converged.

The Medium Phone AVD then completed a live synthetic control-plane session:

- native join and Host roster update;
- character assignment and fresh recipient-authorized projection;
- public-clue delivery, rejection of a clue unauthorized for the first
  character, and positive delivery of that clue after a deliberate manual
  rejoin as its authorized character;
- scene advancement, one server-authoritative vote, deterministic resolution,
  and post-vote process restart with one retained vote;
- process-restart resumption of the same participant and endpoint without a
  duplicate roster entry;
- a fully black active-session ADB screenshot under `FLAG_SECURE`, with the
  temporary screenshot deleted after inspection;
- manual private-view purge, fail-closed rejection of an expired invitation,
  Host rotation, and successful use of the fresh invitation; and
- explicit Host session end, private-projection purge, terminal credential
  rejection, and return to the join surface.

The first end-session pass exposed an Android transport distinction: Cloudflare
sent a normal session close, but OkHttp delivered it through the ambiguous
failure callback. Private content was purged, but the UI remained in protected
reconnection until process restart forced authoritative HTTP resumption. The
focused remediation makes ambiguous socket failure revalidate through the
rotating resume credential instead of retrying the existing bearer. Unit,
lint, build, and 10-test instrumented gates passed. A second live session then
moved from an active private projection to `Session ended` through the bounded
resume-validation round trip, without restart, stale private content, or an
uncertain-connection state.

### Pixel Tablet Addendum

On 2026-08-09 HST, exact merged `dev` commit `588bcfe` was installed on a
distinct Android Studio Pixel Tablet AVD using the installed Android 17
preview/API 37.1 Google Play 16 KB-page image. This was a genuine 2560x1600 at
320dpi tablet hardware profile, not the earlier phone-profile display
override. The production surface rendered and remained interactive in both
2560x1600 landscape and 1600x2560 portrait.

The native tablet then completed a live synthetic Remote Friends session:

- joined as one Android Companion endpoint and appeared once in the Host
  roster;
- received Alice and only Alice's private objective after assignment;
- advanced to Scene 1, received the public muddy-footprints clue, and omitted
  the Bob-only security-badge clue entirely;
- resumed the same participant and endpoint after a force-stop without a
  duplicate roster entry, restoring a fresh server-authorized projection;
- moved directly to `Session ended` after confirmed Host termination, without
  stale private content or an uncertain-reconnection state; and
- returned to the clean join surface after a post-termination process restart,
  with the character, objective, clues, and resume authority absent.

The Android 17 preview's synthetic text-input bridge dropped or restored
characters while automating the GP1 field. Every malformed local attempt was
blocked by a length preflight and never submitted. The owner completed the
single live join manually; normal application admission, projection, resume,
and terminal behavior then passed. Temporary invitations, clipboard values,
UI dumps, and app credentials were cleared after the run.

## Player-Experience Refinement Addendum

On 2026-08-11 HST, the Android `0.2.0` (2) refinement candidate was built from
`feature/android-player-refinement` after the protocol `1.1` voting contract
and iOS/iPadOS adaptation merged to `dev`. This addendum contains synthetic,
non-secret evidence only.

The candidate:

- performs compatibility discovery before every fresh join and requires
  protocol `1.1` plus `participant_vote_targets_v1`;
- advertises the negotiated feature, persists only the non-secret negotiated
  protocol alongside the existing protected resume metadata, and continues to
  resume a legacy stored credential as protocol `1.0`;
- validates every server envelope against the authority's negotiated protocol;
- accepts explicit voting phase and target choices only from the recipient's
  authorized projection, rejects inconsistent or duplicate target state, and
  never restores raw identifier entry;
- uses the Refined Case File light, dark, and system appearances, system fonts,
  Android string resources, human-readable BCP 47 gameplay-language names, a
  compact player flow, and an expanded tablet context rail;
- keeps the development origin inside a collapsed debug-only panel; and
- preserves `FLAG_SECURE`, fresh-projection recovery, terminal clearing,
  encrypted no-backup resume storage, and the existing no-cache transport.

Automated and virtual-device evidence:

| Check | Result |
| --- | --- |
| Offline Android gate | Passed debug APK, unsigned release APK, instrumented-test APK, 11 local unit tests, lint, and release lint-vital with strict dependency verification |
| Medium Phone AVD | Passed 13/13 instrumented tests on Android 17 preview/API 37.1; real Compose selected the compact layout |
| Pixel Tablet AVD | Passed 13/13 instrumented tests on Android 17 preview/API 37.1; real Compose selected the expanded layout |
| Contract/privacy additions | Passed protocol compatibility, explicit vote-choice mapping, protected protocol metadata, legacy credential migration, recipient filtering, and authority/header checks |
| Visual inspection | Join presentation inspected on both AVD profiles; warm case-file palette, system typography, bounded phone composition, centered tablet composition, and ordinary hidden developer controls were present |

The independent review added matching opaque system-bar colors for light and
dark appearance on Android 13-14 and selected/selectable-group semantics for
the vote and appearance choices. The exact remediation passed the Android
build, unit, lint, and instrumented-test compilation gate; its focused
selection-semantics test brought the Medium Phone suite to 14/14. This is
automated semantics evidence, not a manual TalkBack or switch-access claim.

## Protocol 1.1 Owner Rehearsal

On 2026-08-11 HST, exact merged `dev` commit
`4d82f5229addddd9efd4337c42bb7083c54ba4a7` was built and installed as Guilty
Party `0.2.0` (2) on fresh Medium Phone and Pixel Tablet AVD application data.
Both AVDs used the installed Android 17 developer preview/API 37.1 Google Play
arm64-v8a image. This was an owner-only synthetic rehearsal and does not claim
physical Android or stable Android 13 behavior.

The same reviewed commit was manually promoted to the existing test-gated
Cloudflare Worker as version `981a0b5a-822b-4951-af6b-2be89a6c50f9`. Both
routed API hostnames reported `friends-mvp-development`, preferred protocol
`1.1`, and `participant_vote_targets_v1`. No secret, binding, domain, Durable
Object migration, retention setting, or Cloudflare resource changed.

The Browser Host initially failed closed because its deployed shared
`control-client.js` still required preferred protocol `1.0`. The reviewed Host
artifact from the same merged commit was therefore promoted as Pages
deployment `3f67d939-5ba2-46ce-b8b5-2ff1e1fe5412`. The custom domain then served
the expected digest and security headers, accepted the additive `1.1`
compatibility response, and created the synthetic session. No Host proof,
invitation, authority credential, endpoint identifier, or private projection
is recorded here.

The two Android endpoints then passed:

- fresh protocol `1.1` compatibility discovery, distinct admission, and live
  Host roster/device updates;
- separate Alice and Bob assignments with only each endpoint's own private
  objective;
- The Gala scene and public muddy-footprints clue on both devices, while the
  Bob-authorized security-badge clue was omitted entirely from Alice;
- direct Alice/Bob character-name vote choices with no raw target input, one
  recorded vote per endpoint, two total votes, and the deterministic public
  resolution identifying Alice;
- force-stop/relaunch recovery of the phone as the same participant and
  endpoint, without a duplicate roster entry or vote and with a fresh
  server-authorized projection;
- a fully black active-session ADB screenshot under `FLAG_SECURE`, followed by
  background-return shielding and successful hide/reveal behavior; the
  temporary screenshot was deleted immediately after inspection; and
- explicit Host session end, immediate private-state clearing on both devices,
  and clean post-termination relaunch without restored authority or content.

The protocol `1.1` Android owner gate is complete. Browser fallback
reconciliation, manual assistive-technology evidence, stable minimum-OS
coverage, and physical Android evidence remain separate gates.

## Remaining Gates

- Physical Android phone and tablet evidence remains unavailable. The owner
  explicitly narrowed the private MVP scope on 2026-08-09 HST: a small,
  invitation-only friends cohort may gather initial physical Android evidence,
  but this exception does not establish Android release qualification or
  authorize an open beta or production release.
- A stable minimum API 33 image and current stable Google-reference/Samsung
  hardware remain open matrix cells; the preview emulator does not satisfy
  those physical-device requirements.

No Play Console registration, signing-key creation, store upload, tester
invitation, open beta, or production release is approved by this record. The
controlled distribution method and build-specific cohort record remain human
decisions under ADR 0024.
