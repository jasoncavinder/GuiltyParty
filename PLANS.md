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
- BCP 47 gameplay-language metadata advertised with the session
- a packaged, sideloaded LG webOS Stage; the television browser is not the MVP
  Stage surface
- browser Host at `host.test.guiltyparty.app` and browser Companion fallback at
  `play.test.guiltyparty.app`, with API authority kept at
  `api.test.guiltyparty.app`
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
- Browser Host and hosted-browser authority use a Secure, HttpOnly, SameSite
  cookie. Native iOS authority uses a bearer credential kept in the approved
  protected client boundary. The packaged webOS Stage keeps bearer authority
  only in process memory and derives a 30-second, single-use WebSocket ticket
  for each connection under ADR 0035.
- Raw credentials stay out of URLs, logs, application envelopes, Durable Object
  names, and browser-readable persistent storage.
- Participant QR/copy/manual handoff uses a short-lived `GP1.` non-URL transfer
  payload. Stage admission instead uses a Host-approved, one-time, 120-second
  device-code transaction whose display code does not grant authority.
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
- Android work beyond the bounded ADR 0017 baseline, tvOS, and other additional
  native clients
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
   Object and enforce endpoint generation, origin, message size, protocol
   rules, and atomic packaged-Stage ticket consumption.
5. Wire engine commands, atomic journal/idempotency commits, projections, fanout,
   and sequence-based reconnect.
6. Add session end, expiry, deletion, bounded resource use, safe diagnostics,
   rollback, and emergency-disable behavior.
7. Give app surfaces conformance fixtures and run automated multi-client,
   browser, iOS, webOS, hibernation, replay, and negative-authorization tests.
8. Prove packaged-webOS transport behavior, add the ephemeral Stage pairing
   coordinator, and enable supported-build admission for external-test clients.
9. Deploy the two static browser surfaces and API to their separate test
   subdomains, complete a private rehearsal, and obtain
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
- any change to the approved Host or Stage test hostnames and their DNS changes
- the named-tester notice and external-test readiness record
- the first invitation sent to a friend

The owner approved `api.test.guiltyparty.app` as the API test hostname and
accepted the documented 30-day Cloudflare SQLite recovery horizon for this
limited friends MVP on 2026-08-07. The owner approved
`host.test.guiltyparty.app` and `play.test.guiltyparty.app` on the same date,
selected a fully packaged webOS Stage with no Stage website, and approved the
corresponding authentication-transport redesign recorded in ADR 0035.

### Completion Notes

The reviewed remote backend through the participant-resumption slice is
deployed at `api.test.guiltyparty.app`; automated full-game, Stage-boundary,
hibernation, reconnect, expiry, active-storage-deletion, and native-resumption
rehearsals pass with synthetic actors. The Browser Host and Companion fallback
remain deployed as separate Cloudflare Pages projects.

The packaged webOS Stage, physical iPhone Companion, iPadOS simulator
Companion, and Browser Host have completed the live authorized scenario. The
physical iPhone also passed same-participant restart recovery, interrupted-vote
reconciliation without duplication, and post-session credential invalidation.
MVP completion still requires the tester-notice decision and the explicit
external-test go/no-go. The owner accepted the Android entry checkpoint on
2026-08-08 HST after the full iOS/server resumption exercise and PR #38; the
bounded Android baseline now proceeds separately under ADR 0017 without making
Android a requirement for the existing Remote Friends MVP gate.

## Android Companion Baseline

### Status

Approved for implementation after explicit approval of the proposed
third-party dependency intake.

### Objective

Prove that the accepted control-plane v1 and participant-resumption contracts
support a native Android player Companion without importing Apple-specific
assumptions. This is a bounded cross-platform validation slice, not a public or
store-ready Android release.

### Scope

- attach the existing generated Kotlin DTOs behind handwritten application
  boundaries
- provide one adaptive Jetpack Compose shell for Android phone and tablet
  window sizes, with Android 13/API 33 as the minimum
- join approved synthetic sessions through the remote HTTPS/WSS service and the
  bounded development-LAN test path required by ADR 0017, receiving only the
  caller's authorized private participant projection
- submit at least one idempotent participant action and reconcile its outcome
- resume the same participant and endpoint after temporary disconnection or
  process restart without duplicating the participant or action
- clear or obscure private content at lifecycle and capture boundaries and
  retain only the approved encrypted resume credential
- verify the slice on representative phone and tablet emulators; physical
  Android checks remain required before any Android external-test approval

Explicitly excluded are production accounts or identity providers, payments,
media, notifications or Live Updates, analytics, app-store distribution,
background gameplay, and unrelated iOS parity.

### Architecture Impact

The Android app remains a player-only endpoint. It uses Kotlin and Jetpack
Compose, generated data-only control-plane DTOs, handwritten transport and
domain adapters, Android Keystore protection for the resumable credential, and
server-authorized projections. It does not own scenario truth, authorization,
or secrecy policy. HTTPS/WSS remains mandatory for private remote data.
Development-LAN transport is limited to the existing synthetic-data and trust
boundaries; discovery and local-server behavior remain governed by ADR 0020
and the existing trust decisions.

### Implementation Steps

1. Complete the ADR 0025 intake and receive explicit owner approval for the
   exact Android build, UI, transport, and test component set.
2. Add a reproducible Android Studio/Gradle application under
   `apps/mobile/android/`, including committed dependency locking and the
   generated Kotlin DTO attachment.
3. Implement narrow join, authorized projection, idempotent action, session-end
   handling, and accepted resumption behavior.
4. Add adaptive phone/tablet UI plus active-session capture protection and
   lifecycle privacy behavior.
5. Add contract, state, transport, idempotency, resumption, privacy, and
   adaptive-layout tests and run them on phone and tablet emulators.
6. Reconcile the built APK's dependency graph, licenses, manifest, permissions,
   endpoints, and data behavior with the approved intake before review.

### Testing Strategy

- deterministic generated-Kotlin drift and compile checks
- local unit tests for contract decoding, state reduction, terminal failures,
  idempotency reconciliation, and resume-credential handling boundaries
- instrumented Compose tests at compact and expanded window sizes
- synthetic integration tests against the existing remote contract and safe
  local test doubles
- clean debug and release builds with dependency verification and locking
- merged-manifest and APK inspection for permissions, exported components,
  endpoints, private data, and unexpected bundled code

### Risks

- a broad Compose or test graph can hide transitive behavior unless the resolved
  release artifact is reconciled rather than reviewing only direct declarations
- process and network recovery can accidentally duplicate participants or
  actions if the server-owned resume and idempotency contracts are bypassed
- Android lifecycle, backup, screenshots, recents, and multi-window behavior
  can expose stale private content unless tested at the actual application
  boundary
- emulator success cannot replace eventual physical phone and tablet checks


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
