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

### Native Companion Credential Storage

Passkey private keys remain under the operating system's credential manager and
are never exported into Guilty Party application storage. Short-lived access
tokens exist only in process memory.

An installed Companion may persist only opaque, device-bound credentials needed
to refresh account authority or resume an authorized session. On iOS and
iPadOS, those credentials are stored in the Keychain with device-only
accessibility appropriate to their required availability. On Android, they are
stored as ciphertext in application-private storage using an app-specific,
non-exportable Android Keystore key. Session authority does not sync through
cloud backup, migrate to another device, or serve as proof for a different
endpoint. A player using another device reauthenticates and receives new
endpoint authority.

Non-secret identifiers may use ordinary application-private storage. Access,
refresh, or session-resume credentials must never appear in `UserDefaults`,
ordinary `SharedPreferences`, logs, analytics, source files, or general device
backups. Sign-out, account removal, endpoint revocation, or detection that the
credential can no longer represent valid authority deletes the corresponding
local credential and invalidates it server-side where applicable.

This boundary does not authorize persistent caching of private gameplay
content. Browser storage, server-side verifier storage, and private-content
cache lifetime are separate decisions.

### Browser Companion Credential Storage

Browser authentication uses WebAuthn for passkeys, leaving private-key
operations with the authenticator rather than exposing keys to application
JavaScript. Account and session authority is represented by an opaque,
server-managed session identifier in a host-only cookie marked `Secure`,
`HttpOnly`, and `SameSite=Strict`. The cookie uses the `__Host-` prefix, has no
`Domain` attribute, and uses `Path=/`. A narrowly scoped, short-lived
`SameSite=Lax` correlation cookie may be used only when an external identity
provider's return flow requires it; it is not ongoing session authority.

Access tokens, refresh tokens, session identifiers, and resume credentials must
not be placed in `localStorage`, `sessionStorage`, IndexedDB, service-worker or
HTTP caches, URLs, logs, or analytics. Any transient browser-held proof remains
in memory. Ordinary browser storage may contain only non-secret preferences and
identifiers that do not grant or resume authority.

The server may issue a bounded persistent session cookie to support browser
restart and temporary-disconnection recovery. Its lifetime, rotation policy,
and any explicit "remember this browser" experience require separate approval.
Sign-out, account removal, endpoint revocation, or invalid authority deletes the
cookie where possible and invalidates the corresponding server-side session.

This design requires an authenticated HTTPS/WSS origin. Plain HTTP on a LAN is
not an acceptable production credential boundary; production LAN browser access
therefore depends on the local certificate and trust design. This decision does
not authorize persistent caching of private gameplay content.

### Server-Side Credential Storage

Permanent account authority stores only the verifier and binding material
needed for the approved authentication methods: WebAuthn credential records
containing public—not private—key material; issuer-and-subject bindings for
Apple and Google sign-in; the encrypted verified recovery email; and minimal
security, acceptance, and revocation metadata. Identity-provider access or
refresh tokens are not retained when a provider is used only to authenticate.

Bearer credentials are random, opaque values. The client receives the raw
value; the server stores a keyed digest and keeps the digest key outside the
credential database. Account sessions, native refresh credentials, browser
sessions, and gameplay-session resume credentials are distinct authority
classes. Each record is scoped to its account, endpoint, intended audience,
and, where applicable, game session, with issuance, expiry, rotation, use, and
revocation metadata. Logs and analytics never contain raw credential values.

Refresh and resume credentials rotate after successful use. Reuse of an
invalidated value revokes its credential family and requires authentication.
Endpoint removal revokes that endpoint's authority; account recovery revokes
all existing account sessions; ending a game revokes its gameplay-resume
authority without necessarily ending the account session. Revocation and
expiration state must survive server restarts.

Account and security records are logically separated from scenarios, content,
and deterministic session journals. Gameplay systems reference opaque account,
participant, and endpoint identifiers. They do not receive credential values,
recovery addresses, provider bindings, or unrelated authentication history.

An isolated-LAN game server does not receive permanent-account credential
records, identity-provider tokens, or recovery addresses. It may verify a
bounded, signed, audience-restricted offline-admission assertion and retain
only the session-scoped authority needed for admission, reconnect, and local
revocation. The assertion contains no unnecessary personal information.

Security databases, backups, and connections between trusted components are
encrypted, and administrative access is restricted and auditable. Concrete
database, encryption-key, secret-management, retention, and infrastructure
provider choices require separate approval.

### Control-Plane Transport Security

HTTP/WS is limited to loopback tests, synthetic local development, and the
explicitly enabled account-free placeholder MVP development profile. The
development profile is absent from beta and release builds, warns continuously
that transport is unencrypted, binds only to selected private or link-local
interfaces, and rejects real authentication, participant data, private or
licensed content, payments, recording, transcription, and private
communications.

HTTPS/WSS is mandatory before permanent accounts or real authentication,
non-synthetic participant data, non-placeholder private or licensed content,
external testing or distribution, untrusted or routed networking, and any
commercial or production deployment. Beta and release clients reject
cleartext. TLS or server-identity failure never offers or triggers plaintext
fallback. A plaintext listener may redirect a non-sensitive browser navigation
but never accepts credentials, authority, private projections, commands, or a
WebSocket upgrade.

Media-plane encryption remains a separate decision and is required before user
media is carried.

### LAN Server Identity and Certificate Trust

Each LAN server has an installation-specific private certificate authority and
server identity key protected by the host platform. It issues renewable local
leaf certificates; no universal private LAN key is shared across installations.
Native clients learn the authority fingerprint through QR pairing or a
human-compared authentication string and store that server-specific binding in
protected storage. Discovery data and first network contact are not trust on
first use.

Leaf renewal under the paired authority is automatic. A planned authority
rotation is authenticated by the existing authority and visibly announced. An
unauthenticated change, loss, or replacement creates a new server identity,
invalidates local endpoint and session authority, and requires explicit
re-pairing. Names, addresses, discovery records, and database restores cannot
silently transfer trust.

Generic browsers use publicly trusted HTTPS. A fully isolated LAN browser is
supported only when an operator-managed device was provisioned with the local
authority. The consumer path never asks guests to install a root or bypass a
certificate warning.

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

- administrative and support-access policy
- encryption and key-management design
- provider selection and data residency
- concrete retention periods
- incident response roles and timelines
- abuse prevention and moderation procedures
- production security testing and disclosure program
