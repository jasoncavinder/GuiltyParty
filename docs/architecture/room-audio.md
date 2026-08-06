# Room Audio Boundaries

## Status

This document consolidates the existing room-aware audio and mix-minus
requirements. ADR 0010 selects WebRTC, an SFU topology, and a self-hostable
LiveKit reference adapter. It does not select a codec or decide ownership of
platform audio processing, mixing, or echo cancellation.

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

The SFU forwards authorized tracks. The exact placement of acoustic processing,
room mixing, and mix-minus remains open under MC-MEDIA-002.

## Public Speech

The documented interaction may use push-to-talk and Stage ducking:

1. An authorized participant requests to speak.
2. The control plane verifies the communication permission.
3. Guilty Party Stage audio in that room may be reduced.
4. The media plane routes the microphone only to authorized destinations.
5. Stage audio is restored when transmission ends.

Ducking applies only to media controlled by Guilty Party. The application must
not assume it can control physical television or receiver volume.

## Private Audio and Whispers

Private audio may target a participant, group, or host. The public Stage and
unauthorized rooms receive nothing.

Private routes must not be inferred only from hidden UI state. Authorization is
server-controlled, and media routing must fail closed when authorization is
missing or stale.

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

## Open Decisions

- echo-cancellation ownership across platforms
- active-microphone arbitration within a room
- reconnection and route-revocation timing
- accessibility caption generation and retention
- consent UX for optional recording or transcription
- observable health and diagnostics without unnecessary surveillance
