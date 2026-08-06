# Architectural Decision Records

Architectural decision records document significant, long-lived choices and
their tradeoffs. Accepted ADRs remain historical records; changes should be
captured in a new ADR that supersedes the earlier decision.

## Index

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](0001-technology-stack.md) | Accepted | Use a standards-focused multi-platform direction and defer framework choices until justified. |
| [0002](0002-scenario-versioning.md) | Accepted | Published scenario versions are immutable and events reference one version. |
| [0003](0003-modular-monolith.md) | Accepted | Begin with a modular monolith with explicit internal boundaries. |
| [0004](0004-mvp-technology-stack.md) | Accepted | Use a lean Rust/vanilla-web/Swift local prototype stack with deterministic replay and explicit authorization boundaries. |
| [0005](0005-versioned-control-plane-contract.md) | Accepted | Version the HTTP and WebSocket control plane around shared schemas, explicit compatibility, and safe evolution rules. |
| [0006](0006-link-local-service-discovery.md) | Accepted | Discover LAN control-plane servers using a privacy-minimized, untrusted DNS-SD advertisement. |

## Adding an ADR

Use the next sequential four-digit number. Include:

- status and date
- context
- decision
- consequences
- alternatives considered

An ADR should record an approved decision, not silently make one. Proposed ADRs
must identify their status as `Proposed` until approved.
