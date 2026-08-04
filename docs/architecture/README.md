# Guilty Party Architecture Notes

## Shared Vocabulary

### Scenario

A creator-authored interactive story.

A scenario contains:

- characters
- secrets
- timeline
- clues
- evidence
- objectives
- rules
- outcomes

---

### Scenario Version

An immutable published version of a scenario.

Events reference a specific scenario version.

Published events must not silently change when creators update scenarios.

---

### Event

A scheduled instance of a scenario.

Example:

"Death at Blackwood Manor, Saturday 7 PM."

---

### Session

The live technical execution of an event.

A session contains:

- connected participants
- devices
- rooms
- state changes
- communications
- outcomes

---

### Participant

A person participating in a session.

A participant may have:

- an account
- a character
- multiple devices

---

### Character

The fictional role played by a participant.

---

### Physical Room

A real-world location containing:

- participants
- devices
- Stage endpoints
- audio equipment

Rooms are first-class objects.

---

### Endpoint

A device connected to a session.

Endpoints advertise capabilities.

Examples:

- display
- microphone
- camera
- speaker
- controller

---

# Session Journal

Live sessions should maintain an append-only journal of important actions.

Examples:

```
participant.joined
character.assigned
scene.started
clue.revealed
item.transferred
whisper.started
objective.completed
vote.submitted
session.completed
```

The journal provides:

- replay
- debugging
- simulations
- AI context
- recovery after disconnects

---

# Audio Principles

Audio requires:

- room awareness
- mix-minus routing
- echo cancellation
- noise suppression
- explicit privacy boundaries

Private communication includes:

- whispers
- private calls
- secret messages

Private audio should not enter public audio channels.

---

# Privacy Defaults

Default:

- no recording
- no transcript storage
- no unnecessary tracking

Safety-related retention must be:

- limited
- documented
- automatically deleted

Users should understand when information is captured and why.

---

# Future Documentation

Additional documents should define:

- scenario schema
- media architecture
- device pairing
- room audio
- AI Stage Manager behavior
- creator tools
- security model
- ADR history
- roadmap
