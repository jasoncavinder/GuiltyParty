# Data Lifecycle and Decision Register

## Status

This document records existing privacy defaults, the accepted Companion-local
lifecycle, and the decisions that must be made before other production data
collection begins. It does not invent legal requirements or treat a client
cache decision as approval for server-side retention.

## Governing Rule

Collect only what is necessary for a documented purpose. Before a retained data
category is enabled, its owner must approve:

- purpose
- fields and classification
- collection trigger and user notice
- authorized readers and processors
- retention period or deletion event
- deletion mechanism and verification
- legal or contractual requirements

No implementation may interpret `TBD` as permission for indefinite retention.

## Current Defaults

| Data category | Default storage position | Retention status |
| --- | --- | --- |
| Account data | Limited to account functionality and continuity. | Exact lifecycle requires approval; user deletion and legal constraints must be defined. |
| Payment-related data | Limited to what is necessary to provide payments. | Provider responsibilities and retained fields require approval before integration. |
| Gameplay history | Optional and user-controlled where practical. | Product decision required for defaults, duration, export, and deletion. |
| Scenario session journal | Minimum events needed for live execution and deterministic recovery. | Remote Friends MVP active storage is deleted within seven days after end or expiry. The owner accepted Cloudflare's documented 30-day SQLite recovery history for this limited MVP on 2026-08-07; the tester notice must disclose it, and append-only does not mean permanent. |
| Voice and video | Not stored by default. | No retention unless an explicitly approved recording or safety process applies. |
| Captions and transcripts | Not stored by default. | Generation, accessibility use, and any retention require explicit approval and notice. |
| Private messages and whispers | Not stored by default. | Exceptions require a documented safety or legal basis, limited access, and automatic deletion. |
| Safety reports and evidence | Retained only for a defined protection or investigation purpose. | A case-specific or policy duration must be approved before collection. |
| Potential media-exposure metadata | Opaque references, safe cause and audience classes, lifecycle times, detection source, and response actions only; no media or transcript content. | Production retention, notification, access, and deletion require approval; `TBD` is not indefinite retention. |
| AI inputs and outputs | AI analysis is disabled by default; inputs are purpose-minimized when enabled. | Feature and provider retention require approval before use. |
| Operational and security logs | Limited to reliability, security, and abuse-prevention needs. | Fields, access, redaction, and duration require approval before production logging. |
| Beta feedback | Structured build, device class, synthetic test reference, expected behavior, observed behavior, and reproduction steps; attachments are explicit and access-restricted. | Raw attachments are deleted promptly after triage; durable issues retain only a minimized technical summary. Beta membership is not a marketing list. |
| Creator drafts and assets | Private to authorized creator workflows. | Draft deletion, publication retention, marketplace, and contractual rules require approval. |

## Companion-Local Data Matrix

[ADR 0029](../adr/0029-companion-local-data-lifecycle.md) governs this matrix.
It applies only to player Companion storage and does not approve server-side
retention.

