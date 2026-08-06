# Mobile Companion Decision Register

## Purpose

This register is the durable queue for unresolved Mobile Companion product,
architecture, privacy, media, delivery, and team decisions. It exists so the
project can discuss one question at a time without losing the remaining work
when a conversation is compacted, handed off, or restarted.

Accepted product direction is recorded separately in
[Mobile Companion Product Decisions](../product/mobile-companion.md). This
register does not turn a recommendation into a decision. A significant
technical choice becomes authoritative only after the appropriate ADR is
accepted.

## Status Vocabulary

- **Active:** the one question currently being discussed.
- **Open:** recorded and awaiting its turn.
- **Deferred:** deliberately postponed by the project owner, not forgotten.
- **Blocked:** cannot be decided until a named dependency is resolved.
- **Accepted:** decided and moved to the authoritative product or ADR document.
- **Superseded:** replaced by another identified decision.

## Resume Protocol

Use this process in this or any future conversation:

1. Read the accepted mobile product decisions and this register.
2. Discuss only the item under **Current Discussion**.
3. Record the owner's answer, date, rationale, and any resulting follow-up under
   that stable ID.
4. Update the authoritative product document or ADR when appropriate.
5. Mark the item accepted, deferred, blocked, or superseded.
6. Promote exactly one unblocked item from the ordered queue to **Active**.

If a conversation is lost, the next collaborator can resume by naming the
active ID. New questions receive new IDs and are added to the queue; existing
IDs are never renumbered or silently removed.

## Current Discussion

### MC-ARCH-004: Desktop Host Application with Embedded LAN Server

**Status:** Active

**Why next:** The mobile strategy and Android entry checkpoint are accepted,
and the LAN trust model already permits the same installation-specific server
identity if a future desktop host application supervises the server. Deciding
the product boundary now clarifies the intended isolated-LAN operating model
without selecting a desktop framework or authorizing implementation.

**Decision question:** Should a future host-oriented desktop application embed,
install, start, stop, update, monitor, and recover the Guilty Party LAN server;
which responsibilities remain in the server; and what lifecycle, storage,
migration, trust, and failure boundaries must the combined product preserve?

No answer or recommendation is recorded yet. The next discussion should address
only this question.

## Accepted Decision History

### MC-ARCH-003: Android Prototype Timing

**Status:** Accepted

**Decision date:** 2026-08-06

**Decision:** Android remains outside the current MVP. The first Android
prototype begins after the version 1 schemas and fixtures are stable; a pinned
pipeline reproducibly generates usable Swift and Kotlin DTOs; the server and
physical iOS/iPadOS Companion complete joining, authorized private projection,
participant actions, voting, outcome, deterministic replay, and temporary
disconnection recovery; the owner accepts at least one full playtest as a
sufficiently stable baseline; and MC-DEL-001 establishes the minimum supported
Android version. Once that checkpoint is met, Android begins before substantial
new iOS-only product expansion. Its first slice is limited to generated Kotlin
DTOs, an adaptive Compose phone/tablet shell, development-LAN connection and
join, private projection display, one idempotent player action, reconnection,
and checks on a representative physical phone and tablet-class device.
Production accounts, media, payments, notifications, analytics, distribution,
and unrelated parity are excluded from that slice.

**Rationale:** The checkpoint avoids duplicating unstable prototype work while
ensuring Android validates the cross-platform contract before Apple-specific
assumptions or indefinite deferral become entrenched.

**Consequences:** Android waits for the contract, iOS gameplay, resumption,
playtest, and OS-support evidence. Some iOS expansion may pause while the
Android baseline catches up, and representative Android hardware is required.

**Recorded in:** [ADR 0017](../adr/0017-android-prototype-entry-checkpoint.md)

### MC-NET-002: Generated Contract Models

**Status:** Accepted

**Decision date:** 2026-08-06

**Decision:** Generate data-only Swift and Kotlin transport DTOs from the
committed canonical contracts. JSON Schema remains authoritative for payload,
envelope, and shared error shapes; OpenAPI remains authoritative for HTTP
operation metadata while referencing those schemas; WebSocket messages reuse
the same schemas. Generated code is a derived artifact, clearly marked, not
edited by hand, and isolated from handwritten networking adapters,
application-domain models, UI, authorization, scenario truth, persistence, and
logging policy. Generated outputs are committed so ordinary Xcode and Gradle
builds work offline. Pinned tooling regenerates them in CI and fails on drift.
Clients tolerate additive unknown fields, preserve null and absence semantics,
and route unsupported discriminators or security-critical variants to a safe
incompatibility or resynchronization path. Shared positive, negative,
compatibility, Unicode, boundary, and privacy fixtures verify each language.
The exact generator requires a focused Swift/Kotlin compatibility evaluation
and dependency, license, security, and maintenance review before adoption.

**Rationale:** Mechanical generation reduces Swift/Kotlin representation drift
without making generated language types authoritative or moving sensitive
policy into a tool-controlled layer.

**Consequences:** The repository carries generated source and a pinned
generation pipeline, contract changes produce larger diffs, and both apps need
explicit mapping code. Generator selection and implementation remain future
work and do not expand the MVP.

**Recorded in:** [ADR 0016](../adr/0016-generated-mobile-contract-models.md)

### MC-ARCH-001: Long-Term Mobile Implementation Strategy

**Status:** Accepted

**Decision date:** 2026-08-06

**Decision:** Guilty Party will build separate native player Companion
applications: Swift and SwiftUI for one adaptive iPhone/iPad codebase, and
Kotlin and Jetpack Compose for one adaptive Android phone/tablet codebase. The
browser Companion remains an HTML/CSS/JavaScript fallback, while Rust remains
the authoritative server and deterministic scenario-engine language. The
native clients share versioned schemas, fixtures, behavioral acceptance tests,
design semantics, and original assets where appropriate, but initially share no
mobile runtime or UI framework. Flutter, React Native, Kotlin Multiplatform,
Compose Multiplatform UI, and mobile WebAssembly are not adopted initially.
Kotlin Multiplatform may be reconsidered only for proven platform-independent
duplication under a later measurable threshold. Platform-specific adapters own
authentication, protected storage, local discovery and trust, media and audio,
privacy surfaces, and lifecycle integration. Separate clients must conform to
the same behavioral and privacy contracts but need not be pixel-identical or
released simultaneously.

