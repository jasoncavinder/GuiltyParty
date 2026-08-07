# ADR 0011: Room Audio Processing Ownership

## Status

Accepted

## Date

2026-08-06

---

# Context

A Guilty Party physical room may contain a public Stage speaker, several
Companions, one or more microphones, and private headphone routes. Acoustic echo
cancellation needs a timely reference to audio rendered near the microphone.
That reference normally exists only when capture and playback share an endpoint
or an integrated audio system. An SFU can prevent a room's source tracks from
being returned to that room, but it cannot remove sound that a separate
television speaker has already re-entered through a phone microphone.

The product therefore needs distinct ownership for endpoint acoustic
processing, public playback, active-microphone authority, and logical
mix-minus. It must behave safely when a route changes or a device cannot provide
the expected processing.

---

# Decision

## Responsibility Boundaries

| Responsibility | Owner |
| --- | --- |
| Acoustic echo cancellation, noise suppression, and automatic gain control | The endpoint capturing the microphone, using its native or WebRTC voice-processing path |
| Local playback mix and Guilty Party audio ducking | The endpoint rendering that output, including the Stage for public Stage audio |
| Active-microphone authority, physical-room membership, route policy, and authorized audience | Guilty Party control plane |
| Track forwarding, server-enforced subscriptions, and logical mix-minus | Media-provider adapter and SFU, as directed by the control plane |
| Canonical communication permission and scenario effects | Guilty Party control plane and deterministic scenario engine |

The normal SFU path forwards selected tracks without decoding or combining
them. A server-side mixer or processor is introduced only for a separately
approved feature that requires it and has explicit authorization, privacy,
consent, and retention behavior.

## Capture-Endpoint Processing

Each microphone endpoint configures the platform audio session for realtime
voice communication and uses the platform or WebRTC capture pipeline for echo
cancellation, noise suppression, and gain control. Capability and active-route
state must be observed rather than assumed. Guilty Party does not initially add
its own general-purpose acoustic-processing stack on top of the platform
pipeline.

The endpoint starts transmitting only after current control-plane authority and
the media route are confirmed. UI state alone cannot grant microphone access or
make a published track receivable. Capture stops or mutes immediately when
authority, route validity, foreground capture eligibility, or the expected
input is lost.

## Coupled Full-Duplex Routes

When all Guilty Party playback audible to a microphone uses that same endpoint,
the endpoint has an appropriate echo reference. A headphone route may also
qualify when no separate public speaker is acoustically coupled to the
microphone. Full-duplex voice may then be supported with native voice
processing. Push-to-talk remains available and may still be required by a
scenario, host policy, noisy environment, or failed capability check, but it is
not universally required for this route.

## Split Acoustic Routes

When a Companion microphone captures speech while a separate Stage or room
speaker produces Guilty Party audio, Guilty Party must not assume that either
device can cancel the other device's acoustic output. For that arrangement:

- push-to-talk is required
- at most one room-audible microphone transmits at a time
- the rendering Stage ducks Guilty Party-controlled public audio before capture
  is opened
- capture opens only after the route and ducking transition are acknowledged
- Stage audio is restored after capture closes or times out

Ducking never attempts to change the physical television, receiver, or
operating-system master volume. If the Stage cannot confirm the required
Guilty Party audio state, the microphone does not open under the split-route
profile.

## Shared Room Microphone

A shared microphone is modeled as the room's selected capture endpoint, not as
a property of the Stage or of every participant in the room. While it owns the
public route, individual Companion microphones in that room do not also publish
room-audible speech. The control plane may transfer the selected capture role to
another capable endpoint between turns.

The exact request, consent, priority, handoff, and host-override experience when
shared and personal microphones compete remains MC-MEDIA-005. Regardless of
that later policy, two room-audible microphone paths are never activated merely
because two endpoints request them.

## Private Routes

A private headset or other personal route may coexist with the public room
route when it cannot feed private output into a public microphone or speaker
and any separate room playback is silent, ducked, or handled under the
split-route safeguards.
Its audience remains independently authorized and server-enforced under ADR
0010. A private route that loses its personal output, becomes publicly audible,
or cannot retain its required acoustic-processing profile stops and follows the
safe private-capability fallback; it never migrates automatically to the Stage.

## Logical Mix-Minus

The control plane derives route exclusions from physical-room membership and
endpoint capabilities. The provider adapter applies those exclusions so a
room's public outputs receive authorized remote sources without receiving that
room's own microphone tracks back from the network.

Logical mix-minus is required even when acoustic echo cancellation is active.
Echo cancellation is not an authorization mechanism and must not be used to
hide an incorrectly delivered local or private track. Local microphone
sidetone, when intentionally supported by the operating system or hardware, is
not a network return route.

## Failure and Diagnostics

If the active input, output, voice-processing capability, headphone route,
ducking acknowledgment, media grant, or room mapping changes unexpectedly, the
affected transmission fails closed. Recovery may select another authorized
endpoint, require push-to-talk, offer a scenario-approved text or timing
alternative, or pause according to the capability-degradation policy.

Diagnostics may report capability availability, selected routes, processing
state, round-trip behavior, and transport quality. They do not record audio,
retain transcripts, infer health conditions, or expose private communication
content. Recording, transcription, and AI media access remain off by default.

---

# Consequences

## Positive

- Acoustic processing stays where the microphone, output reference, and native
  hardware integration are available.
- Logical mix-minus and acoustic echo cancellation cannot be confused with one
  another or with authorization.
- Split-device rooms have a deterministic push-to-talk and ducking behavior.
- The design supports shared microphones, personal microphones, headphones,
  and private routes without treating every endpoint identically.
- The SFU remains a forwarding boundary rather than a default plaintext mixer.

## Negative

- Split-device rooms cannot offer ordinary open-microphone full duplex.
- Platform and hardware variation requires physical-device testing and route
  monitoring.
- Stage ducking and microphone activation need an acknowledged coordination
  protocol and timeout behavior.
- Only one room-audible capture path at a time may feel restrictive in some
  local performance styles.
- A later server-processing feature will require a separate privacy and consent
  review.

---

# Alternatives Considered

## Perform All Acoustic Processing on the Server

Rejected because a remote server lacks the direct, low-latency playback
reference and hardware route information available at the capture endpoint. It
would also require plaintext access to media that may otherwise remain
end-to-end encrypted.

## Assume Echo Cancellation Works Across Separate Devices

Rejected because a phone cannot reliably obtain the exact playback reference
and timing of an independent television or receiver.

## Keep Every Room Microphone Open

Rejected because co-located microphones create feedback, duplicate speech,
privacy ambiguity, and unpredictable arbitration.

## Use Server Mixing for Every Room

Rejected because the SFU can implement logical mix-minus through selective
forwarding, while default decoding and mixing would add latency, cost, privacy
exposure, and operational complexity.

---

# References

- [Apple voice and video chat audio processing](https://developer.apple.com/documentation/avfaudio/avaudiosession/mode-swift.struct/videochat)
- [Android AcousticEchoCanceler](https://developer.android.com/reference/android/media/audiofx/AcousticEchoCanceler)
- [Android communication audio routing](https://developer.android.com/reference/android/media/AudioManager)
- [LiveKit noise and echo cancellation](https://docs.livekit.io/cloud/noise-cancellation/)
- [ADR 0010: Media-Plane Protocol and Provider Boundary](0010-media-plane-protocol-and-provider.md)
