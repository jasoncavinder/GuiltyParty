# Mobile Release Parity Matrix

## Purpose

This is the living evidence and gap register required by
[ADR 0028](../adr/0028-mobile-release-parity.md). It does not authorize a
feature, platform claim, beta promotion, or release by itself.

## Current Status

The long-term native iOS/iPadOS and Android Companions are not yet generally
supported products. The local MVP remains iOS-only under ADR 0004, and Android
begins at the checkpoint and narrow scope defined by ADR 0017. Empty cells are
not evidence of parity.

## Classification Vocabulary

- **Core parity gate:** Required for the applicable supported-platform claim.
- **Platform adaptation:** Same accepted outcome through native platform UX.
- **Staged parity:** One platform first, with a visible and reviewed gap.
- **Platform-exclusive:** Intentional platform capability with documented
  justification and safe alternative where participation depends on it.

## Status Vocabulary

- **Not started:** No qualifying implementation evidence.
- **Development:** Implementation exists only in development scope.
- **Internal:** Accepted internal distribution evidence exists.
- **Beta:** Accepted beta-scope evidence exists; not generally supported.
- **Supported:** Applicable parity and release gates have passed.
- **Unavailable:** Intentionally absent and disclosed for this platform.
- **Disabled:** Withdrawn because safe operation or compatibility is uncertain.

## Feature and Guarantee Matrix

Add a stable row before implementation or release planning for each material
capability. Link evidence rather than pasting private data, credentials, raw
logs, or participant content into this document.

| ID | Capability or guarantee | Classification | Scope or scenario requirement | iOS/iPadOS status and evidence | Android status and evidence | Gap, disclosure, and fallback | Owner | Next review |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | | | | | | | | |

## Core Release Gate Checklist

For each platform and supported scope, link the applicable matrix rows and
evidence:

- [ ] account authentication, recovery, and continuity
- [ ] invitation, admission, membership, and endpoint authority
- [ ] complete applicable player gameplay loop
- [ ] authorization and recipient-specific projection secrecy
- [ ] version compatibility, idempotency, reconnect, and endpoint transfer
- [ ] privacy, capture, consent, microphone, and private-audio safety
- [ ] first-class phone and tablet behavior
- [ ] accessibility-equivalent outcomes
- [ ] scenario language metadata and locale-safe rendering
- [ ] update, revocation, incident response, and account deletion when applicable
- [ ] eligible scenario and capability fallback behavior
- [ ] required automated, simulator, and physical-device evidence
- [ ] accurate beta, store, support, and release disclosures

## Staged-Parity Record

Complete this record for each staged capability:

- Feature ID and first platform:
- Owner-approved rationale:
- User-visible difference and affected audiences:
- Public, beta, host, store, or support disclosure:
- Contract compatibility and supported-client evidence:
- Scenario eligibility and safe fallback:
- Privacy, security, authorization, and safety review:
- Later-platform status:
- Next review date:
- Resolution: promoted to parity, reclassified, withdrawn, or still staged

## Platform-Exclusive Record

- Feature ID and platform:
- Material native capability that justifies the difference:
- Why this is not unfinished staged work:
- Safe alternative for other platforms:
- Scenario and session eligibility behavior:
- Accessibility, privacy, security, and support evidence:
- Owner approval and review date:

## Review Rules

Review affected rows:

- during each applicable planning cycle
- before internal, beta, or general-release promotion
- when a contract, scenario requirement, minimum OS, or platform capability
  changes
- after a parity, authorization, privacy, accessibility, security, or
  cross-platform divergence defect
- before making or changing a public supported-platform claim

The matrix records evidence and known gaps; it does not contain secrets,
credentials, private communications, participant content, or raw diagnostic
artifacts.
