# ADR 0024: Mobile Beta Distribution

## Status

Accepted

## Date

2026-08-06

---

# Context

Guilty Party needs pre-release distribution for native iOS, iPadOS, and Android
Companions. Beta access must expand gradually enough to protect participants,
creator-owned content, account and server boundaries, and the support capacity
of a small business. A store testing channel is a distribution mechanism, not
evidence that a build is production-ready or that broad data collection is
appropriate.

TestFlight currently supports internal and external groups, permits a build to
be tested for at most 90 days, and may require beta review before external
testing. Google Play provides internal, closed, and open tracks and recommends
progression from internal to smaller closed cohorts before open testing. The
project needs stricter cohort and expiry rules that remain consistent across
the platforms even where a store would allow broader or longer access.

# Decision

## Distribution Stages

Mobile pre-release distribution progresses through four stages:

1. **Local development:** the project owner and direct implementation
   collaborators use locally signed or installed builds and synthetic data.
   This is not a store cohort.
2. **Internal store testing:** named App Store Connect and Google Play internal
   testers receive frequent QA builds after local checks pass. Membership is
   limited to people directly working on or evaluating the build for the
   project.
3. **Invitation-only external testing:** trusted players join named TestFlight
   external groups or Google Play closed tracks. The initial cohort is normally
   approximately 10 to 25 people and grows deliberately to fill device,
   language, accessibility, network, and physical-room evidence gaps.
4. **Open beta:** public TestFlight-link or Google Play open testing is not used
   until the applicable privacy disclosures, account deletion, store listing,
   production transport and authorization, support path, beta terms, and
   security and release gates are ready for public visibility.

Promotion between stages is a human release decision. Tester count, store
availability, or elapsed time never promotes a build automatically. Named
invitations are the default before open beta, and access is revoked when a
cohort ends or a tester no longer needs it.

This ADR does not configure either store, upload a build, invite a tester, or
authorize public distribution.

## Environments and Content

Local, internal, and initial invitation-only builds use staging or explicitly
designated local services. They use:

- synthetic or dedicated non-production accounts where possible
- original test scenarios and placeholder media approved for the cohort
- non-production credentials and keys
- clearly labeled beta sessions and surfaces

Early cohorts do not enable payments, production creator libraries, recording,
transcription, behavioral analytics, retained private communications, or
production AI media access. Real people may play a staged test session, but the
session is not represented as a production service and does not relax the
normal authorization, secrecy, capture, consent, or deterministic-truth rules.

A later cohort may exercise production-like accounts, servers, or content only
after the governing privacy, retention, licensing, security, support, and
store-review decisions authorize that scope. A tester never receives a
production secret merely because the tester belongs to a store group.

## Tester Notice and Terms

Before external participation, testers receive concise, human-reviewed beta
terms and a plain-language notice stating that:

- the application and scenarios are proprietary and unfinished
- the build may stop working, require an update, or lose non-production state
- access is personal, revocable, and not permission to redistribute the build
  or protected content
- capture protections have platform and physical-camera limitations
- feedback must not contain credentials, authentication links, participant
  communications, character secrets, unpublished content, or unnecessary
  personal information
- enabled features, processors, collected fields, and deletion behavior are
  identified for the cohort

The legal wording requires human review. This ADR defines the required topics
but does not create or amend a license, nondisclosure agreement, privacy notice,
or store contract.

## Feedback

Each beta provides one clearly identified feedback route. A submission may
include:

- application build and contract version
- OS version and general device model
- synthetic scenario or test-plan reference
- expected and observed behavior
- reproduction steps and an optional issue category

Logs, screenshots, recordings, and other attachments require an explicit
tester action for that submission. Instructions warn testers not to capture or
attach private or creator-controlled content. Early cohorts use synthetic
content so a platform-native screenshot feedback path does not require real
participant or production-scenario data.

Raw feedback attachments are access-restricted and deleted promptly after
triage. A durable engineering issue contains only the minimized technical
summary needed to reproduce and resolve the problem. It excludes authentication
secrets, raw private media, communications, character secrets, unnecessary
account data, Bluetooth addresses, hardware serial numbers, and unrelated
device activity. If a prohibited secret or private artifact is submitted, it
is removed from ordinary triage systems and handled under the applicable
security or privacy process rather than copied into the backlog.

Tester email addresses and store membership remain in the platform's tester
management system only while needed for the active cohort or another authorized
account purpose. The project does not create a separate marketing list from
beta membership without distinct consent.

## Diagnostics and Platform Metrics

Initially, the project may inspect the beta platforms' built-in build-health
information for the limited purpose of evaluating beta reliability. Access is
restricted to authorized project roles. The data is not exported, combined
with advertising or behavioral profiles, or used to infer private gameplay.

