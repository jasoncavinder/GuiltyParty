# ADR 0040: Bundled Public Stage Presentation Media

## Status

Proposed

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

# Proposed Decision

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
manifest and decorates only Host and Stage projections after the canonical
projection has been built. Participant projections omit the descriptor because
the first proof has no participant media behavior.

Unknown, absent, incompatible, or invalid presentation data yields the normal
text-only projection. It never causes the server to reveal private data or the
Stage to construct a path or fetch a URL.

The optional field follows the additive compatibility rules in ADR 0005.
Existing clients that do not understand it continue to render canonical state.

## Packaged Asset Registry

The Stage build contains a first-party registry that maps the exact logical
asset identifiers approved for the package to fixed local resources. Server
input never becomes a relative path, absolute path, URL, CSS fragment, or HTML
fragment.

The first proof uses conservative, locally bundled formats subject to physical
webOS validation:

- one 1920-by-1080 PNG scene image without embedded private or essential text
- one no-speech PCM WAV atmosphere loop, no longer than eight seconds, using
  16-bit samples at 44.1 kHz

The committed files receive cryptographic digests and an original-asset
provenance record. The image and sound require owner review before they are
committed. No third-party source, font, sample, recording, melody, model output,
or stock asset may enter the proof without the separate review required by ADR
0025 and the project licensing policy.

The packaged Stage Content Security Policy permits images and audio only from
its own application resources. It continues to deny arbitrary media, object,
frame, and network origins. The build fails if an expected asset is missing,
has the wrong digest or media signature, exceeds its approved bound, or is not
listed in the registry.

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
- Host and Stage receive only the bounded public descriptor; participant
  projections do not receive it
- an authenticated but unauthorized endpoint cannot request a Stage descriptor
  or Stage presentation status
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
- automated Stage-core and package tests pass without adding a runtime
  dependency
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
