# Packaged LG webOS Stage build and test runbook

## Scope

This runbook builds and sideloads the dependency-free Remote Friends MVP public
Stage. It does not create a Stage website, configure Cloudflare, distribute
through the LG store, enable live communications media, or authorize
named-friend testing.

The package contains only first-party HTML, CSS, JavaScript, original
project-owned icon artwork, and the two exact public presentation assets
approved under ADR 0040. It has no npm runtime, framework, SDK, font, remote
asset, analytics, logging, live-media provider, AI, or persistence dependency.

## Prerequisites

- a clean feature branch based on current `origin/dev`;
- Node.js 22 or later for repository checks;
- LG webOS CLI 3.1 or later (`ares -V`);
- the installed webOS TV simulators under `~/Projects/webOS-SDK/TV/Simulator`;
- an LG TV with Developer Mode enabled for physical sideloading; and
- the raw random Host bootstrap proof generated during the Cloudflare test
  deployment and retained in the owner's protected macOS Keychain when an
  end-to-end synthetic session is required. This is not the stored
  `HOST_BOOTSTRAP_TOKEN_SHA256` digest, a Cloudflare password, API token, or
  Wrangler credential.

Never place the Host proof, a polling secret, Stage bearer, WebSocket ticket,
pairing proof, device credential, or private projection in a command argument,
file, URL, screenshot, log, package configuration, or test record.

## Build

From the repository root:

```sh
make test
make check-cloudflare
make build-stage
```

The packaged television application lives under `apps/tv/lg-webos` and
supersedes the earlier browser-only Stage prototype. The build keeps reviewable
webOS source split under the app directory, generates the
older-runtime-compatible inline package tree at
`.tmp/lg-webos-stage-app`, validates that generated app, and writes:

```text
.tmp/webos-packages/com.guiltyparty.stage_0.2.0_all.ipk
```

Inspect the artifact without installing it:

```sh
ares-package -I .tmp/webos-packages/com.guiltyparty.stage_0.2.0_all.ipk
shasum -a 256 .tmp/webos-packages/com.guiltyparty.stage_0.2.0_all.ipk
```

The expected package ID is `com.guiltyparty.stage`; the application and client
version are `0.2.0`, and the client build number is `3`. The build accepts only
the two registry entries and digests recorded in
[the provenance record](../legal/bundled-stage-media-provenance.md), validates
their PNG/WAV structure, and embeds them into the opaque-origin document.

## Simulator launch

The CLI launches local Stage source in a simulator. Use the exact installed
directory rather than assuming a global simulator search path:

```sh
LG_WEBOS_TV_SDK_HOME="$HOME/Projects/webOS-SDK/TV" \
ares-launch -s 6.0 apps/tv/lg-webos \
  -sp "$HOME/Projects/webOS-SDK/TV/Simulator/webOS_TV_6.0_Simulator_1.4.1"

LG_WEBOS_TV_SDK_HOME="$HOME/Projects/webOS-SDK/TV" \
ares-launch -s 26 apps/tv/lg-webos \
  -sp "$HOME/Projects/webOS-SDK/TV/Simulator/webOS_TV_26_Simulator_1.5.0"
```

Repeat with 22–25 when those runtimes are in scope. Close the simulator process
between source-directory launches; an already-running simulator can continue
showing a prior app.

Simulator results are not physical-TV evidence. See
[the transport spike](webos-transport-spike.md) for the current version-specific
Origin behavior.

## Physical install and launch

List configured targets without recording hardware identifiers or credentials:

```sh
ares-setup-device --listfull
ares-device -i -d '<configured-target>'
```

Install and launch only after the owner has enabled Developer Mode and completed
the developer-key interaction:

```sh
ares-install -d '<configured-target>' \
  .tmp/webos-packages/com.guiltyparty.stage_0.2.0_all.ipk
ares-launch -d '<configured-target>' com.guiltyparty.stage
```

Some Developer Mode runtimes reject an in-place replacement with the same
application version. If and only if that occurs for this no-persistence Stage,
remove this exact application ID and retry the install:

```sh
ares-install -r com.guiltyparty.stage -d '<configured-target>'
ares-install -d '<configured-target>' \
  .tmp/webos-packages/com.guiltyparty.stage_0.2.0_all.ipk
```

Removal terminates the Stage and intentionally loses all in-memory authority.

Use `ares-inspect com.guiltyparty.stage -d '<configured-target>'` only for a
bounded interactive test. Do not preserve network captures, console output, or
screenshots that contain a polling secret, bearer, ticket, pairing proof,
private content, or device credential.

## Required verification

1. Confirm the app starts with a new 120-second non-secret Stage code.
2. Confirm no cookie is created and no authority survives termination.
3. In the Browser Host, create a synthetic session, approve the displayed code,
   and immediately clear the operator proof from the Host field.
4. Confirm pending polls disclose only protocol version, pending status, expiry,
   and retry delay.
5. Confirm the Stage mints a fresh ticket and the server selects
   `guiltyparty.control.v1` without a credential in the WSS URL or application
   message.
