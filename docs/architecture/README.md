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
- authorized, minimized AI context
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

# Architecture Documents

- [Device and room model](device-and-room-model.md)
- [Device pairing boundaries](device-pairing.md)
- [Media routing](media-routing.md)
- [Room audio boundaries](room-audio.md)
- [Scenario engine](scenario-engine.md)
- [Scenario schema boundaries](scenario-schema.md)
- [Session journal boundaries](session-journal.md)
- [AI Stage Manager boundaries](ai-stage-manager.md)
- [Creator tool boundaries](creator-tools.md)
- [Control-plane v1 migration](control-plane-v1-migration.md)
- [Cloudflare remote services](cloudflare-remote-services.md)
- [Cloudflare tooling evaluation](cloudflare-tooling-evaluation.md)
- [Mobile contract generator evaluation](mobile-contract-generator-evaluation.md)

Related documentation:

- [Security documentation](../security/)
- [Architectural decision records](../adr/)
- [Platform documentation](../platforms/)
- [Product roadmap](../roadmap/)

# Open Architecture Work

These documents define boundaries. Some concrete choices are now recorded in
the ADR index; remaining provider selections, dependency adoption, production
authentication implementation, and operational retention details still require
evidence, human approval, and ADRs where significant.
