# ADR 0040: Bundled Public Stage Presentation Media

## Status

Accepted

## Date

2026-08-10

---

# Context

The packaged LG webOS Stage currently renders a server-authorized public
projection using text, panels, and first-party CSS. It does not yet present
authored scene artwork or sound. The owner approved **LPR-MEDIA-001** on
2026-08-10: the first media proof will add one original bundled scene image and
one short original bundled atmosphere sound to the public Stage.

This slice must demonstrate theatrical presentation without weakening the
deterministic scenario engine, server-side secrecy, control-plane/media-plane
separation, webOS packaging boundary, or dependency and asset-rights policy.
It must also remain useful when sound or motion is disabled.

The existing scenario fixture is published as version 1 and is immutable. The
existing Stage accepts only packaged first-party application files, rejects
private projection fields, keeps authority in memory, and currently uses a
Content Security Policy that disallows images and other media in its flattened
runtime document. Any implementation must preserve those controls deliberately
rather than bypassing them for presentation.

# Decision

The owner accepted this boundary and the exact digest-matched Cinematic Gallery
image and Cinematic Vault atmosphere asset on 2026-08-10 HST. Acceptance does
not substitute for the simulator and physical-television gates below.

## Scope

The first presentation-media proof contains only:

- one original public scene image
- one short original public atmosphere loop
- one Stage-local sound enable or mute control
- Host-visible coarse playback and mute status
- a sound-off-safe and reduced-motion-safe presentation
- deterministic, scenario-owned logical media references

The slice does not include participant media, private playback, narration,
remote asset delivery, streaming, microphones, cameras, captions, recording,
transcription, AI access, live communications, or a third-party media provider.

## Presentation Is Not Scenario Truth

Canonical story state remains owned by the scenario engine and journal. A
presentation descriptor may decorate an already-authorized public projection,
but it cannot create a scene, reveal a clue, select an outcome, advance time,
or otherwise alter canonical truth.

Media playback position, decode state, mute state, volume, and reduced-motion
preference are endpoint presentation state. They are not journal events and do
not affect deterministic replay. Replaying the same scenario version and
journal produces the same canonical state whether the media package is
available, muted, unsupported, or absent.

## Immutable Scenario-Owned Manifest

The proof publishes a new immutable content version of the original synthetic
scenario rather than modifying `the-stolen-artifact` version 1. The scenario
truth document may continue using scenario schema version 1; its published
content version becomes 2.

Each session persists its selected scenario identifier and content version.
New sessions select version 2 after this decision; migration of a pre-existing
session record without those columns pins it to version 1. The service keeps
both immutable bundles available so a deployment cannot reinterpret an active
or retained version-1 journal as version 2.

A separate first-party presentation manifest is bound to:

- scenario identifier
- scenario content version
- presentation-manifest schema version
- immutable manifest revision or digest
- public scene identifiers
- logical asset identifiers and integrity digests

The manifest maps an authorized public scene identifier to its image and
atmosphere identifiers. It contains no credential, network URL, filesystem
path supplied by a scenario author, private audience, hidden clue, participant
identifier, or executable content.

The scenario package owns the logical references even though platform bundles
may encode the same approved assets differently later. For this proof, the
webOS package contains the only consuming asset set.

## Projection Decoration

The control-plane schema gains an optional public `presentation` descriptor on
the active projected scene. The descriptor contains only bounded logical data
such as:

- presentation-manifest revision
- scene image identifier
- atmosphere audio identifier
- audio behavior, limited initially to `loop_while_scene_active`
- public Stage audience classification

The deterministic Rust engine does not become a media player or infer media
from fixture names. The server application validates the shared presentation
manifest and decorates only an eligible Stage projection after the canonical
projection has been built. Host and participant projections omit the descriptor
because neither surface plays presentation media in the first proof. Host
visibility uses the separately gated coarse status described below.

Unknown, absent, incompatible, or invalid presentation data yields the normal
text-only projection. It never causes the server to reveal private data or the
Stage to construct a path or fetch a URL.

The optional field follows the additive compatibility rules in ADR 0005.
Existing clients that do not understand it continue to render canonical state.