**Rationale:** The accepted authentication, networking, privacy, and media
requirements depend heavily on native operating-system behavior. Sharing
contracts and evidence reduces semantic drift without adding a cross-platform
runtime to those sensitive boundaries before duplicated logic is demonstrated.

**Consequences:** The project accepts two mobile toolchains and some duplicated
presentation or orchestration code. Contract-model generation, Android timing,
Kotlin Multiplatform reconsideration thresholds, team ownership, and release
parity remain separate decisions. The account-free iOS MVP scope is unchanged.

**Recorded in:** [ADR 0015](../adr/0015-native-mobile-client-strategy.md)

### MC-MEDIA-005: Shared and Personal Microphone Arbitration

**Status:** Accepted

**Decision date:** 2026-08-06

**Decision:** Each physical room has at most one room-audible capture lease,
owned by the control plane and enforced by the media adapter. Personal sources
bind participant and endpoint; shared sources belong to the room and remain
`Room microphone` unless the current speaker explicitly accepts attribution.
No voice or AI inference identifies the speaker. Requests and host queue actions
never open capture. The current speaker must hold push-to-talk or confirm a
bounded activation; hosts may invite, reorder, cancel, close, or safety-stop but
cannot remotely unmute or silently activate an endpoint. Ordinary requests do
not preempt the active speaker, while safety, authorization, privacy, and route
failure do. Transfer is break-before-make with generation checks and required
Stage-ducking acknowledgment. The technical lease lasts at most 15 seconds and
renews every five seconds. Hold-to-talk ends on release; queued tap or assistive
requests require fresh confirmation when selected; any latched activation has
an initial 120-second maximum before explicit renewal. Public queue and active
state are visible without private or diagnostic details. AI may suggest an
order but holds no lease authority, and arbitration remains ephemeral rather
than scenario truth.

**Rationale:** One short-lived, server-authoritative role prevents co-located
overlap while preserving speaker consent, accessible activation, room/device
separation, host facilitation, and bounded failure behavior.

**Consequences:** The control protocol and media adapter need request,
reservation, generation, renewal, expiry, provider revocation, Stage ducking,
and break-before-make acknowledgments. Clients need public queue, active-source,
timer, accessible activation, and safety-stop UX.

**Recorded in:** [ADR 0014](../adr/0014-room-microphone-arbitration.md)

### MC-MEDIA-004: Private-Audio Route Failure

**Status:** Accepted

**Decision date:** 2026-08-06

**Decision:** Private capture, publication, subscription, decoding, and playback
stop when authorization, server-enforced audience, E2EE key epoch, endpoint
authority, personal output, or provider enforcement is absent or uncertain.
Output change, endpoint transfer, restart, and reconnect require revalidation,
a new key epoch where applicable, and affirmative resume. Interrupted speech is
not queued, retained, retransmitted, or replayed, and possible partial delivery
is reported honestly. Recovery first revalidates the same route, then another
authorized personal endpoint, a private text or ephemeral caption alternative,
a scenario-defined adaptation or minimum-information host assistance, and
finally pause or cancellation. No path broadens the audience, weakens
encryption, or admits Stage, speaker, another participant, recording,
transcription, or AI. Sender, recipients, authorized host tools, Stage, and
unrelated participants receive audience-minimized statuses. Possible unintended
output or subscription is a potential exposure with direct affected-party
notice and minimized non-content security metadata, not an ordinary network
error. Route failure is not scenario truth, though an approved gameplay pause
or alternative may be journaled.

**Rationale:** Stopping before recovery prevents a technical failure from
silently becoming a privacy downgrade, while explicit resume and truthful
partial-delivery status preserve participant agency and trust.

**Consequences:** Clients and media infrastructure need route-state
acknowledgment, buffer clearing, key-epoch rotation, active grant revocation,
audience-specific notices, and potential-exposure handling. Platform-specific
Bluetooth and interruption mechanics remain MC-MEDIA-003, and safety-event
retention still requires an approved lifecycle.

**Recorded in:** [ADR 0013](../adr/0013-private-audio-route-failure.md)

### MC-PRIV-005: Capture Indicators and Consent UX

**Status:** Accepted

**Decision date:** 2026-08-06

**Decision:** System microphone and camera permissions are requested just in
time after a user action and never publish or authorize processing by
themselves. Live microphone and camera capture requires endpoint-owner
activation, persistent labeled in-product and platform indicators, immediate
stop controls, and affirmative resume after restart, endpoint replacement, or
unexpected interruption. Public route state is visible to affected public
surfaces, while private-route state remains within its authorized audience.
Verified recipient-local, ephemeral accessibility captions may be used without
group veto or identifying the user; they cannot persist, leave the endpoint, or
reach another processor. External captions, transcription, recording, and AI
media access require affirmative consent from every affected participant,
specific purpose, scope, audience, processor, and retention notice, named
persistent indicators, and renewed consent after scope change. Hosts cannot
consent for players or expose who declined. Withdrawal stops the route. Minimal
consent evidence is control-plane audit data, not scenario truth or media
content, and its production collection is blocked until MC-PRIV-002 approves a
retention and deletion lifecycle. Background mobile capture is not initially
supported.

**Rationale:** Separating permission, live transport, derived processing, and
retained records gives people meaningful control while preserving private
accessibility accommodations and avoiding public disclosure of private routes.

**Consequences:** Clients and servers need acknowledged capture states,
persistent cross-surface indicators, scoped consent and withdrawal, aggregate
host readiness, and fail-closed restart behavior. Higher-risk media features
remain blocked on the deferred data-lifecycle decision.

**Recorded in:** [ADR 0012](../adr/0012-capture-indicators-and-consent.md)

### MC-MEDIA-002: Room Audio Processing Ownership

**Status:** Accepted

**Decision date:** 2026-08-06

