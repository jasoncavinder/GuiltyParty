# Mobile Release Parity Matrix

## Purpose

This is the living evidence and gap register required by
[ADR 0028](../adr/0028-mobile-release-parity.md). It does not authorize a
feature, platform claim, beta promotion, or release by itself.

## Current Status

The long-term native iOS/iPadOS and Android Companions are not yet generally
supported products. The Remote Friends MVP remains iOS/iPadOS-only, and Android
has reached the narrow development baseline defined by ADR 0017. The
[checkpoint evidence](android-entry-checkpoint-evidence.md) and
[Android test record](android-companion-mvp-test-record.md) are the authoritative
readiness records. Android has no physical-device or external-test approval.
Empty cells are not evidence of parity.

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
| MC-PARITY-001 | Generated control-plane v1 and recipient-authorized private projection | Core parity gate | Account-free Remote Friends synthetic session | Development; generated Swift, native projection boundary, automated and live evidence in the iOS test record | Development; generated Kotlin, recipient/language tests, phone and native-tablet emulator suites, and live remote projection filtering passed in the Android test record | Physical Android evidence remains open; a named friends cohort may gather it, and browser fallback remains available | Project owner | Before Android invitation-only external test |
| MC-PARITY-002 | Endpoint-bound resume and idempotent participant action | Core parity gate | Temporary disconnect/process restart during synthetic session | Development; physical-iPhone restart and interrupted-vote evidence passed | Development; rotating resume, same-participant restart, no-duplicate roster entry, post-vote reconciliation, and immediate terminal revalidation passed live on the emulator | Physical Android confirmation remains required before open-beta or release promotion; a named friends cohort may gather the initial evidence | Project owner | Before Android invitation-only external test |
| MC-PARITY-003 | First-class phone and tablet layouts | Platform adaptation | Native Companion session UI | Development; deliberate SwiftUI compact/split layouts, physical iPhone and iPad simulator | Development; real Compose compact 411dp and expanded branches passed on phone override and distinct Pixel Tablet AVD; live tablet landscape/portrait path passed | No physical iPad, Android phone, or Android tablet evidence | Project owner | Before platform invitation-only external test |
| MC-PARITY-004 | Active-session private-screen protection | Platform adaptation | Private projection visible | Development; lifecycle/capture shields with Apple screenshot limitation disclosed | Development; `FLAG_SECURE` black screenshot, manual and uncertain-connection purge, terminal purge, recents protection, and no-backup credential boundary passed on the emulator | Browser fallback cannot promise native capture prevention; Android physical verification remains open and may begin in the named friends cohort | Project owner | Before Android invitation-only external test |

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
