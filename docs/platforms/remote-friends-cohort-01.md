# Remote Friends Cohort 01

## Status

Proposed operational record. Do not upload an external-test build, add a
friend to a store group, or send an invitation until every required owner gate
below is complete. This document is not legal advice and does not approve beta
terms.

## Purpose and Scope

`remote-friends-01` is the first invitation-only external test of the Remote
Friends MVP. Its purpose is to learn whether a small group can install the
native Companions and complete the original synthetic scenario with the
Browser Host and owner-controlled packaged LG Stage.

- Owner: project owner
- Initial audience: 4–8 named, trusted friends
- Environment: `api.test.guiltyparty.app` and the approved test Pages origins
- Content: the original project-owned test scenario and placeholder media only
- Session shape: one Host, one owner-controlled Stage, and no more than eight
  participants
- Gameplay language: English (`en`) for the first cohort
- Supported window: 30 days from the approved start date
- Absolute build lifetime: 60 days, with earlier revocation when superseded or
  affected by a security, privacy, authorization, licensing, or deterministic-
  integrity defect
- Start date, review date, and end date: `TBD`

The initial audience is deliberately smaller than ADR 0024's normal 10–25
person external cohort because Guilty Party is a solo operation and the MVP
supports only one active owner-operated game. Expansion requires a separate
human review.

## Distribution and Candidate Builds

| Surface | Candidate | Delivery boundary before friends join |
| --- | --- | --- |
| iOS/iPadOS Companion | `companion_ios` 0.2.0 (3) | Owner-only internal TestFlight installation, then a named external TestFlight group; exact uploaded build remains `TBD` |
| Android Companion | `companion_android` 0.1.0 (1) | Owner-only Play internal installation, then a named Play closed track; exact uploaded app bundle remains `TBD` |
| Browser Companion fallback | Reviewed test deployment | Existing approved `play.test.guiltyparty.app`; no store membership required |
| Browser Host | Reviewed test deployment | Owner-operated `host.test.guiltyparty.app`; not distributed as a participant app |
| Packaged LG Stage | 0.1.1 (2) | Owner-sideloaded physical Stage; not distributed through a television store |
| Remote control plane | Candidate deployment in the readiness record | Exact source commit, Worker version, compatibility policy, and rollback version must be reconfirmed at go/no-go |

Store records, signing identities, upload keys, tester groups, and artifacts are
configured outside this public repository. No credential, tester address,
certificate, key identifier, invitation, or private feedback belongs here.
Both native projects currently use `com.guiltyparty.companion`; the owner must
approve that value as the durable store application identity before either
store record is created.

## Permitted Data and Features

The application and Guilty Party service may process only:

- a tester-chosen alias;
- opaque session, room, participant, endpoint, and authority identifiers;
- coarse application identifier, version, build, platform, and advertised
  endpoint capabilities;
- deterministic scenario transitions and recipient-authorized projections;
- the minimum operational status and bounded rate-limit state documented for
  the Remote Friends MVP; and
- tester-initiated, minimized feedback supplied through the approved route.

Apple and Google separately manage tester account and store-membership data.
The Guilty Party application and service do not copy store membership into an
account, marketing list, analytics profile, or gameplay record.

Accounts, payments, commerce, public events, production creator content,
private messaging, media capture, recording, transcription, remote AI,
behavioral analytics, advertising, third-party crash SDKs, session replay, and
automatic diagnostic upload remain disabled.

## Physical-Evidence Boundary

The local evidence includes one physical iPhone, the physical LG Stage, an
iPad simulator, Android phone and Pixel Tablet emulators, and the automated
and live results linked from the readiness and platform test records.

The cohort is proposed as the means to gather:

- a second physical Apple Companion result, preferably including an iPad;
- at least one physical Android phone result;
- a physical Android tablet result when a tester has one; and
- additional OS, vendor, network, accessibility, and room observations that
  testers can provide without collecting persistent identifiers.

The project owner has already allowed the named cohort to gather initial
physical Android evidence. Using the cohort to gather the second physical
Apple result remains a specific owner decision at go/no-go. Neither exception
is release qualification, open-beta authorization, or a claim that virtual
coverage is physical proof. Applicable open-beta and production gates remain
closed.

## Test Objectives

Each scheduled session should exercise, as applicable:

1. store installation or Browser Companion fallback from a clean join state;
2. one invitation per participant without putting its proof in a URL, message
   log, or persistent note;
3. distinct participant and endpoint admission with no duplicate roster entry;
4. character assignment and receipt of only that participant's objective and
   authorized clues;
5. scene advancement, public Stage updates, private voting, and deterministic
   outcome;
6. backgrounding, temporary network interruption, and process restart with a
   fresh server-authorized projection;
7. session end with private-content purge and failed post-end resumption; and
8. a plain-language report of expected versus observed behavior, application
   build, general device model, and OS version when the tester chooses to
   provide them.

No test instruction asks a participant to capture a character secret,
objective, clue, vote, credential, private message, unpublished content, or
unrelated device activity.

## Feedback and Support

Recommended initial route: a private project mailbox such as
`beta@guiltyparty.app`, pending owner creation and approval. Public GitHub
issues are not the feedback route for private gameplay artifacts. Security
reports follow [the repository security policy](../../SECURITY.md).

Feedback should contain only:

