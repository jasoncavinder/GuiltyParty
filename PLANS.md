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

## Remote Friends MVP

### Status

Approved; implementation in progress. This plan replaces the original Local
Multi-Surface MVP Prototype as the primary prototype direction.

[ADR 0004](docs/adr/0004-mvp-technology-stack.md) still documents the local
prototype foundation. [ADR 0033](docs/adr/0033-cloudflare-remote-services.md)
governs the accepted Cloudflare service shape. External use remains blocked
until the owner approves the named-friend test gate described below.

### Objective

Let one host run one short, original Guilty Party scenario for invited friends
through the browser Host, LG webOS Stage, iOS Companions, and the Cloudflare
remote control plane. The purpose is hands-on product learning, not public,
commercial, production, or market-validation traffic.

### Approved Test Defaults

- one active game per operator during the initial rehearsal
- one Host, one Stage, and up to eight participants
- guest aliases only; no permanent user accounts
- one original, immutable scenario version bundled with the service
- invitation-only admission using expiring, rotatable pairing proof
- a maximum active-session duration of four hours
- automatic deletion from active Durable Object storage no later than seven
  days after session end or expiry; earlier deletion is preferred after a
  successful rehearsal
- Cloudflare `workers.dev` for engineering checks and the owner-approved
  `api.test.guiltyparty.app` Worker Custom Domain before named friends join
- owner-operated manual deployments until release automation is separately
  approved

Changing a limit is a configuration decision. It does not relax authorization,
secrecy, retention, or external-test gates.

### Required Experience

1. The Host creates a session and receives private Host authority plus a pairing
   invitation that can be displayed without exposing reusable endpoint
   credentials.
2. One Stage and at least two distinct iOS participant endpoints join remotely.
3. Participants and endpoints remain separate even when a room or device is
   shared.
4. The Host assigns characters, advances scenes, reveals public and private
   clues, opens voting, and closes voting.
5. Each Companion receives only its participant projection; the Stage receives
   only public projection data.
6. Every eligible participant votes at most once and the canonical engine
   resolves a deterministic outcome.
7. A disconnected client resumes from its last authorized server sequence, and
   a hibernated Durable Object reconstructs the same state from its journal.
8. Session end or expiry revokes gameplay authority and schedules deletion.

### Service Scope

The first remote service uses the smallest accepted Cloudflare shape:

- one Worker for HTTPS/WSS transport, compatibility, authentication, coarse
  validation, rate limits, and opaque session routing
- one SQLite-backed Durable Object per game for authority, canonical journal
  ordering, replay, recipient projections, and WebSocket fan-out
- the existing Rust `gp_scenario` engine through a versioned WebAssembly
  boundary with native/WebAssembly parity evidence
- the canonical control-plane v1 contracts under `contracts/`
- one embedded original scenario fixture; D1, R2, Queues, Containers, and
  Cloudflare Realtime are not required for this test

The Worker service does not host or own app UI implementation. It supplies the
Host, Stage, and Companion agent with a versioned contract, test fixtures, safe
error behavior, and an integration endpoint.

### Guest Authority and Pairing

The friends MVP does not treat a guest alias, session identifier, pairing code,
device capability, network address, browser origin, or physical proximity as
identity or authority.

- Host creation requires an operator-controlled bootstrap proof.
- Pairing proofs are one-time or narrowly bounded, expire, rotate, and can be
  revoked when joining closes.
- Successful pairing issues short-lived endpoint authority bound to session,
  endpoint, audience, authority generation, expiry, and exact browser origin
  where applicable.
- Browser authority uses a Secure, HttpOnly, SameSite cookie. Native authority
  uses a bearer credential kept in the approved protected client boundary.
- Raw credentials stay out of URLs, logs, application envelopes, Durable Object
  names, and browser-readable persistent storage.
- The Durable Object rechecks current endpoint generation and revocation before
  accepting commands or projecting private state.

This guest mechanism is limited to the named-friend MVP and does not replace
the accepted permanent-account model.

### Privacy and Data Lifecycle

- Testers use aliases; email addresses, phone numbers, advertising identifiers,
  and stable hardware identifiers are not collected.
- The canonical journal stores accepted deterministic transitions, not private
  communications, raw request payloads, media, transcripts, or recordings.
- No voice, video, private messaging, remote AI, analytics, advertising, crash
  SDK, or behavioral tracking is enabled.
- Authenticated gameplay responses use `Cache-Control: no-store`.
- Operational diagnostics contain safe correlation identifiers and error codes,
  never pairing proofs, credentials, private objectives, clues, votes, or
  scenario payloads.
