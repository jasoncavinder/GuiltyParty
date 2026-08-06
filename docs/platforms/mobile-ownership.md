# Mobile Ownership

## Current State

Guilty Party is currently a solo operation. One human project owner is
accountable for both native mobile applications, shared product behavior,
server contracts, privacy and security risk, intellectual property, beta and
release scope, and external decisions.

AI agents are task-scoped collaborators. They may research, propose, document,
implement, test, simulate, review, and prepare pull requests or handoffs within
their authorization. They are not employees, platform owners, product owners,
legal or privacy approvers, credential custodians, merge authorities, or release
authorities.

The governing decision is
[ADR 0026](../adr/0026-solo-owner-ai-assisted-mobile-ownership.md).

## Work Classification

Every mobile task should identify its primary ownership surface:

| Surface | Present accountable owner | Agent contribution |
| --- | --- | --- |
| Shared player behavior and acceptance criteria | Project owner | Research, proposal, fixtures, tests, documentation |
| Control-plane contract and server enforcement | Project owner | Schema, server, simulation, compatibility, and review work |
| iOS and iPadOS native implementation | Project owner | Task-scoped SwiftUI implementation and platform analysis |
| Android native implementation | Project owner | Task-scoped Compose implementation and platform analysis |
| Privacy, security, licensing, and third parties | Project owner | Evidence gathering, review, and risk identification |
| Beta, stores, merge, deployment, and release | Project owner | Checklists, validation, and release preparation only when authorized |

An agent handoff records scope, branch and commit, affected decisions and
contracts, tests and physical checks, assumptions, third-party material,
privacy and security review, known limitations, and remaining human decisions.

## Capacity Rule

The owner may sequence iOS and Android work rather than developing or releasing
both simultaneously. A platform is described as supported only when its actual
implementation, physical evidence, beta readiness, store state, and support
capacity satisfy the documented release criteria.

AI parallelism may reduce task latency but does not multiply human review,
device access, support capacity, legal judgment, or release authority.

## Future Human Team

When human mobile contributors are added, they initially join one shared mobile
product team. iOS/iPadOS and Android maintainers specialize within that team,
while product behavior, contracts, privacy and security guarantees, fixtures,
design semantics, and release coordination remain shared.

Separate platform teams are reconsidered only after sustained independent
roadmaps, adequate human staffing and review continuity on each platform,
measured coordination cost, and preservation of shared human product and
contract authority.

Update this document when accountable human roles or delegated authority
actually change. Do not list a temporary agent task as an organizational role.
