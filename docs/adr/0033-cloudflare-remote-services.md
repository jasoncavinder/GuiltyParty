# ADR 0033: Cloudflare-Native Remote Services

## Status

Accepted

## Date

2026-08-06

---

# Context

Guilty Party needs an inexpensive first production deployment for an iOS
Companion, browser Host, and LG webOS Stage while preserving the deterministic
and privacy boundaries already proven by the local Rust prototype. Live game
sessions are stateful: commands require one canonical order, reconnecting
devices need authorized projections, and a session must remain coherent even
when no ordinary request is currently executing.

A permanently running virtual machine would preserve the existing Axum process
shape but would impose idle cost and operating work that are disproportionate
to the MVP. A request-only stateless function plus a global relational database
would be inexpensive at low traffic, but it would require distributed locking
or optimistic concurrency around every session command. Cloudflare Durable
Objects provide a single logical coordinator, colocated strongly consistent
storage, WebSockets, and hibernation for each session. The wider Cloudflare
platform can also host public assets, global account data, immutable scenario
artifacts, and a remote media adapter without making a container the authority
for an active game.

The existing native Rust scenario engine remains the source of deterministic
scenario semantics. Cloud adoption must not fork those rules into a second
JavaScript engine or weaken server-side secrecy. It must also preserve the
control-plane/media-plane split, the ability to run a managed local server, and
an exit path from provider-specific storage and coordination APIs.

# Decision

## Service Shape

The official remote control plane will use one Cloudflare Worker as the public
gateway and one Durable Object instance as the canonical coordinator for each
live game session.

The gateway owns transport concerns:

- HTTPS and WebSocket entry points
- protocol compatibility and safe error responses
- authentication and coarse request validation
- mapping an opaque session identifier to a Durable Object
- rate limits, abuse controls, and security headers
- forwarding only the minimum authenticated context required by the session

The session Durable Object owns:

- the session's monotonic canonical journal sequence
- command serialization and bounded idempotency records
- current authority generations and connection metadata
- replay from its SQLite-backed append-only journal
- recipient-specific public, Host, Stage, and participant projections
- WebSocket fan-out and resumption metadata

The Durable Object is the only writer of canonical live-session state. A
request handler, queue consumer, analytics task, AI adapter, media provider, or
client cannot write scenario truth directly.

## Data Placement

Cloudflare D1 will hold account-level and catalog-level relational data that is
not the live session authority, such as identity bindings, host eligibility,
event and scenario-version references, pairing records, and deletion-workflow
state. D1 records may reference a session identifier but do not duplicate the
canonical live journal.

Cloudflare R2 will hold immutable, content-addressed or version-addressed
scenario bundles and other approved static artifacts. A session pins an exact
scenario version before play. Published content never changes underneath an
active session.

Durable Object SQLite holds the authoritative live journal, replay metadata,
and only the minimum session material needed for recovery. Transient
connections and projections remain in memory or reconstruct from the journal.
Private messages, audio, video, transcripts, and recordings are not added to
the canonical journal by default.

Cloudflare Queues may perform noncanonical work such as deletion jobs,
notifications, export preparation, and allowlisted operational processing.
Delivery from a queue never silently becomes scenario truth and must be safe
under retry.

Cloudflare Containers are not part of the initial request path. They remain an
optional later adapter for workloads that genuinely require a long-running
process, native binary, or heavier AI computation. Container startup and
lifetime can therefore never determine whether a live game remains coherent.

## Deterministic Engine Boundary

The pure `gp_scenario` Rust crate remains the canonical engine implementation.
The local server links it natively. The remote service will call an explicitly
versioned WebAssembly boundary produced from the same engine after that build
toolchain and its dependencies pass ADR 0025 intake.

JavaScript or TypeScript orchestration may validate transport shapes, map
provider APIs, and serialize calls into that boundary. It must not independently
reimplement scenario transitions. The journal records the scenario schema
version, scenario version, event version, and sequence required for deterministic
replay. Wall-clock time and network arrival order are diagnostic inputs, not
scenario truth.

Until the WebAssembly boundary is integrated and parity-tested, the remote
service is development-only and must reject real gameplay, private or licensed
content, and production identity.

## Protocol and Authorization

The remote gateway preserves control-plane major version 1, including the
canonical envelopes, `/api/protocol`, `/api/v1/join`, `/ws/v1`, the
`guiltyparty.control.v1` WebSocket subprotocol, correlation identifiers,
idempotency identifiers, and journal-derived `server_sequence`.

The local prototype's synthetic LAN join token is not promoted into production
authentication. Production join and pairing will use the approved account and
device-authority model. Credentials remain out of URLs, application envelopes,
logs, browser storage, and Durable Object names. Every command is authenticated,
authorized, and projected for its recipient on the server. UI hiding never
enforces a secret.

Opaque, unguessable external session identifiers are mapped to Durable Object
instances through a server-controlled namespace. Logs and metrics use a
separate nonreversible operational correlation value where one is needed.

## Control and Media Separation