## Feature and Capability Negotiation

The optional field is not sent merely because an endpoint has the Stage
audience. The control plane advertises a stable feature identifier equivalent
to `stage_presentation_media_v1` through the compatibility response. A Stage
that supports the feature may claim the corresponding endpoint feature during
pairing only after observing server support. It also advertises the concrete
device capabilities it can provide, including `public_display` and
`public_audio_output` where applicable.

The server treats every claim as routing input, never as authority. Before it
adds any presentation descriptor it rechecks the current Stage audience,
endpoint authority, negotiated feature, approved client-build range, scenario
and manifest revision, and required device capabilities. The image cue requires
the public-display capability. The atmosphere cue additionally requires the
public-audio-output capability. An older build, unsupported feature, missing
capability, stale authority, or unapproved package receives the ordinary
text-only projection with no unsupported cue.

The approved Stage build is bound to the packaged registry and manifest digest
through supported-build admission, so a client cannot gain media behavior by
claiming the feature or an output capability alone. The first implementation
updates the packaged Stage's current `public_display`-only registration and its
contract fixtures deliberately; it does not infer support from the `webos`
platform name.

Host status is also negotiated independently. Only a current authorized Host
endpoint that advertises support for the bounded presentation-status feature
receives the status message. Older Host builds continue receiving their normal
projection without a descriptor or presentation-status message.

## Packaged Asset Registry

The Stage build contains a first-party registry that maps the exact logical
asset identifiers approved for the package to generated embedded resources.
Server input never becomes a relative path, absolute path, URL, CSS fragment,
HTML fragment, or media byte source.

The first proof uses conservative, locally bundled formats subject to physical
webOS validation:

- one 1920-by-1080 PNG scene image without embedded private or essential text
- one no-speech PCM WAV atmosphere loop, no longer than eight seconds, using
  16-bit samples at 44.1 kHz

## Opaque-Origin Packaging Boundary

The accepted physical webOS transport keeps the networking Stage document in a
sandbox without `allow-same-origin`. Physical webOS 5.6 evidence also shows
that local external resources are rejected in that boundary and CSP `'self'`
is unreliable for them. The proof therefore does not add relative packaged
image or audio URLs and does not relax the sandbox.

The build reads the two approved source assets, verifies their exact digests,
file signatures, dimensions or audio encoding, duration, and size, and embeds
their bytes as MIME-labelled base64 `data:` sources in the generated Stage
document. The generated closed registry maps logical identifiers only to those
build-created values. The runtime never decodes a descriptor value into a URI
or accepts media bytes from the server.

The generated Stage CSP keeps `default-src 'none'`, preserves the existing
exact API `connect-src`, and permits `data:` only in the separate `img-src` and
`media-src` directives required for these generated payloads. It does not allow
`data:` scripts, styles, frames, or connections and does not allow `blob:`,
relative file media, or network media. The source assets, registry metadata,
and generated document have explicit size bounds so the build fails before an
oversized package or document reaches a television.

Neither the embedded `data:` value nor its raw bytes appears in the scenario,
presentation manifest, control-plane schema, projection, status, journal,
diagnostics, or retained service state. Only the bounded logical identifier
crosses the server boundary.

The committed files receive cryptographic digests and an original-asset
provenance record. The image and sound require owner review before they are
committed. No third-party source, font, sample, recording, melody, model output,
or stock asset may enter the proof without the separate review required by ADR
0025 and the project licensing policy.

The packaged Stage Content Security Policy permits images and audio only from
the generated embedded source class described above. It continues to deny
arbitrary media, object, frame, and network origins. The build fails if an
expected asset is missing, has the wrong digest or media signature, exceeds its
approved bound, or is not listed in the registry.

## Stage Behavior

The Stage displays the approved image whenever a fresh authorized projection
selects the bound scene. Image decode failure falls back to the current textual
scene presentation and reports a coarse unavailable state without exposing a
path or raw error.

Audio is muted after each Stage process launch and pairing. A person using the
television explicitly enables sound through a focusable Stage control. The
choice is memory-only for the proof and does not survive process termination.
This avoids unexpected playback and preserves the existing prohibition on
browser-readable persistent storage.

