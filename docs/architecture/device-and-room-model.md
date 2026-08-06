# Device and Room Model

## Overview

Guilty Party is designed around the assumption that:

- One person may use multiple devices.
- Multiple people may share a physical location.
- A single device may serve multiple participants.
- Devices have different capabilities.

The architecture must model these realities explicitly.

A device is not a person.

A person is not a device.

A room is not merely a collection of network connections.

---

# Core Entities

## User

A user represents a real-world person. Companion players establish at least a
minimal Guilty Party account under the accepted authentication and recovery
model.

A user may have:

- Account credentials
- Preferences
- Accessibility settings
- Payment information
- Event history

The local account-free MVP uses synthetic participant identities and does not
change the target-product account requirement.

---

## Participant

A participant represents a user taking part in a specific session.

A participant has:

- Session identity
- Assigned character
- Permissions
- Current objectives
- Private information
- Connected endpoints

A user may participate in many sessions.

A participant exists only within one session.

---

## Character

A character represents the fictional identity being portrayed.

A character contains:

- Public identity
- Private information
- Objectives
- Inventory
- Relationships
- Scenario-specific permissions

A character belongs to a scenario version.

A participant controls a character during a session.

---

## Physical Room

A physical room represents a real-world location containing one or more participants and devices.

Examples:

- Living room
- Office conference room
- Gaming room
- Remote participant location

A room contains:

- Participants
- Endpoints
- Audio equipment
- Display devices
- Network connections

---

# Example Room

A couple participates from their home:

```
Physical Room:
  Honolulu Living Room
Participants:
  Alice
  Bob
Endpoints:
  Apple TV Stage
  Alice iPhone Companion
  Bob iPhone Companion
Capabilities:
  Public display
  Public audio output
  Private interfaces
```


The system understands that Alice and Bob are separate players even though they share the same Stage.

---

# Endpoint

An endpoint is one registered client context, such as an app installation,
browser profile, television application, or desktop application. A physical
device may host an endpoint, but its hardware identity is not account or
participant identity.

Examples:

- Browser
- Phone
- Tablet
- Desktop application
- Smart TV
- Streaming device

Endpoints advertise capabilities.

---

# Identity Recovery Boundaries

The system recovers three identities independently:

- A **user account** is durable and is recovered only through accepted account
  authentication or recovery proof.
- A **participant** is session-specific. After account authentication, the
  server recovers the existing account-to-participant relationship. By default,
  one account has at most one active participant identity in a session.
- An **endpoint** is recovered only with valid endpoint-bound resume authority.
  A different installation or browser profile receives a new endpoint identity
  and is then attached to the recovered participant.

Recovering an account does not clone an endpoint credential. Recovering a
participant does not create a new character assignment. Character control and
private state belong to the participant and are projected only to currently
authorized endpoints.

Display names, device identifiers, network addresses, physical proximity, and
pairing invitations cannot establish or recover an account or participant by
themselves. On an isolated LAN, a bounded offline-admission assertion may prove
the account relationship. Without usable account proof, recovery requires an
explicit host-assisted process rather than inference.

## Primary Private Endpoint Authority

A participant may have several registered and connected personal endpoints,
but the server grants one endpoint the primary private-authority generation at
a time. That endpoint receives complete participant-private projections and may
submit ordinary participant actions. Standby endpoints receive only non-private
connection state.

An authenticated endpoint may request an atomic transfer by choosing "Use this
device." The former primary endpoint does not need to approve the transfer; it
immediately loses private and action authority, receives notification, and must
clear its private view. Requests include the endpoint identity, an idempotency
identifier, and the current authority generation. The server rejects requests
from a stale generation.

Public or shared Stages are never eligible for primary private authority.
Future media or accessibility designs may grant a separate, narrowly scoped
capability lease to another endpoint without granting a second general-purpose
private endpoint. Endpoint revocation invalidates its credentials and ends its
connection.

---

# Endpoint Capabilities

Capabilities may include:

## Display

Examples:

- Public Stage
- Private Companion display

---

## Audio Input

Examples:

- Microphone
- Push-to-talk microphone
- Voice communication

---

## Audio Output

Examples:

- Television speakers
- Headphones
- Phone speaker
- Bluetooth headset

---

## Video

Examples:

- Camera capture
- Video playback
- Stage rendering

---

## Interaction

Examples:

- Touch
- Keyboard
- Mouse
- Remote control
- Voice input

---

# Endpoint Registration

When an endpoint connects, it should declare:

- Device type
- Platform
- Supported capabilities
- Available permissions
- Current room association

Example:

```json
{
  "type": "smart-tv",
  "platform": "webos",
  "capabilities": {
    "publicDisplay": true,
    "publicAudio": true,
    "camera": false,
    "microphone": false
  }
}
```

---

# Device Pairing

Pairing allows devices to associate with a session.

Primary goals:

- Simple setup
- No remote-control typing
- Secure association
- Support multiple devices

Preferred flow:
1. Stage displays QR code.
2. Companion scans code.
3. User authenticates if needed.
4. Device joins selected room.
5. Participant chooses role.

---

# Room Roles

Devices may have roles.

Examples:

## Stage

Public shared display.

Capabilities:

- Display
- Public audio

---

## Companion

Private player interface.

Capabilities:

- Private display
- Touch input
- Private audio
- Microphone

---

## Host Console
Administrative control interface.

Capabilities:

- Session control
- Story management
- Player assistance

---

# Room Audio Ownership

A room may contain:

- Multiple microphones
- Multiple speakers
- Multiple participants

The system must understand room boundaries to avoid:

- Echo
- Feedback
- Duplicate audio
- Delayed self-hearing

Audio routing decisions should consider:

- Physical proximity
- Active speakers
- Room membership
- Endpoint capabilities

---

# Design Principles

## Capability over platform assumptions

Never assume:

"TVs can do X."

Instead:

"Does this endpoint support X?"

---

## Graceful Degradation

A Guilty Party session should remain playable with reduced capability.

Examples:

No smart TV:

- Use browser Stage.

No microphone:

- Use text interaction.

No Companion:

- Use an individually authorized browser Companion fallback.
- Never expose private participant content through a shared public Stage.

---

## Future Compatibility

This model supports:

- New television platforms
- New device types
- Wearables
- Mixed reality devices
- Dedicated event hardware

without changing core session logic.
