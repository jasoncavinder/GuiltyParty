# Session Journal Boundaries

## Status

This document clarifies the existing append-only journal principle and its
privacy boundaries. It does not select a database or event-streaming technology.

## Purpose

The session journal records meaningful, accepted state transitions so a session
can be reconstructed from its scenario version and initial state.

It supports:

- deterministic replay
- recovery after disconnects
- simulations and automated tests
- debugging and support
- authorized, minimized AI context

## Journal Authority

The server is authoritative for journal entries. A client may request a command,
but it cannot declare that a protected state transition occurred.

An entry must have a stable order within its session. Wall-clock timestamps may
be useful metadata, but replay logic must use deterministic ordering rather than
timing differences between devices.

## Conceptual Entry Data

A future concrete journal format must be able to represent:

- session and scenario-version identity
- a stable sequence or ordering value
- event type and version
- authorized actor or system source
- accepted command or state transition
- references to affected domain entities
- the minimum payload needed for replay

Exact field names and storage formats remain open.

## Privacy Boundary

The journal is not a recording or transcript.

By default it must not contain:

- raw voice or video
- captions or transcripts
- private-message bodies
- whisper content
- unnecessary personal information
- AI prompts containing private conversation

A minimal event such as `whisper.started` may record that an authorized routing
action occurred when operationally necessary, without recording its content.

Journal events that reference character secrets, hidden evidence, or private
objectives remain private data. Access must be authorized server-side and
projections must omit data the recipient is not allowed to see.

## AI Projection

An AI Stage Manager never receives the journal automatically. An authorized
service must construct a purpose-specific projection containing only permitted
state and events. Private communications remain excluded unless a separately
documented exception is explicitly authorized.

AI output does not become a journaled canonical state change unless the host or
another authorized actor submits a valid command that the scenario engine
accepts.

## Retention and Deletion

Append-only describes mutation behavior while a journal exists; it does not mean
permanent retention. Retention must follow the data lifecycle policy and account
for private scenario and participant data.

Exact retention periods, deletion triggers, support access, and archival policy
require human approval before production use.

## Integrity Requirements

A future implementation must define:

- idempotency and duplicate handling
- ordering and concurrency behavior
- event format evolution
- tamper detection and audit access
- recovery from partial writes
- deletion without misleading replay guarantees

These implementation decisions are intentionally deferred.

## Server-Restart Recovery

After restart, the server restores canonical scenario state from the exact
immutable scenario version and ordered journal. Durable control-plane records
also restore:

- session and participant identities
- character assignments and room associations
- endpoint registrations, permissions, and revocation state
- completed admission and idempotency records needed to prevent duplication

This control-plane recovery data does not become scenario truth merely because
it is required for continuity.

The server does not restore:

- live transport connections or connected presence
- expired or ephemeral invitation codes
- pending, uncommitted commands
- cached client projections
- AI suggestions
- active media routes

Every endpoint initially appears disconnected and must reauthenticate or resume
its authority. The server then constructs a fresh authorized projection. If
joining remains open, it issues a fresh invitation.

If the exact scenario version is unavailable, journal replay fails, or required
durable state cannot be validated, the session fails closed for host
intervention. The server must not guess, partially reconstruct, or silently
start a different state.