When sound is enabled and the fresh active scene has a valid atmosphere cue,
the Stage loops the local sound while that scene remains active. Repeated
projection heartbeats and reconnects do not stack players or create overlapping
loops. A newly authorized projection for the same scene may resume the loop
from the beginning; playback position is not canonical.

The Stage stops playback, resets media objects, and clears presentation state
when any of the following occurs:

- the active scene changes to one without that cue
- the connection becomes uncertain, offline, or suspended
- the Stage requests a fresh projection after reconnect
- endpoint authority is revoked or expires
- the session ends
- the application is hidden, unloaded, reset, or exited
- decode, integrity, or audience validation fails

Sound resumes only after fresh authorization, a valid current descriptor, and
the existing in-process sound-enabled choice. Nothing falls back to another
speaker or device.

The image may remain beneath the existing stale-connection overlay, but it is
never treated as current without the overlay. Audio never continues under an
uncertain or terminal connection state.

## Reduced Motion and Sound-Off Equivalence

The image and atmosphere enrich the presentation but carry no exclusive clue,
instruction, timer, vote status, or outcome information. Essential content
remains available as authorized text.

The default treatment may use a restrained crossfade or subtle depth effect.
Reduced-motion behavior uses a direct replacement without zoom, parallax,
flashing, or information-bearing animation. Sound-off behavior retains the
same scene identity and progression without substituting another alert that
could be mistaken for required audio.

## Host Visibility

The Stage may publish a bounded, ephemeral status to the control plane after
applying a presentation descriptor. The server relays this status only to an
authorized Host. Initial states are limited to concepts equivalent to:

- asset available or unavailable
- sound muted or enabled
- atmosphere stopped, starting, playing, or failed
- reduced motion active or inactive

The status contains no raw media, device volume, room audio, private content,
diagnostic stack, participant behavior, or stable hardware identifier. It is
not retained in the canonical journal and returns to unknown when the Stage
disconnects or the session coordinator restarts.

The first proof does not let a remote Host force sound on, set television
volume, or start arbitrary media. Expanding Host control requires a later
decision with explicit endpoint acknowledgment and recovery behavior.

## Validation and Acceptance Gates

Implementation is incomplete until all of the following pass:

- version 1 scenario and journal replay remain unchanged
- scenario version 2 produces the same canonical outcome with media available,
  muted, unsupported, and absent
- native and WebAssembly canonical engine parity remains unchanged
- an eligible Stage receives only the bounded public descriptor; Host and
  participant projections do not receive it
- only a feature-negotiated, approved Stage build receives the descriptor, and
  image or atmosphere cues are omitted when their required device capability
  is absent
- older Stage and Host builds continue receiving their existing projections,
  and unnegotiated endpoints receive no presentation descriptor or status
- an authenticated but unauthorized endpoint cannot request a Stage descriptor
  or Stage presentation status, and capability claims alone cannot cross that
  authorization and supported-build boundary
- unknown identifiers, mismatched digests, corrupt files, and path-like input
  fail to the text-only presentation
- repeated projections, reconnects, and scene changes never create overlapping
  audio instances
- uncertain connection, suspension, revocation, session end, and application
  exit stop audio and clear presentation state
- sound remains muted until a television user enables it after launch
- sound-off and reduced-motion paths preserve all essential information
- the build and packaged-file allowlist include only the approved first-party
  assets and continue to reject external media origins
- the generated package embeds only the digest-matched approved image and
  sound, contains no relative, network, or `blob:` media source, keeps the
  opaque sandbox, and limits `data:` to `img-src` and `media-src`
- generated-document and package-size limits fail before sideloading when an
  embedded asset exceeds its approved bound
- automated Stage-core and package tests pass without adding a runtime
  dependency
- contract fixtures cover feature and capability negotiation, including a
  `public_display`-only Stage, an audio-capable approved Stage, an older Stage,
  a status-capable Host, and an older Host
- the packaged app is exercised on an installed webOS simulator and the
  physical LG webOS 5.6 television for image decode, audio decode, looping,
  mute, focus, reconnect, suspension, and terminal clearing