The Worker and session Durable Object are the control-plane authority.
Cloudflare Realtime is the initial candidate for official remote media, behind
the provider boundary established by ADR 0010. The Durable Object issues
short-lived, audience-limited media grants; the media provider cannot infer or
expand scenario permissions.

The managed LAN server continues to use the native Rust engine and the approved
self-hostable media path. A Cloudflare account must not become a runtime
dependency for an explicitly selected local event.

Provider adoption does not itself prove private-audio isolation, end-to-end
encryption suitability, retention behavior, regional controls, or participant
consent. Remote media remains disabled until the negative routing tests,
provider intake, privacy review, and human approval required by ADRs 0010
through 0014 and 0025 are complete.

## Lifecycle, Recovery, and Exit

Environments use distinct Cloudflare resources, bindings, secrets, and access
policies. Development and staging use synthetic users and original test
content. Production credentials never enter source control or shared local
configuration.

Each retained server-side category requires a purpose, access boundary,
retention period, deletion trigger, and testable deletion mechanism before
production use. Session completion schedules expiry under the approved data
lifecycle. Backups and exports do not silently extend retention.

Recovery is journal-first. A new Durable Object activation reconstructs state
from persisted entries and verifies continuous sequence, scenario identity,
event version, and deterministic replay before accepting a command. A failed
verification closes the session to mutation and exposes only safe diagnostics.

The project maintains a versioned export format for scenario bundles, global
relational records, canonical session journals, and required identity mappings.
Provider-specific identifiers stay behind adapters. A replay suite must prove
that exported journals reconstruct the same authorized state outside
Cloudflare. This bounds, but does not eliminate, migration work.

## Deployment Gates

The following are separate owner-controlled gates rather than consequences of
merging the service skeleton:

1. approval of Cloudflare service terms, billing, account security, and data
   processing choices
2. approval and inventory of Wrangler, Worker type packages, WebAssembly build
   tools, and every other third-party package under ADR 0025
3. creation of isolated development, staging, and production resources
4. production identity, deletion, retention, abuse, and incident-response
   readiness
5. deterministic native/WebAssembly parity, replay, idempotency, authorization,
   projection privacy, WebSocket resumption, and failure-injection evidence
6. remote media provider privacy, security, licensing, consent, isolation, and
   removal evidence
7. TLS, domain, DNS, secret-management, observability, rollback, backup, export,
   and restore rehearsal
8. explicit human approval before external testing or production traffic

# Consequences

- Low-traffic sessions can hibernate without paying for a permanently running
  game process, while storage preserves the session through reconnects.
- A single per-session authority makes ordering and idempotency easier to reason
  about than a stateless multi-writer design.
- Cloudflare-specific adapters and deployment configuration become part of the
  remote service and require testing and an exit plan.
- Durable Object storage, D1, and R2 have different consistency and lifecycle
  roles; operations and migrations must preserve those boundaries.
- The remote service has an intentional development-only phase while the shared
  WebAssembly engine, production identity, and provider reviews are completed.
- The local native server remains a supported separate mode rather than a
  degraded Cloudflare client.

# Alternatives Considered

## Containerized Axum service with PostgreSQL

This would reuse more of the current server process and remains a viable exit
path. It was not selected for the initial official remote service because a
continuously available process and managed database impose higher idle cost and
operations work for the MVP.

## Cloudflare Container as the live session authority

This would preserve the native executable but couple session availability to
container activation and lifecycle. It is retained only for optional heavy
adapters; the Durable Object remains canonical.

## Stateless Workers with D1-only coordination

This would minimize service types but require multi-request concurrency control
and polling or separate realtime coordination for every game. It was rejected
because a live session has a natural single-writer boundary.

## All-Rust Worker using `workers-rs`

This could reduce language boundaries, but it would couple the deterministic
engine to Cloudflare orchestration APIs and a larger provider-specific Rust
surface. It remains reconsiderable if measured maintenance or safety evidence
shows a clear advantage.

## Reimplement the scenario engine in JavaScript or TypeScript

This was rejected because two canonical engines would invite semantic drift and
weaken deterministic replay evidence across local and remote modes.

## Adopt remote services and remove local operation

This was rejected because ADR 0018 explicitly preserves a managed local mode,
and privacy-sensitive or disconnected events must not acquire an unnecessary
cloud runtime dependency.

# References

- [Cloudflare Durable Objects documentation](https://developers.cloudflare.com/durable-objects/)
- [Durable Objects WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Cloudflare D1 documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 documentation](https://developers.cloudflare.com/r2/)
- [Cloudflare Realtime documentation](https://developers.cloudflare.com/realtime/)
- [Cloudflare Queues documentation](https://developers.cloudflare.com/queues/)
- [Cloudflare Containers documentation](https://developers.cloudflare.com/containers/)
- [ADR 0005: Versioned Control-Plane Contract](0005-versioned-control-plane-contract.md)
- [ADR 0010: Media-Plane Protocol and Provider](0010-media-plane-protocol-and-provider.md)
- [ADR 0018: Desktop Host and Managed Local Server](0018-desktop-host-and-managed-local-server.md)
- [ADR 0025: Third-Party Dependency Governance](0025-third-party-dependency-governance.md)
