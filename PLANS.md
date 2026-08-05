# Development Plans

## Purpose

This document contains implementation plans for significant development tasks.

Plans are temporary execution artifacts.

Long-lived architectural decisions belong in:

- docs/architecture/
- docs/adr/

Product direction belongs in:

- docs/product/
- docs/roadmap/

---

# Active Plans

## Local Multi-Surface MVP Prototype

### Status

Approved.

The product scope in this plan is approved. Implementation is gated on a
technology ADR proposed by the implementing agent and accepted by the project
owner.

### Objective

Build a private, local-area-network prototype that exercises Guilty Party's
defining experience and architecture with the smallest useful vertical slice.

The prototype should let one host run one original scenario for a small group
using:

- an LG webOS Stage
- an iOS Companion app
- a browser-based Host Console
- a locally running server that simulates a future remote service
- a user-supplied, locally running medium-sized AI model

The purpose is hands-on product exploration and brainstorming, not production
deployment or market validation.

### Experience Definition

The prototype contains one original, synthetic scenario designed solely for
testing. It should be compact enough to complete in one short session and must
exercise:

1. Starting a session from one immutable scenario version.
2. Joining from the Stage and multiple Companions over the LAN.
3. Assigning one character to each participant.
4. Showing public information on the Stage and private character information
   only on the authorized Companion.
5. Advancing through scenes from the Host Console.
6. Revealing public and private clues.
7. Collecting one vote from each eligible participant.
8. Resolving and displaying a deterministic outcome.
9. Replaying the final state from the same scenario version and ordered journal.
10. Showing host-only, advisory AI Stage Manager suggestions without allowing AI
    output to alter canonical state.

The scenario fixture should support a small group and automated simulation. The
exact supported player range and fixture cast size may be proposed in the
technology ADR or implementation plan, but the acceptance run must involve at
least two distinct participant identities and Companions.

### Scope

#### LG webOS Stage

The Stage is a web-technology application suitable for running on LG webOS in a
development environment. It provides the shared public experience:

- session join or pairing information
- scene titles and public narrative
- public evidence and clues
- session progress
- voting status without exposing individual votes
- final outcome

It must not receive private character secrets, objectives, hidden evidence, or
individual votes in its API payloads.

#### iOS Companion

The Companion is the single native-client exception for this prototype. It may
be a development build and does not require App Store distribution.

It provides:

- LAN server discovery or explicit connection setup
- session join and participant identity
- character assignment
- private character information and objectives
- authorized private clues
- vote submission

Each participant identity remains separate even if devices or physical rooms
are shared.

#### Browser Host Console

The Host Console is served by the local server and provides:

- session creation and start
- participant and endpoint status
- character assignment controls
- scene advancement
- reveal controls
- vote opening and closing
- outcome display
- host-only AI Stage Manager suggestions
- journal export or replay controls needed for acceptance testing

Host controls still use server-authorized commands and cannot directly mutate
client state.

#### Local Server and LAN Site

The server runs locally and is reachable by authorized devices on the same LAN.
It simulates the control-plane responsibilities of a future hosted service:

- session and guest identity
- endpoint registration and capability declaration
- pairing or joining
- room and participant association
- scenario state and authorization
- realtime state updates
- journal ordering and replay
- AI Stage Manager integration

The server may serve the Host Console and Stage web assets. LAN addressing,
transport security, discovery, pairing credentials, and realtime transport must
be proposed in the technology ADR.

#### Local AI Stage Manager

The prototype integrates with a user-supplied medium-sized model running locally
beside the server. Model weights must not be committed or distributed with the
repository.

The integration must:

- use a replaceable adapter boundary
- send only an authorized, minimized structured projection
- exclude private communications and unnecessary personal data
- return host-only suggestions
- remain advisory and non-canonical
- fail without preventing deterministic gameplay
- avoid retaining prompts or outputs beyond the active prototype session unless
  the user explicitly exports synthetic diagnostic data

The model runtime, interface, and model license requirements must be covered by
the proposed technology ADR.

#### Scenario and Journal

The scenario is original placeholder content stored as a fixed published
version. Scenario truth, reveal eligibility, voting, and outcomes are
deterministic and server-authoritative.

The journal records the minimum accepted state transitions required for replay.
It is not a recording or transcript and contains no raw private communications.

### Privacy and Data Limits

- Use synthetic names, identities, scenario content, and session data only.
- Do not implement accounts, payments, analytics, advertising, or behavioral
  tracking.
- Do not capture or store voice, video, recordings, captions, or transcripts.
- Do not implement private messaging or whispers in this prototype.
- Do not send gameplay data to a remote AI or analytics service.
- Do not log private payloads unless a synthetic, local diagnostic export is
  explicitly requested by the operator.
- Clear or replace local prototype state through a documented reset procedure.

Private gameplay information needed for the deterministic scenario remains
protected by server-side authorization even though all test data is synthetic.

### Explicit Exclusions

- user accounts and account recovery
- payments and commerce
- creator marketplace and creator monetization
- professional hosting workflows
- production audio, video, whispers, captions, and media routing
- Android, tvOS, desktop, and other native clients
- App Store or television-store distribution
- internet-facing hosting or commercial deployment
- production identity, moderation, support, and safety systems
- scenario authoring tools beyond the fixed original fixture
- remote AI providers or bundled model weights
- production observability, analytics, and scaling infrastructure

