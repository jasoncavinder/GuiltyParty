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

### MC-ID-001: Account Entry on an Isolated LAN

**Status:** Active

**Why first:** The answer constrains sign-in, convention demos, pairing,
recovery, credential storage, and transport security.

**Decision question:** What should happen when a player reaches a Guilty Party
session on an isolated LAN but has no usable signed-in account session and
cannot reach Apple, Google, or a Guilty Party identity service?

No answer or recommendation is recorded yet. The next discussion should address
only this question.

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
| MC-ID-002 | Open | Minimal account fields, approved identity methods, and account recovery model | MC-ID-001 |
| MC-ID-003 | Open | Pairing invitation scope, expiry, consumption, retry, and revocation rules | MC-ID-001, MC-ID-002 |
| MC-ID-004 | Open | Automatic reconnect and explicit rejoin behavior after app or server restart | MC-ID-002, MC-NET-007 |
| MC-ID-005 | Open | Credential and session-authority storage in memory, Keychain, Keystore, and account-backed systems | MC-ID-002, MC-NET-006 |
| MC-ID-006 | Open | Host controls for removing a lost endpoint and safely reassigning participation | MC-ID-003, MC-ID-008 |
| MC-ID-007 | Open | Independent recovery of account identity, session participant identity, and endpoint identity | MC-ID-002, MC-ID-003 |
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
