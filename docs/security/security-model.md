# Security Model

## Status

This is a foundational security model derived from the project's accepted
privacy and architecture principles. It identifies invariants and review areas;
it is not an implementation threat assessment or certification.

## Security Objectives

Guilty Party must protect:

- participant identity, account, and payment-related data
- character secrets, objectives, hidden evidence, and inventory
- private messages, whispers, voice, video, and captions
- creator drafts, scenarios, artwork, audio, and rights metadata
- session integrity, voting, reveals, and outcomes
- pairing, authorization, and administrative controls
- AI inputs and outputs

Confidentiality is not the only objective. A session must also preserve the
integrity and availability of deterministic story state.

## Actors and Roles

Relevant actors include:

- guests and account holders
- session participants and their characters
- hosts
- creators
- support and safety personnel
- platform operators
- AI and media service providers
- unauthenticated internet clients

A person may have several legitimate roles, but permissions are evaluated in
the current role, event, session, room, and scenario-version context.

## Trust Boundaries

### Client to Server

Browsers, mobile apps, televisions, and other endpoints are untrusted for
authorization and canonical state. They submit requests; the server verifies
identity, scope, permissions, and scenario rules.

### Control Plane to Media Plane

The control plane decides membership, pairing, permissions, and communication
authorization. The media plane transports authorized streams and must not
create game truth or broaden access.

### Public to Private Experience

The Stage is a public room surface. Companions and authorized host or creator
tools may contain private information. Public endpoints must not receive private
payloads and rely on UI hiding.

### Scenario Engine to AI Stage Manager

The scenario engine owns deterministic truth. AI receives an authorized,
purpose-specific projection and returns advisory output; it does not write
canonical state directly.

### Platform to External Provider

Identity, payment, media, infrastructure, and AI providers are separate trust
domains. Each future integration requires data-flow, retention, access, and
contract review.

## Required Security Invariants

- Authorization is enforced server-side for every protected operation.
- A participant receives only information authorized for that participant,
  character, room, role, and current scenario state.
- Endpoint capability claims do not grant permission.
- Published scenario versions cannot be silently modified.
- Accepted state transitions are ordered and reproducible.
- Private media never falls back to a public route.
- Recording, transcription, and AI analysis are disabled by default.
- Safety retention has a documented purpose, access boundary, deletion trigger,
  and approved duration before collection begins.
- Revoked or expired session and pairing authority cannot continue to grant
  access.

## Threat Areas

### Authorization Confusion

Examples include cross-session identifiers, stale room membership, character
reassignment, host privilege misuse, and public endpoints requesting private
objects.

Required response: use scoped server-side authorization and test negative as
well as positive access cases.

### Information Leakage

Examples include secret data in public API responses, logs, analytics, error
messages, notifications, caches, screenshots, or AI prompts.

Required response: minimize payloads, classify information, and construct
recipient-specific projections.

### Session-State Manipulation

Examples include forged votes, duplicated commands, reordered events, mutable
scenario versions, and unauthorized reveals.

Required response: validate commands against authoritative state and preserve an
ordered, integrity-protected journal.

### Pairing and Session Hijacking

Examples include guessed codes, reused invitations, unauthorized room changes,
and abandoned authenticated devices.

Required response: scope, expire, validate, and revoke pairing authority.

### Media Privacy Failure

Examples include whisper audio reaching a Stage, stale routes after permission
changes, passive microphone capture, or recording without visible consent.

Required response: fail closed, synchronize control authorization with routing,
and provide clear capture indicators.

### Creator and Supply-Chain Risk

Examples include unauthorized content access, unclear asset licensing, malicious
uploads, compromised dependencies, and build or release tampering.

Required response: enforce creator isolation, record rights metadata, validate
inputs, review dependencies, and secure future build and release processes.

### AI Data and Authority Risk

Examples include private data entering prompts, generated secrets appearing in
public output, prompt retention, and AI output being treated as canonical truth.

Required response: minimize and classify inputs, validate outputs, preserve
human approval, and keep the deterministic engine authoritative.

## Verification Expectations

Future implementations should include:

- authorization tests for every private resource class
- deterministic scenario replay and simulation tests
- cross-room and cross-session isolation tests
- pairing expiry and revocation tests
- media route and whisper privacy tests
- audit and deletion verification
- dependency, secret, and release-integrity checks

## Open Decisions

Human approval is required for:

- authentication and account recovery model
- administrative and support-access policy
- encryption and key-management design
- provider selection and data residency
- concrete retention periods
- incident response roles and timelines
- abuse prevention and moderation procedures
- production security testing and disclosure program
