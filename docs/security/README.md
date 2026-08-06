# Security Documentation

Security and privacy are product requirements, not later implementation tasks.

## Documents

- [Privacy and safety](privacy-and-safety.md) defines the existing principles,
  protected data categories, recording defaults, and server-enforcement rule.
- [Security model](security-model.md) identifies protected assets, trust
  boundaries, threats, and required controls.
- [Data lifecycle](data-lifecycle.md) separates approved defaults from retention
  and consent decisions that still require human approval, and records the
  accepted Companion-local cache and purge matrix.
- [ADR 0029](../adr/0029-companion-local-data-lifecycle.md) prohibits persistent
  private gameplay caches and defines device, browser, backup, and deletion
  boundaries for the player Companion.
- [Mobile diagnostics](mobile-diagnostics.md) records the field allowlist,
  prohibited-data tests, choice, access, and retention evidence required by
  [ADR 0030](../adr/0030-mobile-crash-reporting-and-diagnostics.md).
- [ADR 0025](../adr/0025-third-party-dependency-governance.md) defines the
  security, privacy, provenance, update, and removal gate for dependencies,
  SDKs, services, models, and external assets.

Repository vulnerability reporting is documented in
[SECURITY.md](../../SECURITY.md).
