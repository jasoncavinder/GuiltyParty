# ADR 0026: Solo-Owner, AI-Assisted Mobile Ownership

## Status

Accepted

## Date

2026-08-06

---

# Context

Guilty Party is currently a solo operation. One human project owner is
responsible for product direction, intellectual property, privacy and security
risk, architecture, release scope, and commercial decisions. AI development
agents may perform substantial research, documentation, implementation,
testing, and review tasks, but they do not form a legal organization, maintain
durable accountability, or replace human judgment.

The mobile strategy selects separate native SwiftUI and Jetpack Compose
Companions. That does not imply that separate iOS and Android teams exist or
that the solo owner can develop and release both platforms simultaneously. The
ownership model must describe the present operation honestly while defining a
coherent growth path that avoids independent platform silos later.

# Decision

## Current Operating Model

The current mobile organization consists of one accountable human project owner
assisted by task-scoped AI agents. It is not represented as a staffed mobile
team.

The project owner is the final authority for:

- product requirements, priorities, scope, and acceptance
- architecture decisions and intentional platform differences
- privacy, security, safety, licensing, ownership, and legal escalation
- third-party component approval and commercial commitments
- release readiness, beta promotion, store submission, rollback, and merge
- accounts, credentials, signing identities, providers, and external actions

AI agents may propose, research, document, implement, test, simulate, inspect,
review, and prepare handoffs within an authorized task. They do not possess
standing iOS, Android, product, security, legal, privacy, or release ownership.
An agent identity, model name, task assignment, approval recommendation, or
successful test does not transfer accountability from the project owner.

## Agent Work and Review

Agent work follows the same protected repository workflow as other changes:

- begin from the documented integration base on a task branch
- preserve the accepted product, architecture, privacy, security, and
  proprietary-licensing constraints
- identify assumptions, sources, generated material, third-party inputs, test
  evidence, limitations, and unresolved human decisions
- use pull requests and required review rather than committing directly to
  protected branches
- leave a durable repository handoff when work, context, or authority changes
- stop when an action requires authority, credentials, legal judgment, privacy
  acceptance, external communication, purchase, deployment, merge, or release
  not already granted by the owner

Multiple agents may implement or review different tasks, and one agent may find
defects in another agent's work. That is useful evidence, not independent human
approval. The owner remains responsible for accepting the result and any risk.

AI-generated code, content, tests, translations, and documentation are reviewed
for correctness, provenance, licensing, privacy, security, accessibility, and
alignment with the accepted design. Agents do not introduce dependencies,
external content, or model outputs with unclear rights under the assumption
that generation establishes ownership.

## Present Mobile Accountability

The owner holds combined accountability for:

- cross-platform player behavior and shared acceptance criteria
- iOS and iPadOS implementation quality and platform conventions
- Android phone and tablet implementation quality and platform conventions
- server contracts, generated DTO boundaries, fixtures, and compatibility
- physical-device evidence and known matrix gaps
- parity decisions, sequencing, beta scope, and platform release claims

This concentration is an acknowledged capacity and continuity risk. It is
managed through small vertical slices, ADRs, the durable decision register,
versioned contracts, automated tests, physical evidence, explicit handoffs,
backups, and narrow releases. Documentation and AI assistance reduce cognitive
load but do not create additional accountable personnel.

The solo owner may work on one platform at a time. Separate native applications
do not create a promise of simultaneous implementation, feature completion,
beta access, or release. Public claims and store availability reflect actual
evidence and support capacity for each platform.

## Shared Product and Platform Boundaries

Even during solo development, work is classified as:

- shared mobile product behavior
- control-plane or server contract behavior
- iOS/iPadOS-specific implementation
- Android-specific implementation
- cross-platform evidence and release coordination

Shared product behavior includes privacy guarantees, authorization semantics,
deterministic outcomes, account and endpoint recovery, contract schemas,
fixtures, accessibility intent, design semantics, and acceptance criteria.
Platform-specific work remains native and idiomatic and may differ where
operating-system conventions or capabilities materially differ.