**Decision:** The capturing endpoint owns acoustic echo cancellation, noise
suppression, and automatic gain control through its platform or WebRTC
voice-processing path. The rendering endpoint owns its local playback mix and
Guilty Party audio ducking. The control plane owns physical-room membership,
active-microphone authority, route policy, and audience authorization; the
media adapter and SFU enforce track forwarding and logical mix-minus without
normally decoding or mixing media. Full duplex may be used when all Guilty Party
playback audible to the microphone shares its endpoint, or a private headphone
route has no separate room speaker coupled to that microphone. When a Companion
microphone and separate public Stage speaker form the acoustic path,
push-to-talk, one room-audible microphone at a time, and acknowledged Stage
ducking are required. A shared microphone becomes the selected room capture
endpoint. Private routes may coexist only while remaining personal and fail
closed on unexpected route or capability change. Server-side processing
requires a separately approved feature and privacy boundary.

**Rationale:** Only the capture endpoint normally has the hardware route and
playback reference needed for reliable acoustic processing, while the SFU can
prevent incorrect network return paths without gaining plaintext mixing duties.
The split preserves privacy, room awareness, and predictable behavior across
shared and personal endpoints.

**Consequences:** Clients need platform voice-processing integration and route
monitoring. Split-device rooms require coordinated push-to-talk and Stage
ducking. The provider contract needs enforceable room-derived subscriptions,
and physical-device tests must cover coupled, split, shared, and private audio
routes.

**Recorded in:** [ADR 0011](../adr/0011-room-audio-processing-ownership.md)

### MC-MEDIA-001: Media-Plane Protocol and Boundary

**Status:** Accepted

**Decision date:** 2026-08-06

**Decision:** Realtime audio and video use WebRTC through an SFU. Guilty Party
owns a narrow media-provider boundary, with a self-hostable LiveKit SFU as the
initial reference adapter for local, regional, or approved managed deployment.
The control plane remains authoritative for identity, membership, permissions,
communication audiences, consent, and deterministic scenario truth. Clients
receive short-lived, endpoint-bound, pseudonymous provider grants. Private
routes require server-enforced audience denial and application E2EE where no
authorized server processing is needed. Canonical gameplay never moves onto
media data channels. Captions may use encrypted, recipient-scoped ephemeral
media data but are not retained or canonical by default. Recording, egress,
transcription, passive capture, and AI media access remain off by default. Exact
dependencies require licensing and security review, and real private media is
blocked on native LAN-trust, audience-enforcement, expiry, reconnection, and
E2EE integration proofs.

**Rationale:** A standards-based SFU supports low-latency selective routing and
cross-platform clients, while self-hosting preserves isolated-LAN operation and
the owned boundary prevents provider identity or policy from becoming product
authority.

**Consequences:** Guilty Party must operate or procure SFU and TURN capacity,
implement one adapter, distribute E2EE keys, use short-lived grants for
self-hosted revocation limits, and prove the ADR 0008 trust model through the
native provider SDKs. Provider selection does not waive dependency intake or
license review.

**Recorded in:** [ADR 0010](../adr/0010-media-plane-protocol-and-provider.md)

### MC-PRIV-006: Missing Private-Capability Fallback

**Status:** Accepted

**Decision date:** 2026-08-06

**Decision:** Scenarios declare required private capabilities and ordered safe
alternatives. Preflight asks about functional readiness without diagnoses, and
hosts see only readiness and remedies. Fallback order is another authorized
personal endpoint; an equivalent private modality or timing alternative; a
predefined scenario adaptation preserving truth and secrecy; explicit-consent,
minimum-information host assistance with participant confirmation; then a pause.
Timers pause without penalty, content remains hidden, and other participants
receive a generic pause message. AI may suggest only authorized scenario-defined
alternatives and receives no private accessibility information. Private content
never falls back to a shared Stage or speaker, another participant's endpoint,
lock-screen notification, unsecured channel, AI disclosure, or unauthorized
recording or transcription. The product neither requires disability disclosure
nor pressures a public workaround. Publication validation rejects a required
private interaction without a safe fallback or explicit pause behavior.

**Rationale:** Accessibility and reduced capability must preserve secrecy,
participant agency, deterministic truth, and creator rights rather than turning
a missing endpoint feature into public disclosure.

**Consequences:** Scenario schemas, creator validation, preflight UX, timer
control, alternative modalities, and consent-limited host assistance all require
implementation and testing. Some sessions must pause when no safe path exists.