- application version and build;
- OS version and general device model;
- the relevant test step;
- expected and observed behavior; and
- reproduction steps that omit identities, credentials, and scenario secrets.

Screenshots, recordings, logs, crash files, and other attachments are never
automatic. A tester may choose to attach an artifact only after checking that
it contains no credential, private communication, character secret, objective,
clue, vote, or unrelated personal information. Raw feedback and attachments are
restricted to the project owner, deleted as soon as triage is complete, and
automatically deleted no later than 30 days after receipt. The approved mailbox
or equivalent route must enforce and allow verification of that maximum before
the cohort begins. A durable issue retains only the minimized technical summary
allowed by project policy and is deleted 180 days after the last occurrence
unless a shorter governing lifecycle applies.

## Proposed Named-Tester Notice

Revision: `RF-NOTICE-001-DRAFT`

> You are invited to a private, unfinished test of Guilty Party. The software
> and test scenario are proprietary and may contain defects, stop working,
> require an update, or lose non-production state. Please use a nickname rather
> than your real name. Your access is personal and revocable; do not
> redistribute the application, invitation, or protected scenario content.
>
> This test does not use Guilty Party accounts, payments, advertising,
> behavioral analytics, recording, voice or video capture, private messaging,
> remote AI, or a third-party crash-reporting SDK. The application and service
> process only the minimum test-session information needed to admit endpoints,
> run deterministic gameplay, deliver each participant's authorized private
> view, reconnect, and protect the service.
>
> Apple and Google separately process their respective store account and
> test-group membership to deliver the native application. Guilty Party does
> not copy that membership into a gameplay account, marketing list, or
> behavioral profile.
>
> Active session storage expires and is scheduled for deletion no later than
> seven days after the session ends or expires. Cloudflare separately maintains
> a provider-controlled SQLite recovery history covering up to the preceding
> 30 days. Seven-day active deletion therefore is not a promise of complete
> provider erasure on day seven.
>
> If you use TestFlight, Apple automatically shares crash reports with the
> developer under TestFlight's platform behavior. Google Play may provide
> Android vitals from users who enabled operating-system usage and diagnostic
> sharing. Guilty Party may review those platform reports only for reliability,
> compatibility, security, and accessibility. They are not used for gameplay
> profiling, marketing, or advertising, and Guilty Party cannot shorten the
> platforms' own retention.
>
> Companion capture protections have platform limitations and cannot prevent
> physical cameras, compromised devices, or every screenshot or recording.
> Please do not capture or redistribute private or creator-controlled content.
>
> Please report a problem through the private contact supplied with your
> invitation. Do not send credentials, invitations, participant
> communications, character secrets, objectives, clues, votes, unpublished
> content, or unnecessary personal information. Screenshots, recordings, logs,
> and diagnostic files are optional and should be omitted unless you can verify
> that they contain none of those categories. You may stop participating at
> any time by leaving the test group and contacting the Host. This is not a
> public or commercial release.

The final notice must name the approved contact route and be reviewed by the
project owner before use. Any binding beta terms, confidentiality obligation,
liability language, consent language, jurisdiction clause, or other legal term
requires separate human review and is not supplied by this document.

## Pre-Cohort Owner Gates

- [ ] PR #42 evidence is present on the reviewed `dev` commit.
- [ ] Apple Developer Program and Google Play Console account types and status
      are confirmed.
- [ ] App Store Connect and Play Console records use the approved application
      identity without exposing account or signing details in the repository.
- [ ] Exact store artifacts install through owner-only internal testing and
      pass the join, projection, reconnect, vote, and session-end smoke path.
- [ ] The exact external TestFlight build has completed Beta App Review when
      required, and the named TestFlight external group and Play closed track
      are configured to deliver only the approved builds without adding or
      inviting a friend before the separate first-invitation authorization.
- [ ] Server compatibility policy admits only the intended external-test build
      and contract range, and the visible update-required and emergency-
      revocation paths are rehearsed.
- [ ] Exact source commit, store builds, service deployment, test window, and
      rollback target are recorded.
- [ ] `RF-NOTICE-001` is approved with a working private contact route.
- [ ] The approved feedback route automatically deletes raw submissions and
      attachments within the 30-day maximum, permits earlier post-triage
      deletion, and has a recorded deletion-verification procedure.
- [ ] Human-reviewed proprietary beta terms are approved separately; this
      operational record and notice do not supply those terms.
- [ ] The owner explicitly approves using the cohort to gather the missing
      second physical Apple result.
- [ ] Known defects have no unresolved secrecy, authorization, deterministic-
      integrity, privacy, licensing, or session-termination blocker.
- [ ] The owner records an explicit go/no-go and separately authorizes the
      first friend invitation.

## Go/No-Go Record

- Decision: `PENDING — DO NOT INVITE NAMED TESTERS`
- Approved source and service deployment: `TBD`
- Approved iOS/iPadOS and Android builds: `TBD`
- Approved notice and terms revisions: `TBD`
- Approved feedback route: `TBD`
- External TestFlight review and named-channel readiness: `TBD`
- Feedback deletion mechanism and verification: `TBD`
- Approved start, review, and end dates: `TBD`
- Approved cohort size and selection criteria: `TBD`
- Physical-evidence exception decision: `TBD`
- Owner and approval date: `TBD`