6. Complete a public projection rehearsal and verify no objective, private
   clue, individual vote, credential, private message, or another endpoint's
   state appears.
7. Exercise directional focus, Select, and Back at 1920 by 1080.
8. Advance to the bound discovery scene. Confirm the cleaned Cinematic Gallery
   artwork appears without a watch-like object and that all essential scene
   information remains present as text.
9. Confirm atmosphere starts muted, the television user can enable and mute it
   with the focusable control, the eight-second WAV loops without overlapping,
   and the Host receives only coarse availability/mute/playback/motion status.
10. Confirm image or audio failure leaves a complete text presentation, and
    reduced-motion mode removes nonessential transitions without hiding state.
11. Suspend and resume the app; verify audio stops immediately, a fresh ticket
    and full authorized public projection are obtained, and sound resumes only
    under the current in-process user choice after fresh authorization.
12. Remove and restore network access; verify audio stops, the UI reports
    uncertainty, and reconnect uses bounded full-jitter backoff with a fresh
    ticket.
13. Revoke the Stage and end the session; verify media sources and the public
    projection clear and pairing is required again.
14. Terminate and relaunch the app; verify sound is muted, a new code appears,
    and prior authority cannot resume.
15. End every synthetic session created for testing.

Then run the deployed-environment rehearsals from a protected operator shell.
Use hidden input so the Host proof is not placed in shell history:

```sh
read -s GP_HOST_BOOTSTRAP_PROOF
export GP_HOST_BOOTSTRAP_PROOF
GP_REMOTE_BASE_URL='https://api.test.guiltyparty.app' make rehearse-packaged-stage
unset GP_HOST_BOOTSTRAP_PROOF

GP_REMOTE_BASE_URL='https://api.test.guiltyparty.app' \
make rehearse-stage-pairing-boundaries
```

Do not paste the proof into documentation, chat, shell history, or a committed
environment file. End every created session even if the rehearsal fails.

## Evidence record

Record only:

- CLI and simulator versions;
- physical webOS runtime version without serial number;
- package validation, checksum, install, and launch status;
- Origin serialization and safe HTTP status/code;
- TLS success or exact fail-closed error;
- selected WebSocket subprotocol and close-code visibility;
- suspend/resume, network-loss, reconnect, revocation, session-end, and restart
  outcomes;
- image and WAV decode, mute, looping, focus, reduced-motion, fallback, and
  coarse Host-status outcomes for the exact package build; and
- known limitations and owner interaction still required.

Never record raw request/response headers when credentials may be present.

## Build 0.2.0 (3) evidence status

Automated contract, server-boundary, Stage-core, media-controller, digest,
format, CSP, generated-document-size, and package-allowlist checks pass for the
presentation-media candidate. The candidate package with SHA-256
`b24fafb850ee0ac18b83a67b0cd26f70d301b5b82b161876689cb7530edda05f`
was installed and launched on the physical LG 65NANO85UNA running webOS
5.6.2-21 on 2026-08-11 HST.

The physical rehearsal confirmed that the cleaned Cinematic Gallery artwork
fills the viewport edge to edge while the complete public text presentation
remains visible. The television rejected the PCM WAV as an HTML audio-element
source with `MEDIA_ERR_SRC_NOT_SUPPORTED`; the same approved bytes decoded
successfully through the platform Web Audio implementation. A single looping
`AudioBufferSourceNode` produced a seamless loop, although its initial start
has perceptible latency consistent with the documented webOS Web Audio
tradeoff.

An earlier candidate incorrectly called the media resume path for every
duplicate projection returned by the 15-second Stage heartbeat. That created
overlapping Web Audio contexts and left only the newest source reachable by
mute or session-end cleanup. The remediated candidate resumes only after an
actual lifecycle or connection suspension and independently refuses to create
a second Web Audio context while one remains active. After a clean application
close, install, and launch, the owner confirmed more than 45 seconds of
seamless single-source playback, complete mute, one-source re-enable, and
session-end cleanup.

The Stage emitted bounded presentation-status messages during physical remote
inspection, and a local Worker/Durable Object integration rehearsal delivered
them to a feature-negotiated Host. The previously deployed Host endpoint was
created without that feature registration, so exact merged deployment and a
newly created session remain required before recording deployed Host-status
evidence. Simulator, forced network-loss, reduced-motion, and full focus
evidence also remain open unless recorded separately.

## 2026-08-08 Physical Rehearsal Evidence

Packaged Stage 0.1.1 (2) was built from merged source, installed on an LG
65NANO85UNA running webOS 5.6.2-21, and paired through the deployed Browser
Host. In a synthetic session it received participant joins, character
assignment, scene changes, public clues, aggregate vote progress, the
deterministic outcome, and explicit session end without displaying a private
objective, recipient-only clue, or individual vote. After the Worker fan-out
and Stage liveness remediations, participant changes reached the already-open
Stage without a Host reload or manual Stage restart. Explicit session end
cleared the public projection as expected.

This evidence does not claim LG Store distribution, a forced network-loss
timing test for build 0.1.1 (2), or any persistence of Stage authority. The
Stage still requires pairing after application termination by design.
