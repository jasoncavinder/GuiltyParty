# ADR 0003: Initial Backend Architecture

## Status

Accepted

## Date

2026-08-04

---

# Context

Guilty Party contains multiple logical systems:

- Identity
- Events
- Scenarios
- Sessions
- Media coordination
- Creator tools
- AI services

A natural temptation is to begin with microservices.

However, early separation creates operational complexity.

---

# Decision

The initial backend will use a modular monolith architecture.

The system will be deployed as a unified application while maintaining strict internal boundaries.

---

# Initial Modules

## Identity

Responsible for:

- Users
- Authentication
- Profiles

---

## Catalog

Responsible for:

- Scenarios
- Creators
- Discovery

---

## Booking

Responsible for:

- Reservations
- Event participation

---

## Scenario

Responsible for:

- Scenario definitions
- Validation
- Publishing

---

## Session

Responsible for:

- Live event execution
- Participants
- Rooms
- State

---

## Realtime

Responsible for:

- Connected clients
- Commands
- Events

---

## Creator

Responsible for:

- Authoring workflows
- Publishing tools

---

## Host

Responsible for:

- Host workflows
- Session controls

---

## AI Stage Manager

Responsible for:

- AI-assisted functionality

---

# Boundary Rules

Modules should communicate through:

- Defined interfaces
- Contracts
- Events

Modules should not directly manipulate another module's internal state.

---

# Future Extraction

A module may become a separate service when justified by:

- Scale
- Performance
- Deployment needs
- Team ownership

Extraction should solve a real problem.

---

# Consequences

Positive:

- Easier local development.
- Simpler deployment.
- Clear architecture.
- Future flexibility.

Negative:

- Requires discipline.
- Extraction later requires planning.

---

# Alternatives Considered

## Microservices from the beginning

Rejected.

Reasons:

- Operational overhead.
- Slower development.
- More infrastructure.
- No demonstrated need.

---

## Single unstructured application

Rejected.

Reasons:

- Poor boundaries.
- Difficult maintenance.
- Harder future scaling.
