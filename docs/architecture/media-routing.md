# Media Routing Architecture

## Overview

Guilty Party separates:

1. Control Plane
2. Media Plane

The Control Plane manages state.

The Media Plane manages audio and video transport.

They interact but remain independently designed.

---

# Control Plane

Responsible for:

- Authentication
- Session membership
- Device pairing
- Permissions
- Scenario events
- Reveals
- Objectives
- Communication permissions

Examples:

```
participant.joined
clue.revealed
whisper.started
vote.submitted
```

---

# Media Plane

Responsible for:

- Video streams
- Audio streams
- Public Stage output
- Private communication
- Captions
- Media synchronization

The Media Plane should not determine game truth.

---

# Media Endpoints

Possible media endpoints:

- Player camera
- Player microphone
- Host camera
- Host microphone
- Stage display
- Private audio device

---

# Stage Media Model

The Stage receives shared content.

Examples:

- Host presentation
- Public player video
- Scene artwork
- Evidence
- Timers

A Stage does not require direct participation in player communication.

---

# Companion Media Model

The Companion provides:

- Private audio
- Whisper communication
- Optional microphone
- Private notifications

---

# Bundled Presentation Media

Authored scene images, evidence images, atmosphere, sound effects, and
pre-recorded narration are presentation media. When an approved asset is
bundled with a Stage application and selected by an already-authorized public
projection, it does not require WebRTC or become live participant media.

Presentation references remain scenario-owned and versioned, while image
decode, playback position, mute, volume, and reduced-motion preference remain
endpoint presentation state rather than canonical scenario truth. Missing or
unsupported presentation media degrades to the authorized text experience.
The server sends presentation descriptors and coarse Host status only after
the receiving build negotiates the feature and advertises the required device
capabilities; platform names and client claims never grant authority.
For the accepted opaque-origin webOS boundary, approved asset bytes are
digest-verified and embedded by the package build rather than loaded through a
server-derived, relative-file, or network media URL.

[ADR 0040](../adr/0040-bundled-stage-presentation-media.md) defines the accepted
bounded first public Stage proof. Private playback, remote delivery, live
communications, recording, and processing remain under their separate audience,
consent, routing, retention, and provider decisions.

---

# Audio Architecture

Audio is the most sensitive part of the system.

Requirements:

- Low latency
- Privacy
- Echo prevention
- Room awareness
- Accessibility support

---

# Mix-Minus Routing

Rooms must avoid receiving their own audio back.

Example:

Room A contains:

- Jason
- Noémi
- Television

Room A should hear:

- Host
- Remote players

Room A should not hear:

- Jason's microphone returned from the network

because Jason is already physically present.

---

# Public Voice Transmission

Recommended flow:

1. Participant activates voice.
2. Companion sends talk request.
3. Stage reduces local public audio.
4. Server routes audio to authorized destinations.
5. Stage restores audio.

---

# Push-to-Talk

Push-to-talk is preferred for certain room configurations.

Benefits:

- Reduces background noise.
- Simplifies room audio.
- Creates intentional communication.
- Supports theatrical interaction.

---

# Stage Ducking

When a room microphone becomes active:

- Lower Stage audio.
- Capture participant speech.
- Restore Stage audio.

Ducking should affect Guilty Party audio only.

The application should not attempt to control physical television volume.

---

# Whisper Communication

Whispers use the same underlying communication system as public voice.

Targets may include:

- One participant
- Multiple participants
- Host
- Scenario-defined groups

---

# Whisper Example

```
Alice
 |
 | private audio
 |
Bob
```

The public Stage receives nothing.

---

# Privacy Requirements

Default:

- No recording.
- No transcript storage.
- No passive microphone monitoring.

Audio capture should occur only when required.

---

# Media Capability Negotiation

The system must adapt to device capability.

Example:

A television may support:

```
publicDisplay = true
publicAudio = true
microphone = false
camera = false
```

The session adapts accordingly.

---

# Protocol and Provider Boundary

ADR 0010 selects WebRTC with a selective forwarding unit for realtime audio
and video. Guilty Party owns a narrow provider adapter, with a self-hostable
LiveKit SFU as the initial reference. The adapter may connect to a local,
self-hosted regional, or separately approved managed deployment without making
provider identity authoritative product state.

The Control Plane decides membership, communication audiences, endpoint
authority, microphone permission, consent, and revocation. It issues
short-lived, endpoint-bound, pseudonymous provider grants containing no
scenario secrets. The Media Plane enforces the resulting routes and transports
media; it does not decide who should receive them.

Private routes require server-enforced audience restrictions and fail closed.
Client-side selective rendering is not an authorization control. Private media
also uses application end-to-end encryption when no authorized media processor
needs access.