| Local category | Initial storage | Protection and backup | Deletion or expiry |
| --- | --- | --- | --- |
| Short-lived access token | Process memory only. | Never backed up, logged, or placed in ordinary settings. | Purged on authority loss, background or lock, termination, sign-out, or replacement. |
| Device-bound refresh or session-resume credential | Approved Keychain or Android Keystore-protected boundary; browser uses the accepted host-only cookie. | Non-synchronizing and excluded from cloud, device-to-device, and cross-platform transfer. | Removed locally and invalidated server-side on sign-out, account deletion, endpoint revocation, expiry, or unusable authority. |
| Paired LAN server trust | Minimum fingerprint, endpoint binding, and non-secret locator in protected application storage. | Device-bound and excluded from backup and transfer. | Cleared on local reset, server-identity failure, explicit unpairing, endpoint removal, or unusable authority. |
| Opaque session-resumption metadata | Session, participant, endpoint, sequence, authority generation, pending idempotency identifiers, and expiry only. | Application-private, encrypted when it could support correlation or resumption, and excluded from backup and transfer. | Immediate on confirmed authority-ending events; otherwise no later than 24 hours after last-known session end or last authenticated contact when no end is known. |
| Non-secret device preferences | Ordinary application-private or browser storage. | Backup is permitted only when the values contain no account, session, scenario, participant, endpoint, pairing, or authority identifier. | Retained until local reset or uninstall; account-linked preferences, if later approved, follow account deletion. |
| Live Session Status preference | Device-local application-private storage. | Boolean or equivalent choice only; contains no account or session link and is excluded from backup and device transfer. | Retained until the user disables it, local reset, or uninstall. |
| Notification and live-status payload | Operating-system-managed transient delivery and presentation only. | Fixed public-safe category, random notification ID, bounded expiry, and approved generic state; no private identifier, authority, or content. | Active status within 5 minutes without refresh; reminders within 30 minutes after scheduled start; account or privacy notices within 24 hours; request earlier removal when purpose or authority ends. |
| Private gameplay projection and content | Process or page memory only. | Never placed in application files, databases, settings, browser storage, caches, logs, diagnostics, notifications, or backups. | Covered and logically purged on connection uncertainty and every lifecycle or authority-loss trigger; restored only from a fresh authorized projection. |
| Private messages, media, captions, transcripts, votes, action payloads, or AI context | Process memory and bounded live media buffers only when separately authorized. | No persistent Companion cache or backup. | Purged when the live use ends or any audience, route, consent, lifecycle, or authority condition becomes uncertain. |
| User-initiated mobile diagnostic bundle | Explicit allowlist only after **Send once**; no automatic upload or third-party SDK. | Scrubbed on-device before writing or sharing; no identity, account or session link, private content, credential, raw log, dump, screenshot, or backup. | Deleted locally after sharing or within 24 hours. Directly received raw reports are deleted within 30 days. |
| Minimized mobile diagnostic issue | Signature, affected versions and device classes, aggregate counts, occurrence dates, synthetic reproduction evidence, and resolution notes only. | Owner and named engineering access; an AI agent receives only an explicitly authorized minimized extract. | Deleted 180 days after the last occurrence. |
| Apple and Google platform crash evidence | Platform-controlled crash, hang, and aggregate evidence under accurate notice. | Not combined with accounts, sessions, marketing, advertising, behavior profiles, or private gameplay; exports follow the 30-day raw-report rule. | Provider-controlled in the platform portal; the project does not export it to create another archive. |

Every startup and read path enforces expiry before use because an operating
system may suspend an application before cleanup code runs. Backup, restore,
device transfer, reinstall, crash, forced termination, clock change, and
offline-expiry tests are required.

The browser marks authenticated gameplay and participant-specific responses
`Cache-Control: no-store`; service workers do not cache them. Private content
does not enter `localStorage`, `sessionStorage`, IndexedDB, or Cache Storage.

User controls provide sign-out, endpoint removal, local settings and pairing
reset, and a connected account-deletion request. An offline client may clear
its own data but cannot truthfully claim that remote account data was deleted.
Uninstall likewise does not prove server-side revocation.

## Consent and Notice Gates

### Recording

Recording requires explicit consent, clear notice, a visible status indicator,
an approved retention policy, and a deletion path. All participants must know
when recording occurs.

The minimum consent evidence uses opaque session and participant references and
records only the feature, purpose, channels, audience, processor class, policy
versions, decision, and server-authoritative lifecycle times. It does not store
the reason for denial or communication content. Production collection remains
blocked until a separate server-side retention, access, deletion, backup, and
export lifecycle is approved. ADR 0029 governs only Companion-local caches and
does not satisfy this gate.

### Transcription and Captions

Live accessibility output does not automatically authorize transcript storage.
The product must separately define capture, display, recipient, provider, and
retention behavior.

Verified local, ephemeral accessibility captions may be enabled by an
authorized recipient without group approval when neither audio nor caption text
leaves that endpoint or persists. External caption processing requires consent
from every affected participant.

### AI Features

An AI feature must identify its purpose, data categories, recipients, provider,
and retention behavior. Authorization for one AI feature does not authorize
unrelated analysis or future reuse.

### Safety Exceptions

Safety-related retention must be purpose-specific, access-controlled,
time-limited, auditable, and automatically deleted. User notice should be given
where appropriate and legally permitted.

A possible private-media disclosure is distinguished from an ordinary network
failure. Any retained event is limited to opaque references, safe cause and
audience classes, lifecycle times, detection source, and response actions. It
does not include raw media, caption or transcript text, or scenario secrets.

