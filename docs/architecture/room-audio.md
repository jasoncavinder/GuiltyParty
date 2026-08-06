# Room Audio Boundaries

## Status

This document consolidates the existing room-aware audio and mix-minus
requirements. ADR 0010 selects WebRTC, an SFU topology, and a self-hostable
LiveKit reference adapter. ADR 0011 assigns endpoint acoustic processing,
playback mixing and ducking, control-plane authority, and SFU mix-minus. It does
not select a codec.

## Purpose

A physical room may contain several participants, microphones, speakers, and
Companions. Audio routing must use room membership and endpoint capabilities to
avoid echo, feedback, duplicate sound, and privacy failures.

## Audio Ownership

The system must know:

- which endpoints are physically co-located
- which endpoint supplies public room audio
- which microphones may transmit
- which outputs are public or private
- which participants are authorized for a communication channel

No platform label alone determines these properties.

## Mix-Minus Requirement

A room should receive authorized remote audio without receiving its own local
microphone feed back from the network. Routing must account for every active
input and output associated with the room.

The capturing endpoint owns acoustic echo cancellation, noise suppression, and
automatic gain control through its platform or WebRTC voice-processing path.
The rendering endpoint owns its local playback mix and Guilty Party audio
ducking. The SFU forwards authorized tracks and enforces logical mix-minus as
directed by the control plane; it does not normally decode or combine them.

Logical mix-minus remains required even when acoustic echo cancellation is
active. Echo cancellation is neither a routing control nor an authorization
boundary.

## Public Speech

The documented interaction may use push-to-talk and Stage ducking:

1. An authorized participant requests to speak.
2. The control plane verifies the communication permission.
3. Guilty Party Stage audio in that room may be reduced.
4. The media plane routes the microphone only to authorized destinations.
5. Stage audio is restored when transmission ends.

Ducking applies only to media controlled by Guilty Party. The application must
not assume it can control physical television or receiver volume.

When all Guilty Party playback audible to a microphone shares that endpoint, or
a headphone route has no separate room speaker coupled to the microphone,
native voice processing may permit full-duplex speech and push-to-talk is
optional unless another policy requires it. When a Companion microphone and a
separate Stage or room speaker form the acoustic route, push-to-talk is required,
only one room-audible microphone may transmit, and the Stage must acknowledge
ducking before capture opens.

A shared microphone is the room's selected capture endpoint. While it owns the
public route, individual Companions in that room do not also publish
room-audible speech.

The control plane grants at most one room-audible capture lease per physical
room. Requests never open a microphone. A host may select or cancel requests and
stop an active source, but the speaker must still hold push-to-talk or confirm a
bounded activation. Shared microphones belong to the room and remain labeled
`Room microphone` unless the current speaker explicitly accepts attribution;
voice recognition and AI do not infer identity.

The technical lease lasts at most 15 seconds and renews every five seconds.
Hold-to-talk releases immediately. A tap-based or assistive queued request
requires fresh confirmation when selected, and any latched activation requires
explicit renewal after 120 seconds. Transfer closes and confirms the old
generation before validating, ducking, and opening the new one.

## Private Audio and Whispers

Private audio may target a participant, group, or host. The public Stage and
unauthorized rooms receive nothing.

Private routes must not be inferred only from hidden UI state. Authorization is
server-controlled, and media routing must fail closed when authorization is
missing or stale.

Loss or uncertainty of the expected personal output, E2EE key epoch,
authorization, endpoint authority, or provider audience enforcement stops both
capture and playback. A changed output, endpoint transfer, restart, or reconnect
requires validation and affirmative resume. Private speech is not queued or
replayed.

Recovery may re-establish the same route, select another authorized personal
endpoint, offer a private text or ephemeral caption alternative, use a
scenario-approved adaptation, or pause. It never routes to a public speaker or
Stage. Possible unintended playback or subscription is treated as a potential
exposure and disclosed directly to affected participants without announcing the
private interaction publicly.

## Privacy Defaults

- no recording by default
- no transcript storage by default
- no passive microphone monitoring
- no AI access to whisper or private-conversation audio by default
- clear indicators when a microphone or recording feature is active

Any exception requires explicit authorization, documented purpose, limited
retention, and access control.

## Capability Degradation

If a required audio capability is unavailable, the session should provide an
understandable fallback where possible, such as text participation or another
authorized endpoint. Failure must not reroute private audio to a public output.
Loss of the expected input, output, voice-processing profile, private headphone
route, ducking acknowledgment, media grant, or room mapping stops the affected
transmission before recovery begins.

## Open Decisions

- platform-specific interruption and route-change timing
- accessibility caption generation and retention
- observable health and diagnostics without unnecessary surveillance

See [ADR 0011](../adr/0011-room-audio-processing-ownership.md) and
[ADR 0013](../adr/0013-private-audio-route-failure.md). Microphone arbitration
is defined by [ADR 0014](../adr/0014-room-microphone-arbitration.md).
