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

### MC-ID-017: Invitation Expiry Clock Authority

**Status:** Active

**Why next:** Renewal now fails closed during disconnection. A single authority
for expiry is needed so incorrect endpoint clocks cannot lengthen or shorten an
invitation unpredictably.

**Decision question:** Should the Guilty Party server be the sole authority for
issuing and expiring pairing invitations, regardless of the Stage or Companion
wall clock?

No answer or recommendation is recorded yet. The next discussion should address
only this question.

## Accepted Decision History

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
| MC-ID-012 | Open | Pairing invitation consumption, reuse, replay rejection, and retry behavior | MC-ID-003, MC-ID-011, MC-ID-014, MC-ID-015, MC-ID-016, MC-ID-017 |
| MC-ID-013 | Open | Pairing invitation revocation authority and user experience | MC-ID-003, MC-ID-011 |
| MC-ID-004 | Open | Automatic reconnect and explicit rejoin behavior after app or server restart | MC-ID-002, MC-NET-007 |
| MC-ID-005 | Open | Credential and session-authority storage in memory, Keychain, Keystore, and account-backed systems | MC-ID-009, MC-NET-006 |
| MC-ID-006 | Open | Host controls for removing a lost endpoint and safely reassigning participation | MC-ID-008, MC-ID-013 |
| MC-ID-007 | Open | Independent recovery of account identity, session participant identity, and endpoint identity | MC-ID-003, MC-ID-010 |
| MC-ID-008 | Open | Whether several personal endpoints may be connected and which one may actively receive private content or submit actions | MC-ID-007 |

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