### Beta Feedback

Early mobile cohorts use staging services, synthetic or dedicated non-
production accounts, and original test scenarios. Feedback attachments require
an explicit tester action and must not contain credentials, participant
communications, character secrets, production creator content, or unnecessary
personal information.

Raw attachments are deleted promptly after triage. A durable engineering issue
contains only the minimized technical information needed to reproduce and
resolve the defect. Tester access and store-group membership end with the
cohort or authorized purpose and are not copied into an unrelated marketing
list. See [ADR 0024](../adr/0024-mobile-beta-distribution.md).

## Session Journal Clarification

The journal stores accepted state transitions, not raw communications. It may
contain private gameplay references and therefore still requires authorization,
retention, and deletion controls.

Replay guarantees apply only while the required scenario version, initial
state, and authorized journal entries exist. The Remote Friends MVP loses
ordinary replay availability when active session storage is deleted; the
provider recovery caveat below does not create a product replay feature.

## Remote Friends MVP Server Lifecycle

The invitation-only Remote Friends MVP stores only the following per-session
categories in its SQLite Durable Object:

| Category | Purpose and fields | Readers | Active lifecycle |
| --- | --- | --- | --- |
| Session metadata | Opaque session and room identifiers; invitation verifier and expiry; active, end, and deletion times. | Worker gateway and the one session Durable Object. | Mutation stops after four hours or explicit end; `deleteAll()` no later than seven days afterward. |
| Guest admission | Synthetic alias, opaque participant/room/endpoint identifiers, coarse platform and capabilities, exact browser origin, authority generation/expiry/revocation, and bounded rate counters. | The session Durable Object; clients receive only their authorized identifiers and Host operational projection. | Authority is revoked on endpoint removal, end, or expiry; `deleteAll()` on the same schedule. |
| Canonical journal | Participant admission, endpoint registration, character assignment, scene and clue identifiers, voting transitions, and vote target identifiers. No credential, raw pairing proof, private communication, media, transcript, or recording. | The shared deterministic engine and authorized recipient projector within the session Durable Object. | `deleteAll()` on the same schedule; replay becomes unavailable afterward in active storage. |
| Idempotency records | Endpoint identifier, bounded idempotency identifier, canonical command fingerprint, safe result, and sequence. | The session Durable Object only. | Bounded to 256 records per endpoint and removed with session storage. |
| Packaged Stage connect tickets | SHA-256 ticket digest, endpoint identifier, authority generation, expiry, and consumption time. No raw ticket or primary bearer. | The session Durable Object only. | Thirty-second maximum ticket validity; expired and consumed rows are pruned during issuance, bounded to 16 rows per endpoint, and removed with session storage. |

The raw Host bootstrap proof, authority signing key, raw endpoint authority,
raw packaged Stage bearer, raw connect ticket, and raw pairing proof are not
stored in the session database. Browser, iOS, and packaged Stage credential
responses use `Cache-Control: no-store`, and persisted Worker observability is
disabled. The two Cloudflare edge admission bindings use fixed class keys,
rather than a network address or participant identifier, and are permissive
coarse protection rather than retained identity or exact accounting.

Cloudflare documents point-in-time recovery for SQLite Durable Objects across
the preceding 30 days. `deleteAll()` removes active data and storage billing,
but the project has not established that it shortens that provider recovery
window. The owner accepted this provider horizon for the tightly limited
friends MVP on 2026-08-07. The named-tester notice must disclose it. Seven-day
active deletion must not be represented as seven-day complete provider
erasure, and the acceptance does not extend to production or broader data.

## Decision Register

Before production implementation, owners must be assigned and decisions recorded
for:

- account closure, export, and deletion
- session journal operational and historical retention
- support and safety case retention
- logs, backups, and deletion propagation
- recording and transcription consent
- AI provider data use and prompt retention
- creator draft and published-content lifecycle
- regional or age-related requirements

Legal review is required where law, contract, payments, minors, or international
data handling may affect the answer.

## Documentation Rule

When a decision is approved, update this document and the affected architecture
or product documentation. Significant technical choices may also require an
ADR. The implementation and automated deletion verification must match the
documented lifecycle.
