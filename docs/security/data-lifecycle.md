# Data Lifecycle and Decision Register

## Status

This document records existing privacy defaults and the decisions that must be
made before production data collection begins. It intentionally does not invent
retention periods or legal requirements.

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
| Scenario session journal | Minimum events needed for live execution and deterministic recovery. | Operational and post-session retention require approval; append-only does not mean permanent. |
| Voice and video | Not stored by default. | No retention unless an explicitly approved recording or safety process applies. |
| Captions and transcripts | Not stored by default. | Generation, accessibility use, and any retention require explicit approval and notice. |
| Private messages and whispers | Not stored by default. | Exceptions require a documented safety or legal basis, limited access, and automatic deletion. |
| Safety reports and evidence | Retained only for a defined protection or investigation purpose. | A case-specific or policy duration must be approved before collection. |
| Potential media-exposure metadata | Opaque references, safe cause and audience classes, lifecycle times, detection source, and response actions only; no media or transcript content. | Production retention, notification, access, and deletion require approval; `TBD` is not indefinite retention. |
| AI inputs and outputs | AI analysis is disabled by default; inputs are purpose-minimized when enabled. | Feature and provider retention require approval before use. |
| Operational and security logs | Limited to reliability, security, and abuse-prevention needs. | Fields, access, redaction, and duration require approval before production logging. |
| Creator drafts and assets | Private to authorized creator workflows. | Draft deletion, publication retention, marketplace, and contractual rules require approval. |

## Consent and Notice Gates

### Recording

Recording requires explicit consent, clear notice, a visible status indicator,
an approved retention policy, and a deletion path. All participants must know
when recording occurs.

The minimum consent evidence uses opaque session and participant references and
records only the feature, purpose, channels, audience, processor class, policy
versions, decision, and server-authoritative lifecycle times. It does not store
the reason for denial or communication content. Production collection remains
blocked until the retention, access, deletion, backup, and export lifecycle is
approved under MC-PRIV-002.

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

## Session Journal Clarification

The journal stores accepted state transitions, not raw communications. It may
contain private gameplay references and therefore still requires authorization,
retention, and deletion controls.

Replay guarantees apply only while the required scenario version, initial
state, and authorized journal entries exist. A future deletion policy must state
when replay is no longer available.

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
