# Scenario Schema Boundaries

## Status

This document defines the conceptual contract already required by the scenario
engine. It does not select a serialization format, database representation,
programming language, or schema library.

## Purpose

A scenario schema must let creators describe an interactive story in structured
terms while keeping live execution deterministic, testable, and enforceable by
the server.

The schema represents authored truth. It is not an AI prompt and must not depend
on an AI system to decide canonical outcomes.

## Lifecycle

### Draft

Draft scenarios may change and are not playable as published content. Creator
tools may validate and preview drafts.

### Published Version

A published version is immutable and has a stable identifier. Corrections or
content changes create a new version.

### Session State

Session state is initialized from exactly one published scenario version and is
changed only by valid scenario commands and journaled events.

## Required Conceptual Areas

A future concrete schema must be able to represent:

- scenario identity, metadata, and version
- characters and relationships
- public and private character information
- acts, scenes, and timeline constraints
- evidence, clues, and inventory
- objectives and completion conditions
- commands, conditions, reveals, and outcomes
- voting and resolution rules
- audience and authorization rules
- referenced media and accessibility metadata

These are conceptual requirements, not prescribed field names.

## Information Classification

Every piece of scenario information that can reach a participant must have an
audience rule. Examples include:

- public to the session
- public to a physical room
- visible to one participant or character
- visible to a scenario-defined group
- host-only
- creator-only and unavailable during play

Omitting an audience rule must not make private information public. Concrete
schema design must define a safe validation failure for missing or invalid
classification.

## Deterministic Rules

Scenario rules must evaluate from explicit inputs:

- the immutable scenario version
- initial session state
- accepted commands
- ordered journal events

Replay must not depend on current time, network arrival order, random behavior,
or external AI output unless the relevant value was explicitly captured as an
authorized event input. Randomness, if later supported, requires a reproducible
and journaled mechanism.

## Validation Requirements

Before publication, validation must be able to identify:

- missing or duplicate identifiers
- references to nonexistent entities
- unreachable required outcomes
- invalid audience or permission references
- contradictory state transitions
- missing resolution conditions
- unsupported capability requirements
- referenced assets without sufficient source and rights information

The exact validation language and severity levels remain open.

## Compatibility

A concrete schema must identify its own schema format version separately from a
scenario's published content version. A migration strategy must be approved
before multiple schema format versions are supported.

## Open Decisions

Human approval is still required for:

- serialization and canonicalization format
- identifier and version syntax
- condition and rule expression language
- schema evolution and migration process
- asset manifest structure
- validation severity and publication gates
- localization representation

Those choices may warrant an ADR when implementation evidence is available.