- asset provenance, digests, generation or creation process, and owner approval
  are recorded before merge of the media files

# Consequences

## Positive

- The Stage gains a meaningful theatrical proof without a live-media service.
- Logical IDs and a closed local registry prevent server input from becoming a
  media URL or filesystem path.
- A sidecar manifest keeps presentation metadata scenario-owned without making
  playback state canonical truth.
- Publishing scenario version 2 preserves immutable replay of version 1.
- Muted startup, sound-off equivalence, and prompt audio shutdown keep the
  first proof conservative and testable.
- The same public descriptor can later support other Stage implementations
  without requiring identical asset encodings.

## Negative

- The server, contract, Host, Stage, scenario package, and build tooling all
  require coordinated changes for a small visible slice.
- The Stage bundle grows and must verify asset integrity and format support.
- Host status requires ephemeral control-plane messaging even though it is not
  scenario truth.
- Muted startup adds a deliberate action before atmosphere is audible.
- Physical television testing is required; browser and simulator results alone
  cannot prove audio behavior on webOS 5.6.

# Alternatives Considered

## Infer Assets from Scenario or Scene Names in the Stage

Rejected because fixture-specific client inference is brittle, bypasses
scenario ownership, and can diverge from deterministic versioning.

## Put Binary Media or URLs in the Canonical Journal

Rejected because playback artifacts are not scenario transitions, would bloat
or expose retained state, and would couple deterministic replay to delivery.

## Add Presentation Fields Directly to the Scenario-Truth Schema

Rejected for the first proof because the deterministic engine does not need
image, codec, or playback metadata to resolve story state. A separately
versioned, scenario-owned manifest keeps the package relationship explicit
without making platform presentation part of the rules schema.

## Modify Published Scenario Version 1

Rejected because ADR 0002 makes published scenario versions immutable.

## Fetch the First Assets from R2 or Another Remote Origin

Rejected because local bundling is sufficient for this proof and avoids remote
delivery, caching, integrity, availability, privacy, and cost decisions.

## Replace the WAV with Native AAC/M4A or MP3 Playback

Rejected for the bounded MVP proof after a disposable physical-device spike on
2026-08-11. AAC-LC/M4A and MP3 candidates derived from the approved owned WAV
were approximately 90 percent smaller, but neither produced a supported native
playback path on the physical LG webOS 5.6 television. Embedded `data:` native
playback failed; relative packaged-file playback was correctly blocked by the
opaque-origin sandbox; and `blob:` playback reached the media engine but
returned media error code 4, `Format error`, for both formats despite
`canPlayType()` reporting probable support. The candidates and local encoding
tools were disposable and were not added to the repository or product.

The verified PCM WAV/Web Audio implementation remains authoritative. Its
larger package size and one-time decode/start latency are accepted for this
proof rather than weakening the sandbox or relying on optimistic capability
claims that contradict target-device behavior.

## Start with Private Audio or Live Communications

Rejected because those features require audience routing, device-route
validation, consent, interruption handling, provider review, and broader
physical-device evidence. They remain separate decisions under LPR-MEDIA-002,
LPR-MEDIA-003, and ADRs 0010–0014 and 0022.

## Make Host-Controlled Remote Playback Part of the First Proof

Rejected for the first slice because reporting coarse Stage state is enough to
verify coordination. Remotely forcing playback or sound requires additional
command, acknowledgment, authority, and failure semantics.

# Related Documents

- [Scenario Versioning](0002-scenario-versioning.md)
- [Versioned Control-Plane Contract](0005-versioned-control-plane-contract.md)
- [Media-Plane Protocol and Provider](0010-media-plane-protocol-and-provider.md)
- [Third-Party Dependency Governance](0025-third-party-dependency-governance.md)
- [Packaged Stage Realtime Authority](0035-packaged-stage-realtime-authority.md)
- [Packaged webOS Stage Pairing](0036-packaged-webos-stage-pairing.md)
- [Visual Language](../product/visual-language.md)
- [Local Product Refinement Roadmap](../roadmap/local-product-refinement.md)