Gameplay commands and canonical events remain on the versioned Control Plane.
Encrypted media data channels may carry ephemeral, recipient-scoped captions or
timing signals, but those messages are not canonical or retained by default.

Recording, egress, transcription, passive capture, and AI media access remain
off by default. Any server-side processor is an explicit, consented route with
a documented purpose and retention policy.

See [ADR 0010](../adr/0010-media-plane-protocol-and-provider.md).

---

# Audio Processing Boundary

The microphone endpoint owns acoustic echo cancellation, noise suppression, and
automatic gain control. The playback endpoint owns its local mix and Guilty
Party audio ducking. The control plane selects the active room capture endpoint
and authorized audience, while the SFU enforces track forwarding and logical
mix-minus.

Full duplex may be used when all Guilty Party playback audible to the microphone
shares that endpoint, or a personal headphone route has no separate room speaker
coupled to the microphone. When a Companion microphone and separate public
Stage speaker form the acoustic path, push-to-talk and acknowledged Stage
ducking are required, and only one room-audible microphone transmits at a time.
Private routes fail closed if they become publicly audible or lose the required
route.

See [ADR 0011](../adr/0011-room-audio-processing-ownership.md).

---

# Capture Transparency

System microphone or camera permission never publishes a track by itself. Live
capture requires an endpoint-owner action and a current authorized route, and
it displays a persistent, named indicator alongside platform privacy
indicators. Public-route activity may be shown to the Stage; private-route
activity is shown only to its authorized audience.

Verified local, ephemeral captions are a private accessibility accommodation.
External captions, transcription, recording, and AI media access require
affirmative consent from every affected participant and persistent labels that
name the actual processing. Scope changes or consent withdrawal stop the route.

See [ADR 0012](../adr/0012-capture-indicators-and-consent.md).

---

# Private-Route Failure

Private capture, publication, subscription, decoding, and playback stop when
authorization, server-enforced audience, E2EE key epoch, endpoint authority,
personal output, or provider enforcement becomes absent or uncertain. Output
change, endpoint transfer, restart, or reconnect requires route revalidation, a
new key epoch where applicable, and affirmative resume.

Interrupted private media is neither queued nor replayed. If part may have left
the sender, the product reports possible partial delivery rather than claiming
failure was atomic. Recovery tries the same validated route, another authorized
personal endpoint, a private text or caption modality, a scenario-defined safe
adaptation, or a pause—in that order. It never falls back to Stage or speaker
output, another participant, weaker encryption, AI, transcription, or storage.

A possible unintended output or subscriber is handled as a potential exposure
with direct, factual notice to affected participants and minimized non-content
security metadata. The Stage and unrelated participants do not learn that a
private route exists.

See [ADR 0013](../adr/0013-private-audio-route-failure.md).

---

# Room Microphone Arbitration

The control plane grants at most one room-audible capture lease per physical
room. The lease is bound to one endpoint, a participant when personal, a route,
audience, generation, and short expiry. It lasts at most 15 seconds and renews
every five seconds while authority remains valid. The media adapter enforces the
grant but does not choose the speaker.

Requests and host selection never open capture. Personal and shared sources
still require current speaker intent. Shared microphones belong to the room and
are not attributed through voice or AI inference. Transfer is
break-before-make: the old generation closes before Stage ducking and the new
generation can be acknowledged.

Hold-to-talk ends on release. Tap-based or assistive requests require fresh
confirmation when selected, and a latched activation requires explicit speaker
renewal after 120 seconds. AI may suggest an order but has no lease authority.

See [ADR 0014](../adr/0014-room-microphone-arbitration.md).

---

# Mobile Route and Interruption Handling

Mobile endpoints model microphone input and audio output separately. Connecting
a verified personal headphone output may continue already-authorized private
playback only when input, audience, and acoustic relationships are unchanged.
Headphone removal, Bluetooth loss or switching, speaker or unknown output,
microphone-route change, calls, focus loss, backgrounding, locking, and media-
service reset stop private playback and microphone publication.

Private output never falls back to a speaker. Recovery clears pending private
media, revalidates route and authority, obtains fresh grants and key state where
needed, and requires an explicit participant action. Push-to-talk remains
released after interruption. Control-plane reconnection and eligible public
playback may recover independently when their authority remains valid.

Operating-system route observations do not establish participant identity,
physical-room membership, or media authorization. Diagnostics use generalized
route classes and do not upload Bluetooth addresses, hardware identifiers, call
details, or unnecessary device names. A separately authorized public Stage
route is independent of private Companion media.

See
[ADR 0022](../adr/0022-mobile-audio-route-and-interruption-policy.md).
