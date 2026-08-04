# Scenario Engine Architecture

## Overview

The Scenario Engine is responsible for managing the rules and state of an interactive experience.

It is the source of truth for:

- Story state
- Character information
- Evidence
- Objectives
- Reveals
- Outcomes

The Scenario Engine must remain deterministic.

---

# Design Principle

The scenario defines what is true.

The AI Stage Manager assists with presentation.

The host controls execution.

---

# Scenario Structure

A scenario contains:

- Metadata
- Characters
- Acts
- Scenes
- Timeline
- Evidence
- Objectives
- Rules
- Resolution logic

---

# Scenario Versioning

Every published scenario has an immutable version.

Example:

```
Death at Blackwood Manor
Version 1
Version 2
Version 3
```

Events reference a specific version.

---

# Scenario State

A live session contains current state.

Examples:

```
Current Act:
  Act 2
Available Evidence:
  Letter
  Broken Watch
Completed Objectives:
  Identify Secret Relationship
Active Participants:
  8
```

---

# Reveals

A reveal changes what information is available.

Examples:

Public reveal:

```
Everyone learns:
"The victim was poisoned."
```

Private reveal:

```
Only Jason learns:
"You recognize the handwriting."
```

---

# Authorization

The Scenario Engine determines:

- Who may see information.
- When information becomes available.
- Which actions are valid.

The client should never determine authorization.

---

# Session Journal

All meaningful actions should produce journal entries.

Example:

```
001 character.assigned
002 scene.started
003 evidence.revealed
004 objective.completed
```

---

# Deterministic Replay

A session should be reproducible.

Given:

- Scenario version
- Initial state
- Session journal

The engine should reconstruct the same state.

Benefits:

- Debugging
- Testing
- Analytics
- Support investigations

---

# AI Integration

The AI Stage Manager receives:

- Authorized state
- Session events
- Host requests

The AI may:

- Suggest actions
- Generate flavor content
- Assist preparation

The AI may not:

- Change canonical truth
- Reveal unauthorized information
- Override scenario rules

---

# Creator Tools

Creators should author scenarios using structured concepts:

- Characters
- Conditions
- Reveals
- Objectives
- Actions
- Outcomes

Creators should not need to write software.

---

# Future Possibilities

The deterministic engine enables:

- Branching narratives
- Adaptive scenarios
- AI-assisted creation
- Scenario testing
- Automated validation
- Multiplayer simulations
