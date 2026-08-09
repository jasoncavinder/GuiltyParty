# Mobile Beta Distribution

## Status

No TestFlight, Google Play, or public beta distribution is currently configured
or authorized by this document. The governing policy is
[ADR 0024](../adr/0024-mobile-beta-distribution.md).

## Cohort Progression

| Stage | Audience | Default environment | Access |
| --- | --- | --- | --- |
| Local development | Project owner and direct implementation collaborators | Local or staging; synthetic data | Locally signed or installed build |
| Internal store testing | Named people directly evaluating the build | Staging; synthetic or dedicated non-production accounts | TestFlight internal or Play internal group |
| Invitation-only external testing | Initially about 10–25 trusted players selected for planned coverage | Staging; original test scenarios; non-production services | Named TestFlight external group or Play closed track |
| Open beta | Broader public after every documented gate is satisfied | Approved beta or production-like environment | Public TestFlight link or Play open track |

Promotion is a human decision. Open beta remains blocked until privacy,
account-deletion, store, security, support, legal, licensing, and release gates
are ready for public visibility.

The first external cohort is being prepared in
[Remote Friends Cohort 01](remote-friends-cohort-01.md). That proposal does not
authorize a store upload, tester membership, or invitation. Before the external
group exists, the exact iOS/iPadOS and Android artifacts must first install and
pass the accepted smoke path through owner-only internal store testing.

## Build Windows

| Build class | Project support window |
| --- | --- |
| Internal | Until superseded or 14 days, whichever occurs first |
| Invitation-only external | Supported for 30 days; absolute maximum 60 days |
| Security-, privacy-, authorization-, licensing-, or integrity-affected | Revoke immediately |

TestFlight's longer platform ceiling does not extend the project support
window. Android beta admission must enforce supported build and contract
versions. Expired clients receive an update-required state and retain only the
safe account, sign-out, and credential-clearing controls applicable to their
scope.

## Cohort Record

Before distribution, record:

- cohort name, purpose, owner, start date, review date, and end condition
- included build and control-contract versions
- environment and server identity
- permitted account, content, communication, and diagnostic categories
- tester selection criteria and approximate size
- physical-device and scenario evidence the cohort should fill
- feedback and support routes
- beta notice and human-reviewed terms version
- known limitations and release-blocking issues

Do not place tester email addresses, invitations, credentials, signing
material, private feedback, or unpublished scenario content in this public
repository.

## Release Checklist

Before advancing a build:

- local and applicable automated checks pass
- targeted physical checks and known matrix gaps are recorded
- staging uses non-production secrets and original approved test content
- server admission accepts only the intended build and contract range
- beta notices accurately describe enabled features and data behavior
- payments, recording, transcription, analytics, production private-message
  retention, and unapproved AI media access remain disabled in early cohorts
- no third-party diagnostics or session replay has been introduced without the
  required privacy and dependency decisions
- feedback instructions prohibit credentials, private communications,
  character secrets, and unnecessary personal information
- build expiry and emergency revocation paths work visibly
- support capacity is appropriate for the cohort size

## Feedback Handling

Use one clearly identified feedback route. Prefer structured reproduction data
over broad log collection. Attachments require an explicit action, use
synthetic content, remain access-restricted, and are deleted promptly after
triage. Durable issues retain only minimized technical summaries.

Beta membership remains a testing relationship. Do not copy tester contact
information into a marketing list without separate consent.
