# Creator Tool Boundaries

## Status

This document consolidates existing creator and scenario-engine principles. It
does not select an editor framework, marketplace workflow, or commercial terms.

## Purpose

Creator tools help writers and designers author structured interactive stories
without requiring them to write software.

Creators provide worlds, characters, evidence, objectives, branching logic,
artwork, audio, and themes. The platform validates, versions, and distributes
authorized content while preserving the distinction between creator content and
platform technology.

## Authoring Lifecycle

### Drafting

Creators may change drafts, preview structure, and run validation. Drafts are
not playable as published versions.

### Validation

Tools should identify structural errors, invalid references, unreachable
required outcomes, missing audience rules, and unsupported requirements before
publication.

### Publishing

Publication creates an immutable scenario version. Later corrections create a
new version, and scheduled events continue to reference their selected version.

### Testing

Creators should be able to exercise deterministic simulations and inspect
validation results without accessing another creator's private content.

## Secrecy and Preview

Creator interfaces must distinguish:

- public scenario information
- participant- or character-private information
- host-only information
- creator-only draft material

Preview modes cannot weaken server-side authorization or expose unpublished
content through public endpoints.

## AI Assistance

AI may help brainstorm, review consistency, or draft permitted content. AI
output remains proposed content until the creator reviews it and the normal
validation and publishing process accepts it.

AI assistance must respect creator access boundaries and must not ingest another
creator's private work without authorization.

## Rights Metadata

Future tools must be able to associate content and assets with source,
ownership, attribution, and license information before distribution. The exact
rights model depends on future creator agreements and requires legal approval.

No tool should imply that uploading content automatically transfers ownership
when no governing agreement exists.

## Accessibility

Authoring must classify required private capabilities and define an ordered,
privacy-preserving fallback or an explicit session-pause outcome. Alternatives
may change modality, input method, or timing, but must preserve canonical truth,
audience restrictions, and participant agency.

Publication validation rejects a required private interaction that has neither
a safe alternative nor explicit pause behavior. Preview and simulation must let
creators exercise each capability fallback without exposing participant-private
content through public surfaces. AI may propose accessible alternatives, but a
creator reviews them and deterministic scenario constraints remain
authoritative.

## Open Decisions

- editor interaction model and supported platforms
- collaboration and draft ownership
- scenario import and export formats
- preview and simulation UX
- publication review and moderation
- marketplace, revenue, and licensing workflows
- asset processing and storage