**Recorded in:** [MC-PROD-013](../product/mobile-companion.md#mc-prod-013-safe-private-capability-degradation)

### MC-NET-007: Connection and Resumption Policy

**Status:** Accepted

**Decision date:** 2026-08-06

**Decision:** Connection establishment allows ten seconds for transport and five
seconds for authenticated negotiation. The server sends application heartbeats
every 15 seconds. At 30 seconds without authenticated activity, clients enter a
connection-uncertain state, cover private content, and disable actions; at 45
seconds they disconnect; after five minutes host tools label the endpoint stale.
One immediate retry follows an interface or foreground change, then full-jitter
backoff progresses around 1, 2, 4, 8, 15, and 30 seconds, capped at 30 seconds
and reset after 60 stable seconds. Certificate, identity, protocol, revocation,
removal, and session-end failures stop automatic retry. Background connectivity
is not promised. Resume requests provide endpoint authority, last server
sequence, authority generation, and unresolved command IDs. The server returns
an authorized delta or fresh projection and never accepts client state as
canonical. Clients apply it atomically. Gaps or impossible state trigger resync.
State-changing commands use idempotency IDs and authority generations; unknown
outcomes are resolved rather than resubmitted under new IDs. Disconnected or
stale presence never revokes an endpoint or changes participant, character, or
primary authority.

**Rationale:** Shared health and resumption rules preserve privacy and
determinism through ordinary network loss, app suspension, and server restart
without duplicate actions or false canonical state.

**Consequences:** Projection deltas and idempotency outcomes need bounded
retention. Poor connections may cover private content, and every client needs a
tested resynchronization state machine.

**Recorded in:** [ADR 0009](../adr/0009-connection-resumption-policy.md)

### MC-NET-006: Local Certificate and Trust Model

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** Every LAN server creates an installation-specific private
certificate authority and server identity key in protected host storage; no
universal private key is shared among installations. It issues and locally
renews short-lived leaf certificates for current LAN names and addresses. QR
pairing binds the invitation to the authority fingerprint, while short-code or
manual flows require a human-comparable authentication string. Native clients
perform application-controlled validation anchored to the paired authority and
never treat discovery or first contact as trust on first use. Leaf renewal does
not require re-pairing. Planned authority rotation is authenticated by the old
authority and visibly announced. Loss, corruption, unauthenticated change, or
server replacement creates a new identity, invalidates local endpoint and
session authority, and requires explicit re-pairing; names, addresses, and
database restores cannot transfer trust. Public services use publicly trusted
certificates. Generic browser fallback uses a publicly trusted HTTPS origin;
fully isolated LAN browsers require operator-managed trust provisioning, and
ordinary guests are not asked to install roots or bypass warnings. A zero-install
consumer browser fallback on a completely isolated LAN is not initially
guaranteed. The same model applies if a future desktop host app embeds the LAN
server, but that packaging decision remains open.

**Rationale:** Pairing-authenticated, per-installation trust enables native
isolated-LAN operation without a shared impersonation key or unsafe browser
warning behavior.

**Consequences:** Losing the server authority requires re-pairing absent a later
approved encrypted migration design. Generic isolated-LAN browser support is
limited, and native trust evaluation requires focused security testing. A
future combined desktop host/server remains MC-ARCH-004.

**Recorded in:** [ADR 0008](../adr/0008-lan-server-certificate-trust.md)

### MC-NET-005: HTTPS/WSS Enforcement Milestone

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** HTTP/WS is permitted only for loopback tests, synthetic local
development, and the account-free placeholder MVP under an explicitly enabled
development LAN profile. That profile is absent from beta and release builds,
binds only to selected private or link-local interfaces, displays a persistent
unencrypted warning, rejects real authentication and private or licensed data,
and never activates after TLS failure. HTTPS/WSS becomes mandatory before real
authentication, non-synthetic participant information, non-placeholder private
or licensed content, external testing or distribution, untrusted or routed
networking, and commercial or production deployment. Beta and release mobile
configurations reject cleartext. Clients never continue insecurely after TLS
or server-identity failure. A plaintext listener may redirect a non-sensitive
browser navigation but does not accept credentials, authority, private
projections, commands, or WebSocket upgrades. Media-plane authenticated
encryption remains separately required before carrying user media.

**Rationale:** The narrow exception preserves current prototype work while
placing transport security before every capability that creates real privacy,
identity, content-rights, or distribution risk.

**Consequences:** External tests and account work are blocked until the local
certificate and trust model is implemented. Development and release network
policies must be separate and covered by negative cleartext tests.

**Recorded in:** [ADR 0007](../adr/0007-control-plane-transport-security.md)

### MC-NET-003: LAN Service Discovery Metadata

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** Local servers advertise `_guiltyparty._tcp.local.` through DNS-SD
over mDNS on explicitly eligible LAN interfaces, with IANA registration of the
service name required before production distribution. A privacy-neutral default
instance name uses a short random display suffix and is never treated as server
identity. The single TXT record contains only `txtvers=1`, `protovers=1`, and
`tls=1`; detailed compatibility comes from the non-private HTTPS compatibility
endpoint. Session, host, participant, room, scenario, joining, account,
credential, address, certificate, and stable tracking data are not advertised.
Discovery is an untrusted address and protocol hint, while server identity and
authority come only from TLS and pairing. Several unpaired candidates produce a
chooser; remembered servers reconnect only after authenticated identity
verification. Advertisement remains active while the local control plane is
available, including while joining is closed. Scope is link-local by default,
excluding cellular, VPN, WAN, wide-area DNS-SD, and cross-subnet relays. QR or
code pairing and manual addressing remain fallbacks.

**Rationale:** The service is discoverable across intended LAN clients without
putting private session details or a spoofable trust signal into multicast
metadata.

**Consequences:** Multicast-blocked networks require a fallback. Production
requires service-name registration, and TLS trust, Android permission UX, and
cross-subnet discovery remain separate decisions.

**Recorded in:** [ADR 0006](../adr/0006-link-local-service-discovery.md)

### MC-NET-001: Versioned Control-Plane Contract

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** Control-plane protocol version `1.0` begins with major-versioned
HTTP routes under `/api/v1/...` and a negotiated, major-versioned WebSocket
subprotocol such as `guiltyparty.control.v1`. An unversioned, non-private
compatibility endpoint advertises supported majors and upgrade information.
JSON Schema Draft 2020-12 is canonical for payloads; OpenAPI 3.1-compatible
documents describe HTTP, and WebSocket documentation reuses the same schemas
with optional AsyncAPI metadata. WebSocket messages share a typed envelope with
message and correlation identifiers, applicable session and endpoint context,
server sequence, command idempotency, and a validated payload. Additive fields
and negotiated features remain within a major; incompatible input, meaning,
authorization, secrecy, or ordering changes require a new major. Servers do not
send unnegotiated features. HTTP errors use RFC 9457 Problem Details, while
WebSocket errors use matching safe codes in the envelope. Schemas, fixtures,
compatibility tests, privacy tests, and deterministic transport tests precede
generated or manually maintained client models. Supported native clients retain
a compatible server protocol through a documented migration window.

**Rationale:** Explicit, language-neutral negotiation and evolution rules keep
independently released clients interoperable without allowing contract changes
to weaken privacy, authorization, or deterministic scenario behavior.

**Consequences:** Contract artifacts and compatibility support add maintenance.
The exact model-generation strategy, discovery metadata, retry policy, and
major-version retirement window remain separate decisions.

**Recorded in:** [ADR 0005](../adr/0005-versioned-control-plane-contract.md)

### MC-ID-006: Host Controls for Lost Endpoints

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** The primary host and co-hosts explicitly authorized to manage
participants may inspect a minimal operational endpoint roster, revoke an
endpoint, transfer primary authority among endpoints already authenticated for
the participant, remove a participant from the session, or approve session-only
recovery when a replacement endpoint lacks usable account proof. Host-assisted
recovery requires selecting the existing participant and confirming the
requesting endpoint; it revokes the participant's former endpoints by default
and grants authority that ends with the session. It cannot authenticate or
modify the permanent account, create authentication bindings, change recovery
information, or grant access outside the session. Normal account authentication
may reclaim the participant. Revocation immediately stops private projections,
actions, and media authority, invalidates session credentials, and remains
effective while the endpoint is offline. Removing a participant revokes all
their session endpoints without affecting the account. Offline status alone
does not revoke authority. Operations require explicit confirmation and a
minimal control-plane audit record. Character reassignment and deterministic
participation changes are explicit scenario-journal events. The AI Stage
Manager and support personnel cannot perform or override these operations.

**Rationale:** Hosts can resolve live-session device failures without acquiring
permanent account-recovery power, viewing credentials, or silently changing
canonical story state.

**Consequences:** The UI must distinguish endpoint revocation, session-only
recovery, participant removal, and character reassignment. Concrete audit
retention and user-facing labels remain later decisions.

**Recorded in:** [Host Endpoint Management](../architecture/device-and-room-model.md#host-endpoint-management) and [MC-PROD-004](../product/mobile-companion.md#mc-prod-004-move-between-personal-devices)

### MC-ID-008: Simultaneous Personal Endpoints

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** One participant may keep several personal endpoints registered
and connected, but exactly one is the primary private endpoint at a time. Only
the primary receives complete private projections and submits ordinary
participant actions; standby endpoints receive non-private connection status
and may request a transfer. After authentication, choosing "Use this device"
atomically transfers primary authority without requiring the former endpoint's
approval. The former primary immediately loses private-view and action
authority, is notified, and clears its private view. Commands identify the
endpoint, use an idempotency identifier, and carry the current server-issued
authority generation so stale commands are rejected. Shared Stages cannot hold
primary private authority. Future capability-specific leases may authorize a
narrow function on another endpoint without creating a second general-purpose
primary endpoint. Endpoint revocation invalidates its credentials and
disconnects it.

**Rationale:** A server-controlled primary-authority generation supports quick
device replacement while preventing concurrent secret exposure and conflicting
participant actions.

**Consequences:** Host controls for lost endpoints and host-assisted session
recovery remain MC-ID-006. Exact transfer notifications, timeouts, and
capability-specific media authority remain later decisions.

**Recorded in:** [Primary Private Endpoint Authority](../architecture/device-and-room-model.md#primary-private-endpoint-authority) and [MC-PROD-004](../product/mobile-companion.md#mc-prod-004-move-between-personal-devices)

### MC-ID-007: Independent Identity Recovery

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** A durable account is recovered only through accepted account
authentication or recovery proof. After authentication, the server recovers
the existing account-to-session participant relationship instead of creating a
duplicate; by default, one account has at most one active participant identity
in a session. A valid endpoint-bound resume credential recovers that endpoint,
while another app installation or browser profile receives a new endpoint
identity and is separately attached to the recovered participant. It never
inherits the former endpoint's credentials. Character assignment and private
state follow the participant rather than the endpoint. Display names, device
identifiers, network addresses, proximity, and pairing invitations cannot prove
or recover an account or participant. A LAN server may accept a valid
offline-admission assertion; without usable account proof, it requires an
explicit host-assisted recovery path rather than inferring identity.

**Rationale:** Independent identity layers let a player change devices without
duplicating participation or treating a device as a person, while preserving
server-side authorization and private-state boundaries.

**Consequences:** Whether old and replacement endpoints may remain active
together, and which endpoint may receive private content or submit participant
actions, remains MC-ID-008. The host-assisted recovery mechanism remains
MC-ID-006.

**Recorded in:** [Identity Recovery Boundaries](../architecture/device-and-room-model.md#identity-recovery-boundaries) and [MC-PROD-004](../product/mobile-companion.md#mc-prod-004-move-between-personal-devices)

### MC-ID-024: Server-Side Credential Storage

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** Permanent account authority retains only WebAuthn public-key
credential records, Apple and Google issuer-and-subject bindings, the encrypted
verified recovery email, and minimal security, acceptance, and revocation
metadata. Provider access and refresh tokens are not retained when a provider
is used only for authentication. Bearer credentials are random and opaque; the
server stores keyed digests with the digest key outside the credential database.
Account sessions, native refresh credentials, browser sessions, and
gameplay-session resume credentials are separate authority classes scoped to
the relevant account, endpoint, audience, and game session. Refresh and resume
credentials rotate after successful use; reuse revokes their credential family.
Revocations are durable and act at the appropriate account, endpoint, or game
scope. Account and security storage is logically separated from scenario
content and journals. An isolated-LAN server receives no permanent credential
record, provider token, or recovery address; it may verify only a bounded,
signed, audience-restricted offline-admission assertion and retain the minimum
session authority needed for admission, reconnect, and local revocation.
Security stores, backups, and trusted-component connections are encrypted, and
administrative access is restricted and auditable. Raw credential material is
excluded from logs and analytics.

**Rationale:** This limits the value of database, log, LAN-host, and gameplay
system compromise while supporting revocation, account recovery, isolated-LAN
admission, and deterministic session restoration.

**Consequences:** Concrete token lifetimes, database products, encryption and
digest keys, secrets management, retention, and infrastructure providers remain
separate decisions. The local server needs a trust mechanism for verifying
offline-admission assertions without acquiring permanent account authority.

**Recorded in:** [Server-Side Credential Storage](../security/security-model.md#server-side-credential-storage)

### MC-ID-023: Browser Companion Credential Storage

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** Browser passkeys use WebAuthn so private keys remain with the
authenticator. Account and session authority uses an opaque, server-managed
identifier in a host-only `__Host-` cookie marked `Secure`, `HttpOnly`, and
`SameSite=Strict`, with `Path=/` and no `Domain` attribute. A narrowly scoped,
short-lived `SameSite=Lax` correlation cookie is permitted only when an
external identity-provider return flow requires it. Access tokens, refresh
tokens, session identifiers, and resume credentials never enter
`localStorage`, `sessionStorage`, IndexedDB, service-worker or HTTP caches,
URLs, logs, or analytics; transient proof remains in memory. Non-secret
preferences and identifiers may use ordinary browser storage. A bounded
persistent cookie may provide browser-restart continuity. Sign-out, account
removal, endpoint revocation, or invalid authority deletes the cookie where
possible and invalidates the server session.

**Rationale:** Server-managed, script-inaccessible cookies reduce exposure to
credential theft while preserving reconnect and browser-restart continuity for
the Companion fallback.

**Consequences:** Exact session lifetime, rotation, and "remember this browser"
UX remain separate decisions. Authenticated browser operation requires
HTTPS/WSS, so production LAN browser access is blocked on the local certificate
and trust design. Persistent private-gameplay caching remains deliberately
deferred under MC-PRIV-002.

**Recorded in:** [Browser Companion Credential Storage](../security/security-model.md#browser-companion-credential-storage)

### MC-ID-005: Native Companion Credential Storage

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** Passkey private keys remain in the operating system credential
manager, and short-lived access tokens remain in memory. The native Companion
may persist only an opaque, device-bound refresh credential and the minimum
opaque session-resume credential. iOS and iPadOS use Keychain storage with
device-only accessibility. Android uses application-private ciphertext
protected by an app-specific, non-exportable Android Keystore key. Session
authority does not sync, transfer, or migrate to another device; another device
reauthenticates and receives new endpoint authority. Non-secret identifiers may
use ordinary application-private storage, but credentials never enter
`UserDefaults`, ordinary `SharedPreferences`, logs, analytics, source files, or
general backups. Sign-out, account removal, endpoint revocation, or
unrecoverable authority deletes the applicable local credential and invalidates
it server-side where applicable.

**Rationale:** Platform-protected, device-bound storage permits low-friction
resumption without turning portable client storage, backups, or diagnostic
systems into bearer-credential channels.

**Consequences:** Browser credential storage and server-side verifier storage
remain separate decisions. This decision does not authorize persistent caching
of private gameplay content, which remains deliberately deferred under
MC-PRIV-002.

**Recorded in:** [Native Companion Credential Storage](../security/security-model.md#native-companion-credential-storage)

### MC-ID-022: Participant Recovery After Server Restart

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** The server reconstructs canonical scenario state from the exact
immutable scenario version and ordered journal. It restores durable session and
participant identities, character and room associations, endpoint
registrations, permissions and revocations, and completed admission and
idempotency records needed to prevent duplication. It does not restore live
connections or presence, ephemeral invitations, pending uncommitted commands,
cached projections, AI suggestions, or media routes. Endpoints begin
disconnected, reauthenticate or resume authority, and receive fresh authorized
projections. A fresh invitation is issued if joining remains open.

**Rationale:** Deterministic state and identity continuity survive restart while
ephemeral transport, AI, projection, and media state is rebuilt rather than
mistaken for canonical truth.

**Consequences:** Missing scenario versions, replay failure, or invalid durable
state fail the session closed for host intervention. Credential persistence,
retry timing, and concrete storage remain separate decisions.

**Recorded in:** [Session Journal Boundaries](../architecture/session-journal.md#server-restart-recovery)

### MC-ID-004: Companion Reconnect After App Restart

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** After temporary disconnection or app restart, the Companion
automatically reconnects to the most recent server and session. Valid stored
authority resumes the same participant, character, and endpoint without
duplicates. The app shows reconnecting and rejoined states and withholds cached
private content until server reauthorization and a fresh projection. Expired or
revoked authority, participant removal or reassignment, session end, or a server
identity mismatch clears stale private content and requires explicit sign-in or
rejoining. A manual rejoin path remains available.

**Rationale:** Recovery is low-friction during ordinary interruption while
private information and participant identity continue to fail closed.

**Consequences:** Credential storage, retry timing, and server-restart recovery
remain separate decisions.

**Recorded in:** [MC-PROD-004](../product/mobile-companion.md#mc-prod-004-move-between-personal-devices)

### MC-ID-021: Pairing Invitation Revocation Effects and UX

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** Revocation immediately invalidates the current invitation and its
grace-period predecessor and cancels pending, unapproved admission requests. It
does not remove admitted participants. A rotation displays its replacement;
closing joining says joining is closed; other revocations say joining is
temporarily unavailable. Applicants receive a generic instruction to scan the
current code or ask the host, without the actor or security reason. The host
receives confirmation and a cancellation count. Revocation cannot be undone;
recovery requires a new invitation.

**Rationale:** Revocation reliably closes the affected admission path without
confusing invitation authority with existing participant authority or exposing
security details.

**Consequences:** The control plane stores a minimal operational audit record
containing invitation and session identifiers, time, actor or automatic reason
category, and cancellation count. It is not a scenario-journal event and
contains no private scenario content. Retention remains subject to the project
data-lifecycle policy.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#security-requirements)

### MC-ID-013: Pairing Invitation Revocation Authority

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** The primary host and a co-host explicitly granted authority to
manage joining may revoke an invitation. The server revokes automatically
when joining closes, the session ends or is cancelled, the invitation is
rotated, its Stage or room is removed, or its security context becomes invalid.
Players, endpoints acting independently, the AI Stage Manager, and ordinary
support personnel cannot revoke invitations. Temporary Stage disconnection and
ordinary throttling do not revoke invitations by themselves.

**Rationale:** Revocation belongs to explicit human session authority and
server-enforced lifecycle or security conditions, without granting policy
control to public endpoints, players, AI, or broad support access.

**Consequences:** Revocation effects, pending-request handling, messaging,
audit records, and recovery UX remain separate decisions.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#security-requirements)

### MC-ID-020: Pairing Admission Throttle and Retry UX

**Status:** Accepted with review triggers

**Decision date:** 2026-08-05

**Decision:** Initial per-endpoint and per-identity defaults permit five new
attempts in one minute. Excess attempts cause a 15-second cooldown, escalating
after repeated excess within ten minutes to 60 seconds and then five minutes.
Pairing throttles never permanently lock out a player. Players receive a
generic message with an approximate retry time but no identification of the
limiting bucket or count of remaining attempts. Identical idempotent retries
remain available. The host sees a general throttle warning and may rotate the
invitation without receiving unnecessary participant details.

**Rationale:** Short, escalating cooldowns constrain automated attempts without
turning pairing controls into a practical denial-of-service mechanism for a
legitimate player or shared room.

**Consequences:** Invitation rotation and revocation authority remain separate
decisions. Emergency aggregate limits may have different thresholds but must
preserve generic messaging and the shared-LAN safeguard.

**Review triggers:** Observed false throttles, automated abuse, host confusion,
join abandonment, or material changes in expected session size.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#security-requirements)

### MC-ID-019: Pairing Admission Rate-Limit Scope

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** New pairing admission attempts are limited primarily per endpoint
and authenticated or provisional identity, with an aggregate per-invitation
limit above expected session capacity, a high per-network-address emergency
ceiling, and a server-wide emergency ceiling. Identical retries under the same
idempotency identifier do not count as new attempts. A shared LAN address is
not the primary limit.

**Rationale:** Layered limits constrain abusive clients and resource exhaustion
without allowing one device or a shared network address to block the rest of a
legitimate group.

**Consequences:** Exact thresholds, cooldown escalation, retry timing, host
controls, and user-facing messages remain separate decisions.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#security-requirements)

### MC-ID-018: Pairing Redemption Idempotency

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** Every pairing admission request has a unique client-generated
attempt ID bound to the invitation, authenticated or provisional identity,
endpoint, and request contents. An identical retry from the same authorized
context returns the same result without duplicating participants, endpoints,
host prompts, or journal events. The same ID with different contents is
rejected; a corrected request uses a new ID.

**Rationale:** Network retries become safe and deterministic without allowing
one player's transaction to be replayed as another player's request.

**Consequences:** Retention of idempotency results, new-attempt rate limits, and
user-facing retry timing remain separate decisions.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#security-requirements)

### MC-ID-012: Invitation Reuse Across Players

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** One valid Stage invitation may initiate admission requests for
multiple players and is not consumed by the first request. Each player
authenticates or establishes a provisional account independently, submits a
separate admission request, and receives distinct participant and endpoint
authority. Expiration, joining closure, or revocation stops further use.

**Rationale:** The Stage invitation is a group entry point for a small party,
not a personal credential or participant identity.

**Consequences:** Redemption transactions still require duplicate suppression,
replay protection, and rate limits, which remain separate decisions.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#security-requirements)

### MC-ID-017: Invitation Expiry Clock Authority

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** The Guilty Party server is the sole authority for invitation
issuance, expiration, and redemption. Stage and Companion clocks cannot extend
validity. Clients derive informational countdowns from server timing, use
monotonic timers locally, and resynchronize when timing materially disagrees.

**Rationale:** A single authority prevents clock skew or endpoint manipulation
from unpredictably changing the invitation's validity.

**Consequences:** Client countdowns are advisory, server redemption decisions
are final, and exact resynchronization thresholds remain implementation details.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#security-requirements)

### MC-ID-016: Invitation Renewal During Disconnection

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** The Stage never creates an invitation locally or extends an
expired invitation. If renewal fails, it removes or disables the expired code,
states that joining is temporarily unavailable, and retries automatically with
bounded backoff. After reconnecting, it confirms that joining remains open and
obtains a fresh server-issued invitation. Pairing failure does not itself remove
joined participants or determine cached Stage behavior.

**Rationale:** This fails closed without presenting a stale code as usable and
recovers without unnecessary host intervention.

**Consequences:** Exact retry timing, invitation clock authority, joined-client
reconnection, and cached Stage behavior remain separate decisions.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#security-requirements)

### MC-ID-015: Invitation Rotation Grace Period

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** After the Stage displays a replacement, the immediately previous
pairing invitation remains redeemable for 120 seconds. The Stage displays only
the replacement. Closing or revoking joining, or ending the session,
invalidates both invitations immediately without a grace period.

**Rationale:** Two minutes accommodates scanning, submission, and minor
authentication or sign-in delays at the rotation boundary without materially
extending the low-authority invitation's exposure.

**Consequences:** Server-disconnection behavior, server-clock authority, reuse,
retry, replay protection, and revocation UX remain separate decisions.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#security-requirements)

### MC-ID-014: Automatic Pairing-Invitation Renewal

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** While joining remains open, the Stage automatically obtains and
displays a replacement when the current pairing invitation expires. Automatic
renewal stops when joining closes, joining is revoked, or the session ends.

**Rationale:** Renewal lets guests continue arriving without repeatedly
interrupting the host, while the host and session lifecycle retain control over
whether joining remains available.

**Consequences:** Rotation overlap, grace period, server-clock behavior,
disconnection behavior, consumption, reuse, and replay protection remain
separate decisions.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#security-requirements)

### MC-ID-011: Pairing Invitation Lifetime

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** One pairing invitation is valid for 15 minutes from its
server-issued time and expires sooner if the session ends or the host revokes
joining.

**Rationale:** Fifteen minutes gives a small group time to scan or enter the
invitation and authenticate without rushing, while limiting exposure from an
old photograph or abandoned display. The invitation itself grants only
discovery and an admission request.

**Consequences:** Automatic renewal, rotation overlap, clock handling, reuse,
retry, replay protection, and revocation UX remain separate decisions.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#security-requirements)

### MC-ID-003: Pairing Invitation Scope

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** A Stage-displayed QR code or short code authorizes only discovery
of the intended server and session, a Companion admission request, minimum
non-private lobby information, and a suggested physical room. It does not
create participant identity or membership, assign permissions or characters,
expose private or scenario information, or activate endpoint capabilities. The
player must authenticate or establish an authorized provisional account,
confirm the session and room, and receive server-authorized membership.

**Rationale:** A copied or photographed invitation permits an admission request
but does not itself grant gameplay or private-data authority.

**Consequences:** Invitation lifetime, renewal, consumption, retry, replay
protection, revocation, and admission approval remain separate decisions.

**Recorded in:** [Device Pairing Boundaries](../architecture/device-pairing.md#invitation-authority)

### MC-ID-010: Permanent-Account Recovery

**Status:** Accepted with review triggers

**Decision date:** 2026-08-05

**Decision:** A permanent account requires one verified recovery email, which
may be a privacy-preserving relay and is used only for security and recovery. A
trusted signed-in endpoint may approve recovery immediately. Recovery from an
unfamiliar endpoint requires email verification and a 24-hour wait, with
notifications and cancellation available through linked providers and trusted
endpoints. Successful recovery revokes existing sessions, requires a new
authentication binding, and temporarily restricts sensitive changes. Support
may facilitate the defined process but cannot override proof requirements with
security questions or personal judgment.

**Rationale:** This is more compatible with ordinary consumer behavior than a
saved recovery key while retaining delay, notification, cancellation, and
post-recovery controls against account takeover.

**Consequences:** The minimum account data now includes a recovery email.
Recovery cannot be guaranteed after loss of every authentication binding,
trusted endpoint, and recovery-email account. Exact notification and temporary
restriction details remain implementation decisions.

**Review triggers:** Observed signup or recovery friction, failed recoveries,
account-takeover attempts, support workload, changes in provider capabilities,
or operating-capacity constraints for the business.

**Recorded in:** [MC-PROD-012](../product/mobile-companion.md#mc-prod-012-consumer-friendly-account-recovery)

### MC-ID-009: Permanent-Account Sign-In Methods

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** The complete initial authentication set is passkeys, Sign in with
Apple, and Sign in with Google. Passwords, SMS login, and email magic links are
not included initially.

**Rationale:** The selected set provides passwordless authentication and broad
coverage across the intended iOS, Android, and browser surfaces without making
email addresses or phone numbers mandatory account data.

**Consequences:** Safe binding and unlinking rules, provider configuration,
account recovery, offline credential behavior, and implementation details
remain separate decisions.

**Recorded in:** [MC-PROD-003](../product/mobile-companion.md#mc-prod-003-minimal-account-required)

### MC-ID-002: Minimum Permanent-Account Data

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** A permanent account requires only an opaque internal user ID, at
least one verified authentication binding, security metadata, and records of
applicable terms and privacy acceptance. Passkeys must launch alongside any
other supported authentication bindings. Real names, persistent display names,
email addresses, phone numbers, birth dates, avatars, and locations are not
mandatory. Session display names are session-specific, and recovery contact
information remains optional unless a later approved requirement justifies it.

**Amendment:** MC-ID-010 later makes one verified, recovery-only email address
mandatory while preserving the other data-minimization requirements.

**Rationale:** This provides continuity and secure authentication while
preserving data minimization and avoiding unnecessary persistent identity data.

**Consequences:** The other launch authentication methods, provider
requirements, recovery methods, and credential implementation remain separate
decisions.

**Recorded in:** [MC-PROD-003](../product/mobile-companion.md#mc-prod-003-minimal-account-required)

### MC-ID-001: Account Entry on an Isolated LAN

**Status:** Accepted

**Decision date:** 2026-08-05

**Decision:** A functional LAN session does not require internet access merely
to join. A previously authenticated player may use a securely cached,
offline-verifiable account session. A new player without internet access may
receive a host-approved provisional account scoped to that session. When
connectivity returns, the product offers to link it to a permanent account.

**Rationale:** This preserves minimal participant identity, convention
walk-ins, and isolated-LAN operation without making a remote identity provider
a runtime dependency.

**Consequences:** Credential design, provisional-account expiry and recovery,
linking mechanics, and permanent account requirements remain separate
decisions.

**Recorded in:** [MC-PROD-003](../product/mobile-companion.md#mc-prod-003-minimal-account-required)

## Deliberately Deferred Decisions

These items were explicitly tabled by the project owner. They stay visible
until the owner chooses to reopen them.

| ID | Decision | Revisit trigger |
|---|---|---|
| MC-PRIV-001 | Content permitted in lock-screen notifications | Before implementing notifications or preparing store privacy disclosures |
| MC-PRIV-002 | Data cached on a Companion and its deletion schedule | Before implementing persistent client storage or production accounts |

## Ordered Open Decision Queue

The order reflects known dependencies. It may change, but an item should not be
discarded merely because it moves.

### Identity, Pairing, and Recovery

No open items. Accepted decisions remain in the history above.

### Control-Plane Networking

| ID | Status | Decision needed | Depends on |
|---|---|---|---|
| MC-NET-004 | Open | Android NSD discovery behavior and nearby-network permission experience | MC-NET-003, MC-DEL-001 |

### Privacy and Safety

| ID | Status | Decision needed | Depends on |
|---|---|---|---|
| MC-PRIV-003 | Open | Platform-specific behavior and honest user messaging for screenshot and screen-recording detection or restriction | MC-DEL-001 |
| MC-PRIV-004 | Open | Crash-report fields, scrubbing, consent, retention, access, and provider constraints | MC-PRIV-002, MC-DEL-006 |

### Media and Device Interruptions

| ID | Status | Decision needed | Depends on |
|---|---|---|---|
| MC-MEDIA-003 | Open | Bluetooth changes, calls, headphones, route changes, backgrounding, and interruption recovery | MC-MEDIA-001, MC-DEL-001 |

### Mobile Architecture and Platform Scope

| ID | Status | Decision needed | Depends on |
|---|---|---|---|
| MC-ARCH-002 | Open | Measurable duplication, staffing, test, or delivery threshold that would justify adopting Kotlin Multiplatform | MC-ARCH-001, MC-ORG-001 |

### Delivery, Compliance, and Maintenance

| ID | Status | Decision needed | Depends on |
|---|---|---|---|
| MC-DEL-001 | Open | Minimum supported iOS, iPadOS, and Android versions based on capabilities and audience coverage | MC-ARCH-001, MC-MEDIA-001 |
| MC-DEL-002 | Open | Physical-device test matrix covering representative phones, tablets, OS versions, network conditions, audio routes, and room arrangements | MC-DEL-001, MC-MEDIA-003 |
| MC-DEL-003 | Open | TestFlight and Android beta channels, cohorts, feedback handling, and build expiry | MC-DEL-001 |
| MC-DEL-004 | Open | App Store and Play privacy disclosures, account-deletion obligations, capture claims, and review preparation | MC-ID-002, MC-PRIV-002, MC-PRIV-004 |
| MC-DEL-005 | Open | Required feature parity, permitted platform differences, and release synchronization | MC-ARCH-001, MC-ORG-001 |
| MC-DEL-006 | Open | Dependency and SDK intake, licensing, privacy-manifest, update, and removal process | None |

### Team Ownership

| ID | Status | Decision needed | Depends on |
|---|---|---|---|
| MC-ORG-001 | Open | Whether one team owns both apps, platform owners specialize within one team, or separate teams own each platform | MC-ARCH-001 |

## Decision Record Template

When an item is decided, preserve the result under its ID before moving it out
of the queue:

```markdown
### MC-AREA-NNN: Decision title

**Status:** Accepted
**Decision date:** YYYY-MM-DD
**Decision:** One unambiguous statement.
**Rationale:** Why this choice fits the product constraints.
**Consequences:** Follow-up work, limitations, and documents affected.
**Recorded in:** Link to the authoritative product document or ADR.
```
