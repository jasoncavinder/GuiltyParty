# AI Stage Manager Boundaries

## Status

This document consolidates the existing human-first, deterministic, and
privacy-first constraints for AI-assisted features. It does not select a model,
provider, prompt framework, or storage system.

## Role

The AI Stage Manager is a backstage assistant for hosts and creators.

It may:

- analyze authorized structured game state
- assist event and scenario preparation
- suggest pacing or host interventions
- identify potential consistency problems
- generate permitted flavor content

The host remains the director, the creator defines the authored world, players
retain agency, and the scenario engine remains the source of canonical truth.

## Authority Boundary

AI output is advisory unless an authorized human chooses an allowed action.

The AI Stage Manager must not:

- alter scenario or session truth directly
- override scenario rules or authorization
- trigger reveals without an authorized command
- invent canonical evidence, objectives, or outcomes
- impersonate a host's approval
- replace human moderation or safety judgment

If an AI suggestion is accepted, the resulting command must pass the same
deterministic validation and server authorization as any other command.

## Data Access

AI access is purpose-specific and disabled unless explicitly enabled for the
feature. An authorized service constructs a minimized input projection.

Potential inputs include:

- the relevant immutable scenario version
- authorized session state and journal events
- a host or creator's explicit request
- non-private metadata necessary for the task

Excluded by default:

- whispers and private-message bodies
- private voice, video, and transcripts
- unnecessary personal or account information
- data from unrelated events or sessions
- creator-only content outside the authorized task

Private character data may be provided only when the feature requires it, the
recipient context is authorized, and the resulting output cannot expose it to an
unauthorized person.

## Output Classification

AI output must be treated according to its destination:

- host-only suggestion
- creator-only drafting assistance
- player-visible flavor content
- proposed structured content requiring validation

Generated content must not silently cross these audiences. Creator-facing
drafts remain drafts until reviewed and published through the deterministic
scenario workflow.

## Transparency and Logging

Users should understand when an AI feature is active and what category of data
it uses. Operational logging must minimize content and must not become an
indefinite copy of prompts, private state, or generated output.

Exact audit events, retention periods, consent language, and provider data-use
terms require approval before implementation.

## Failure Behavior

AI failure must not prevent deterministic scenario execution. The host must be
able to continue without AI assistance. Invalid, unavailable, or unsafe output
is discarded without changing canonical state.

## Open Decisions

- model and provider selection
- feature-specific consent and disclosure UX
- input projection contracts
- prompt and output retention
- evaluation and safety criteria
- creator rights and review for generated material
- cost, availability, and offline degradation