The owner decides whether a platform difference is an accepted adaptation, a
temporary sequencing gap, an unsupported feature, or a defect. An agent does
not create product parity by copying an implementation or silently interpreting
one platform as normative.

## Growth Model

The first human mobile contributors join one shared mobile product team rather
than separate iOS and Android organizations. As staffing permits, the owner
designates iOS/iPadOS and Android maintainers within that team. A platform
maintainer owns idiomatic implementation, platform accessibility, SDK and store
behavior, physical-device quality, and platform defects, while the shared team
owns product behavior, contracts, privacy and security acceptance criteria,
fixtures, design language, device evidence, and release coordination.

The owner remains product and contract authority until that authority is
explicitly delegated to a named human role. AI agents do not fill a vacant
human maintainer or approval role.

Separate platform teams are considered only when all of the following are true:

- both platforms have sustained, materially independent roadmaps
- each platform has enough accountable human staffing to avoid a single-person
  silo and provide review continuity
- platform-specific work dominates for multiple planning cycles
- measured coordination inside one team is delaying delivery or quality
- a shared human product and contract authority remains across the teams

Splitting teams does not split canonical product truth, server authorization,
privacy guarantees, or protocol ownership.

## Continuity and Sensitive Authority

Only authorized humans control production signing, store, domain, provider,
payment, legal, security-response, and release credentials. Agents receive the
minimum task-scoped access necessary and do not store secrets in prompts,
commits, logs, screenshots, handoffs, or public issues.

The repository records decisions, contracts, runbooks, test evidence, and
known gaps so another authorized human could eventually understand the system.
This is operational continuity, not a claim that the business currently has a
backup operator. Business-continuity, emergency-access, and succession planning
remain future owner decisions outside this mobile-team ADR.

# Consequences

Positive:

- Documentation reflects the actual solo business rather than inventing a
  staffed team.
- Human accountability remains clear even when agents perform substantial work.
- One product and contract direction covers both native applications.
- Sequential platform delivery is permitted without mislabeling it as a parity
  failure or simultaneous-release promise.
- Future human specialists have a shared-team path that preserves native
  quality without immediately creating platform silos.

Negative:

- The owner is a capacity, review, release, and continuity bottleneck.
- Agent review cannot provide organizational independence or accept risk.
- Parallel mobile development is limited by the owner's ability to supervise
  and validate it.
- Some platform features and releases will be sequenced rather than concurrent.
- Separate teams remain unavailable until real human staffing and measured need
  exist.

# Alternatives Considered

## Describe the Current Agents as the Mobile Team

Rejected because task-scoped AI agents do not provide durable accountability,
legal authority, ownership, security custody, support obligation, or human
review independence.

## Appoint One AI Agent as Permanent iOS Owner and Another as Android Owner

Rejected because model sessions and tasks are not accountable organizational
roles and can lose context, change behavior, or cease to be available.

## Create Separate iOS and Android Teams Immediately

Rejected because no such human teams exist and separate silos would duplicate
product decisions without adding capacity.

## Require Simultaneous Cross-Platform Delivery

Rejected because it would turn the owner's present staffing constraint into an
unrealistic promise and could delay useful, well-tested platform slices.

## Treat the iOS Implementation as the Product Specification

Rejected because shared product requirements, server contracts, and acceptance
criteria are authoritative; native implementations may adapt to their platform
without making either client canonical truth.

# References

- [AGENTS.md](../../AGENTS.md)
- [Contributing](../../CONTRIBUTING.md)
- [ADR 0005: Versioned Control-Plane Contract](0005-versioned-control-plane-contract.md)
- [ADR 0015: Native Mobile Client Strategy](0015-native-mobile-client-strategy.md)
- [ADR 0016: Generated Mobile Contract Models](0016-generated-mobile-contract-models.md)
- [ADR 0017: Android Prototype Entry Checkpoint](0017-android-prototype-entry-checkpoint.md)
- [ADR 0023: Physical-Device Test Matrix](0023-physical-device-test-matrix.md)
- [ADR 0025: Third-Party Dependency and SDK Governance](0025-third-party-dependency-governance.md)