The native iOS Companion development build and LG webOS Stage development app
are explicitly in scope despite the broader native and production-app
exclusions.

### Architecture Impact

The prototype touches these documented boundaries:

- modular-monolith server modules
- scenario schema and deterministic engine
- session journal and replay
- server-side authorization
- endpoint capabilities and device pairing
- Stage, Companion, and Host Console contracts
- realtime control-plane updates
- AI Stage Manager input and output projections

It does not implement the production media plane. Any temporary interface used
to represent media-related capabilities must remain separate from scenario
truth.

### Required Technology ADR

Before implementation, the assigned agent must propose an ADR covering:

- server language, runtime, and modular structure
- scenario-engine placement and representation
- journal persistence and replay approach
- HTTP and realtime transport
- API and contract representation
- Host Console web approach
- LG webOS packaging and development workflow
- iOS application architecture and LAN networking
- local AI runtime adapter and configuration
- test strategy and deterministic simulation
- repository layout and developer commands
- every proposed dependency, its purpose, and verified license

The ADR must compare reasonable alternatives, explain prototype tradeoffs, and
remain `Proposed` until the project owner accepts it. No framework, dependency,
or production code may be added before that approval.

### Implementation Steps

1. Read all required repository, product, architecture, security, legal, and ADR
   documentation.
2. Inspect the available macOS, Xcode, LG webOS, Rust, JavaScript, and local-model
   development environment without changing the repository.
3. Draft the technology ADR and any necessary contract sketches; request human
   approval and stop before implementation.
4. After approval, create the smallest server and shared contract skeleton.
5. Add the original immutable scenario fixture and deterministic validation.
6. Implement ordered commands, journal events, state reconstruction, and replay
   tests.
7. Implement guest session creation, joining, endpoint capability registration,
   and character assignment.
8. Implement server-authorized scene advancement, public and private reveals,
   voting, and deterministic outcome resolution.
9. Implement the browser Host Console.
10. Implement and test the LG webOS Stage development app.
11. Implement and test the iOS Companion development app.
12. Integrate the local AI adapter and host-only suggestion flow.
13. Add privacy and authorization tests, LAN setup instructions, reset steps,
    and a reproducible demonstration runbook.
14. Run the complete acceptance session and deterministic replay from a clean
    checkout.

Implementation should proceed as small, reviewable vertical slices rather than
building all server internals before a surface can connect.

### Acceptance Criteria

The MVP is complete when:

- a clean checkout can be configured using documented commands
- the local server and Host Console are reachable on the LAN
- an LG webOS Stage and at least two distinct iOS Companion identities can join
  the same session
- endpoints advertise capabilities and remain distinct from participants and
  physical rooms
- the host can assign characters, advance scenes, and trigger authorized
  reveals
- each Companion receives only its authorized private information
- the Stage receives only public information
- eligible participants can vote exactly as allowed by the fixed scenario
- the same scenario version, initial state, and ordered journal reproduce the
  same final state and outcome
- automated negative tests demonstrate that public or incorrect participant
  contexts cannot access private secrets, objectives, clues, or votes
- the local AI produces at least one host-only suggestion from minimized state,
  cannot mutate scenario truth, and may be unavailable without blocking play
- the original scenario and all visuals are project-owned placeholders or have
  documented, compatible licenses
- no accounts, payments, recording, transcription, analytics, private
  communications, or remote production services are present
- setup, operation, reset, replay, and known limitations are documented

### Testing Strategy

- deterministic unit tests for commands, events, outcomes, and replay
- scenario validation tests for references, audience rules, and immutable
  version identity
- server authorization tests for every private payload and command
- contract tests for Stage, Companion, and Host Console projections
- multi-client simulation for joining, assignment, reveals, voting, and outcome
- AI adapter tests using deterministic fixtures or a test double
- AI failure and malformed-output tests
- LAN smoke tests with the Host Console, LG webOS target, and iOS target
- clean-checkout demonstration using the documented runbook

### Risks

- LG webOS and iOS development tooling may impose signing, device, networking,
  or transport-security constraints.
- LAN discovery and local certificates can consume disproportionate prototype
  effort.
- Supporting three surfaces may encourage duplicated state or authorization
  logic.
- A local model may have incompatible licensing, resource requirements, API
  behavior, or nondeterministic output.
- AI integration may distract from validating the deterministic gameplay loop.
- Prototype shortcuts may be mistaken for production architecture.
- Synthetic privacy boundaries may appear correct while negative authorization
  cases remain untested.

Mitigate these risks by documenting environment prerequisites early, keeping AI
off the critical path, centralizing canonical state and authorization, using
adapter contracts, and labeling all prototype-only choices.

### Completion Notes

To be completed after implementation with:

- accepted ADR references
- final supported development environments
- test and demonstration results
- known limitations and deferred work
- links to the implementation pull requests

---

# Plan Template

Each implementation plan should contain:

## Title

Short description.

## Status

Examples:

- Proposed
- Approved
- In Progress
- Completed
- Abandoned

## Objective

What problem is being solved?

## Scope

What is included?

What is explicitly not included?

## Architecture Impact

Which systems are affected?

## Implementation Steps

Ordered list of changes.

## Testing Strategy

How will correctness be verified?

## Risks

Potential problems.

## Completion Notes

Summary after implementation.

---

# Completed Plans

Move completed plans here for historical reference.