No third-party crash-reporting, analytics, session-replay, screen-recording, or
diagnostic SDK is added under this decision. ADR 0030 now permits accurate use
of platform-provided crash evidence and a separate user-initiated, allowlisted
diagnostic bundle; it does not authorize automatic collection or a diagnostic
dependency. Any provider remains subject to ADR 0025 intake. Store-provided
information does not authorize the application to log tokens, projections,
private content, messages, raw media, or scenario secrets.

## Build Lifetime and Revocation

Project support windows are intentionally shorter than TestFlight's platform
maximum:

- an internal build expires when superseded or after 14 days, whichever comes
  first
- an invitation-only external build is supported for 30 days and has an
  absolute lifetime of 60 days
- a build with a security, privacy, authorization, licensing, or deterministic-
  integrity defect is revoked immediately
- tester access is revoked when its cohort or purpose ends

Superseded or expired builds show a clear update-required state. They do not
fail silently, disclose private state, bypass compatibility checks, or join a
session after the server has withdrawn support. Safe sign-out, credential
clearing, and legally required account controls remain available where
applicable.

On TestFlight, the project expires the build rather than relying on the 90-day
platform ceiling. Android testing tracks do not by themselves guarantee the
same client expiry, so the beta control plane enforces the supported build and
contract window before session admission. Emergency revocation may omit an
ordinary grace period; the notice states why an update is required without
revealing a security exploit or private incident.

## Cohort and Release Evidence

Each cohort has a purpose, owner, included builds, intended environment,
permitted data and content, tester criteria, feedback route, support path,
start date, review date, and end or promotion condition. Cohort membership may
be selected to fill device and use-case coverage gaps, but it is not used to
collect unrelated demographic or behavioral profiles.

Before a build advances, the owner reviews:

- required automated and physical evidence under ADR 0023
- known security, privacy, licensing, accessibility, and deterministic defects
- server, contract, and minimum-build compatibility
- feedback triage and unresolved release blockers
- the support capacity and notices appropriate for the next cohort

Beta feedback guides human product and engineering judgment. It does not grant
the AI Stage Manager release authority or permission to alter scenario truth.

# Consequences

Positive:

- Distribution expands gradually from controlled QA to trusted external play.
- Named groups and short build lifetimes bound access to unfinished software.
- Early testing avoids production secrets, payments, private retention, and
  unreviewed diagnostics.
- Feedback produces useful technical issues without turning screenshots, logs,
  or tester membership into an indefinite data source.
- Platform differences share one project-level expiry and promotion policy.

Negative:

- External TestFlight review and store processing may delay a cohort.
- Testers need frequent updates and may lose non-production state.
- Android requires explicit supported-build enforcement to approximate project-
  controlled expiry.
- Invitation management, feedback triage, and prompt artifact deletion add
  operational work.
- Open beta remains unavailable until several privacy, store, security, and
  support prerequisites are complete.

# Alternatives Considered

## Begin with a Public Beta Link

Rejected because public access would outpace privacy disclosures, support,
store presentation, production security, and control over proprietary test
content.

## Keep Every Beta Build Available Until the Store Expires It

Rejected because stale clients and contracts increase authorization, privacy,
support, and scenario-integrity risk.

## Add a Third-Party Crash and Session-Replay SDK Immediately

Rejected because fields, scrubbing, consent, retention, provider behavior,
licensing, and deletion are not yet approved, and session replay conflicts with
the private and creator-content boundaries.

## Accept Screenshots and Logs Automatically

Rejected because automatic capture may collect private communications,
credentials, character secrets, creator content, or unrelated device state.

## Use Beta Membership as a Marketing List

Rejected because testing access does not imply consent to unrelated marketing.

# References

- [Apple: TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [Apple: Stop testing a build](https://developer.apple.com/help/app-store-connect/test-a-beta-version/stop-testing-a-build)
- [Google Play: Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334)
- [ADR 0005: Versioned Control-Plane Contract](0005-versioned-control-plane-contract.md)
- [ADR 0009: Connection and Resumption Policy](0009-connection-resumption-policy.md)
- [ADR 0019: Initial Mobile OS Support Baseline](0019-initial-mobile-os-support-baseline.md)
- [ADR 0021: Mobile Screen Capture and Stage Casting](0021-mobile-screen-capture-and-stage-casting.md)
- [ADR 0023: Physical-Device Test Matrix](0023-physical-device-test-matrix.md)
- [Data Lifecycle and Decision Register](../security/data-lifecycle.md)
- [Privacy and Safety](../security/privacy-and-safety.md)