- Expired and ended sessions reject mutation, revoke authority, and are deleted
  from active storage within the approved seven-day maximum.
- Cloudflare documents a provider-controlled SQLite point-in-time recovery
  history covering the preceding 30 days. The owner accepted that recovery
  horizon for this limited friends MVP on 2026-08-07. It must appear in the
  tester notice, and seven-day active deletion must not be described as
  complete provider erasure.
- Named testers receive a concise notice that this is a private development
  test using aliases and automatically expiring gameplay state.

### Explicit Exclusions

- permanent accounts, recovery, production identity, or public registration
- payments, commerce, creator marketplace, or professional hosting workflows
- public events, uninvited traffic, App Store, or television-store distribution
- media-plane audio, video, whispers, captions, recording, or transcription
- remote AI providers or AI-dependent gameplay
- Android, tvOS, and other additional native clients
- multiple downloadable scenarios, creator authoring, R2 catalog delivery, D1
  account data, queues, or containers
- production analytics, behavioral data, support tooling, or general moderation
- automatic GitHub-to-Cloudflare deployment or production release promotion

### Implementation Slices

1. Replace the local-only plan, document the friends-test lifecycle, and keep
   the external-test gate explicit.
2. Prove a first-party Rust/WebAssembly engine boundary and deterministic native
   parity without a second JavaScript rules engine.
3. Implement Host session creation, invitation lifecycle, Stage and participant
   joining, browser cookie authority, and native bearer authority.
4. Route authenticated control-plane v1 WebSockets to the session Durable
   Object and enforce endpoint generation, origin, message size, and protocol
   rules.
5. Wire engine commands, atomic journal/idempotency commits, projections, fanout,
   and sequence-based reconnect.
6. Add session end, expiry, deletion, bounded resource use, safe diagnostics,
   rollback, and emergency-disable behavior.
7. Give app surfaces conformance fixtures and run automated multi-client,
   browser, iOS, webOS, hibernation, replay, and negative-authorization tests.
8. Deploy to the test subdomain, complete a private rehearsal, and obtain
   explicit owner approval before inviting named friends.

Each slice should be a small Pull Request targeting `dev` when practical.

### Acceptance Criteria

The Remote Friends MVP is ready for owner approval when:

- a clean checkout passes the Rust, contract, remote-service, and Cloudflare
  bundle checks
- native and WebAssembly engines accept and reject the same fixture journal and
  produce byte-equivalent canonical projections or an explicitly normalized
  equivalent
- one Host, one Stage, and at least two distinct participant Companions complete
  the full scenario through the remote endpoint
- session, room, participant, endpoint, and character identifiers remain
  separate and server-authoritative
- invalid, expired, revoked, wrong-origin, stale-generation, Stage, and
  cross-participant authority cannot obtain secrets or perform forbidden actions
- retries are idempotent and reconnect resumes only the caller's authorized
  projection from a journal-derived sequence
- Durable Object hibernation/reactivation and replay preserve canonical state
- the Stage never receives private objectives, private clues, individual votes,
  or endpoint credentials
- ending or expiring a session closes joining, revokes authority, and passes an
  automated deletion verification within the approved lifecycle
- resource limits, rate limits, spending alert, safe diagnostics, deployment,
  rollback, and emergency-disable procedures are rehearsed
- test content is original/project-owned and no excluded data or service is
  enabled
- the owner reviews the readiness record and explicitly approves named-friend
  external testing

### Testing Strategy

- deterministic Rust unit, journal replay, and native/WebAssembly parity tests
- schema and generated-client conformance fixtures
- Worker unit tests for authentication, cookies, origins, limits, and safe errors
- Durable Object tests for invitation, authority, idempotency, replay, expiry,
  deletion, and recipient projection boundaries
- an automated Host + Stage + multi-participant full-game simulation
- browser Host and webOS Stage checks plus a physical iOS Companion rehearsal
- deployment, hibernation, reconnect, rollback, and emergency-disable smoke tests

### Remaining Human Gates

The owner must approve:

- any new third-party dependency or WebAssembly build tool after ADR 0025 intake
- the exact Host and Stage test origins and their DNS changes
- the named-tester notice and external-test readiness record
- the first invitation sent to a friend

The owner approved `api.test.guiltyparty.app` as the API test hostname and
accepted the documented 30-day Cloudflare SQLite recovery horizon for this
limited friends MVP on 2026-08-07.

### Completion Notes

To be completed with PR links, test evidence, deployment version, test hostname,
known limitations, deletion evidence, and the explicit external-test decision.

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
