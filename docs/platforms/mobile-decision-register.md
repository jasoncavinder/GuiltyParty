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

### MC-ID-008: Simultaneous Personal Endpoints

**Status:** Active

**Why next:** A replacement device receives a new endpoint identity attached to
the existing participant. The product must now decide whether old and new
personal endpoints may remain connected together and which endpoint may receive
private content or submit participant actions.

**Decision question:** May several personal endpoints remain connected to one
participant, and how is active authority for private projections and participant
actions selected, transferred, and revoked?

No answer or recommendation is recorded yet. The next discussion should address
only this question.

## Accepted Decision History

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

| ID | Status | Decision needed | Depends on |
|---|---|---|---|
| MC-ID-006 | Open | Host controls for removing a lost endpoint and safely reassigning participation | MC-ID-008, MC-ID-013 |

### Control-Plane Networking

| ID | Status | Decision needed | Depends on |
|---|---|---|---|
| MC-NET-001 | Open | Versioning, compatibility, error, and evolution rules for HTTP and WebSocket contracts | None |
| MC-NET-002 | Open | Whether Swift and Kotlin contract models are generated from schemas or maintained manually | MC-NET-001, MC-ARCH-001 |
| MC-NET-003 | Open | Bonjour/DNS-SD service type, TXT metadata, discovery scope, and collision behavior | MC-NET-001 |
| MC-NET-004 | Open | Android NSD discovery behavior and nearby-network permission experience | MC-NET-003, MC-DEL-001 |
| MC-NET-005 | Open | The milestone at which HTTP/WS is no longer permitted and HTTPS/WSS becomes mandatory | MC-ID-002 |
| MC-NET-006 | Open | Local certificate issuance, trust establishment, rotation, and failure recovery | MC-NET-005, MC-ID-003 |
| MC-NET-007 | Open | Connection timeout, heartbeat, retry, backoff, session-resume, and stale-endpoint policies | MC-NET-001 |

### Privacy and Safety

| ID | Status | Decision needed | Depends on |
|---|---|---|---|
| MC-PRIV-003 | Open | Platform-specific behavior and honest user messaging for screenshot and screen-recording detection or restriction | MC-DEL-001 |
| MC-PRIV-004 | Open | Crash-report fields, scrubbing, consent, retention, access, and provider constraints | MC-PRIV-002, MC-DEL-006 |
| MC-PRIV-005 | Open | Persistent indicators and consent UX for microphone, camera, captions, transcription, and recording | MC-MEDIA-001 |
| MC-PRIV-006 | Open | Accessibility and privacy-safe behavior when the installed app and browser fallback both lack a required private capability | MC-PROD-011 (accepted) |

### Media and Device Interruptions

| ID | Status | Decision needed | Depends on |
|---|---|---|---|
| MC-MEDIA-001 | Open | Media protocol, provider, deployment topology, and abstraction boundary | None |
| MC-MEDIA-002 | Open | Ownership of echo cancellation, room mixing, and mix-minus across clients and media infrastructure | MC-MEDIA-001 |
| MC-MEDIA-003 | Open | Bluetooth changes, calls, headphones, route changes, backgrounding, and interruption recovery | MC-MEDIA-001, MC-DEL-001 |
| MC-MEDIA-004 | Open | Fail-closed behavior and user recovery when a private-audio route is unavailable | MC-MEDIA-001, MC-PRIV-005 |
| MC-MEDIA-005 | Open | Arbitration and consent when a shared room microphone competes with participant microphones | MC-MEDIA-001, MC-MEDIA-002 |

### Mobile Architecture and Platform Scope

| ID | Status | Decision needed | Depends on |
|---|---|---|---|
| MC-ARCH-001 | Open | Long-term implementation strategy: separate native apps, shared Kotlin Multiplatform logic, a cross-platform UI, or another evidence-backed approach | MC-NET-001, MC-MEDIA-001 |
| MC-ARCH-002 | Open | Measurable duplication, staffing, test, or delivery threshold that would justify adopting Kotlin Multiplatform | MC-ARCH-001, MC-ORG-001 |
| MC-ARCH-003 | Open | Android prototype timing and the feature slice required before Android work begins | MC-ARCH-001 |

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
