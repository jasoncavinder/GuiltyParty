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
