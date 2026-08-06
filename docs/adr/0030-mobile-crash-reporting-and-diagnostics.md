# ADR 0030: Mobile Crash Reporting and Diagnostics

## Status

Accepted

## Date

2026-08-06

---

# Context

Mobile crashes, hangs, and resource failures need enough evidence to diagnose
problems across supported devices. The Companion also handles private scenario
content, account and endpoint authority, media state, and participant-specific
projections that must not escape through crash messages, breadcrumbs, memory
dumps, logs, screenshots, or diagnostic providers.

ADR 0024 permits inspection of the beta platforms' built-in health information
but prohibits an unreviewed diagnostic SDK. ADR 0025 requires elevated intake
for any crash-reporting provider or component. ADR 0029 prohibits an
application-owned diagnostic cache until the exact fields, scrubbing, consent,
access, retention, and deletion rules are approved.

Apple provides App Store and TestFlight crash reports through its development
tools; TestFlight participants automatically share crash reports with the
developer. Google Play Android vitals uses diagnostic information from users
who enabled operating-system usage and diagnostic sharing. Those platform
channels have provider-controlled behavior and retention that must be disclosed
and reviewed separately from any Guilty Party collection.

Absence of a name or email does not guarantee that technical metadata is not
personal data under applicable law. The project treats diagnostic metadata as
protected and purpose-limited even when it is not linked to an account.

# Decision

## Initial Collection Boundary

The initial mobile diagnostic strategy uses:

- Apple-provided App Store, TestFlight, Xcode Organizer, and MetricKit evidence
  available under the applicable platform behavior
- Google Play Android vitals crash and application-not-responding evidence
- local development tools on project-owned test devices
- a user-initiated, first-party **Share Diagnostic Report** action after the app
  recovers

The Companion does not embed Sentry, Firebase Crashlytics, session replay,
analytics, screen recording, a remote logging SDK, or another automatic crash-
reporting dependency. It does not operate a separate automatic first-party
upload path.

Platform reports are used only for reliability, compatibility, security, and
accessibility diagnosis. They are not combined with accounts, gameplay
sessions, marketing, advertising, behavioral profiles, or creator analytics.

## Notice and Choice

Privacy, beta, and support notices accurately distinguish:

- platform reports controlled by Apple or Google and the user's platform or
  TestFlight participation settings
- Guilty Party's optional, user-initiated diagnostic bundle
- local developer diagnostics from project-owned test devices

TestFlight notices state that TestFlight automatically shares crash reports
with the developer. Google Play notices state that Android vitals uses data
from users who enabled operating-system usage and diagnostic sharing.

After recovery, the Companion may offer:

- **Send once**
- **Not now**
- an optional, revocable **Always offer minimized diagnostics** preference

The preference causes the app to offer the choice; it never authorizes
automatic sending. Declining does not reduce gameplay, account, recovery, or
support rights and does not trigger repeated prompts during the same failure.

The user can review the diagnostic categories in plain language before opening
the platform share flow. Attaching screenshots, logs, recordings, memory dumps,
or files is never automatic and remains outside this diagnostic bundle.

## Allowed First-Party Fields

The user-initiated bundle uses an explicit allowlist:

- application version and build
- operating-system version and device model, without a persistent device
  identifier
- exception, signal, termination, hang, or resource-failure class
- symbolic application stack frames with dynamic messages, argument values,
  local usernames, and build-host paths removed
- control-contract and schema versions
- allowlisted application lifecycle, connection, media-route, capability, and
  feature-state enums
- bucketed memory, thermal, launch-time, or responsiveness state
- a random per-report identifier with no account or session derivation
- a timestamp rounded to the minute
- no more than 50 allowlisted breadcrumb enums covering at most the preceding
  two minutes

Breadcrumbs contain only fixed, reviewed enum values. They do not include
dynamic strings, identifiers, content, filenames, URLs, error messages,
participant actions, scenario progress, or input values.

## Prohibited Data

Neither first-party diagnostic bundles nor project-authored diagnostic events
contain:

- names, email addresses, recovery addresses, or account identifiers
- session, event, participant, character, physical-room, endpoint, scenario,
  installation, pairing, or host identifiers
- passkeys, tokens, cookies, authorization headers, assertions, keys, secrets,
  or credential metadata
- request or response bodies, private projections, journal events, commands,
  votes, clues, objectives, evidence, inventory, messages, whispers, or creator
  content
- audio, video, images, screenshots, screen recordings, UI hierarchies,
  captions, transcripts, AI prompts or responses, keyboard input, or pasteboard
  content
- URLs with paths or parameters, IP or MAC addresses, SSIDs, location, contact
  data, push tokens, advertising or vendor identifiers, serial numbers, or a
  stable diagnostic installation identifier
- raw console output, `logcat`, network traces, memory or core dumps, database
  files, heap contents, session replay, or unrestricted exception messages

Application code does not place protected data in assertion messages,
exception text, symbol names, thread names, filenames, or operating-system log
fields on the assumption that crash infrastructure will remove it later.

## Scrubbing and Failure Behavior

The first-party bundle is constructed from the allowlist on-device before any
diagnostic file or network action. The receiving workflow validates the same
schema and rejects unknown fields. Free-form values are not accepted.

The application does not create a raw custom crash dump for later scrubbing.
If an allowed value cannot be produced safely, the field is omitted. If the
bundle cannot pass local validation, no bundle is created or shared.

Tests seed canary credentials, identifiers, scenario secrets, messages, media
metadata, and dynamic exception values, then verify that none reaches the
bundle, logs, platform breadcrumbs, issue extract, or stored artifact.
Production builds fail closed when diagnostic initialization or policy state is
uncertain.

## Local and Received Retention

A user-initiated bundle is deleted from application-controlled local storage
after the share flow completes or within 24 hours of creation, whichever comes
first. Cancellation or failure does not retain it beyond that limit. No queue
silently retries an upload.

Directly received or deliberately exported raw platform reports are restricted
to active triage and deleted within 30 days of receipt. A durable engineering
issue may retain only:

- a sanitized crash signature
- affected application and operating-system versions and device classes
- aggregate occurrence counts and first and last occurrence dates
- reproduction information that contains no participant or private content
- resolution, verification, and release notes

That minimized issue record is deleted 180 days after its last occurrence.
Reappearance creates or reopens evidence under the new occurrence date rather
than silently extending a raw report.

Apple and Google may retain platform reports or aggregates under their own
current terms and product behavior. Guilty Party does not claim it can shorten
provider-controlled retention. The owner reviews that behavior and disclosures
before each external beta or supported release and does not export platform
data merely to create another archive.

## Access and Use

During solo operation, only the human project owner may access platform portals
or raw received reports. Future access is limited to named people who need it
for reliability, accessibility, privacy, or security work and is removed when
that purpose ends.

AI agents do not receive platform credentials, portal access, or raw reports.
For an explicitly authorized task, an agent may receive only a minimized issue
extract that already satisfies this policy. Diagnostic reports are not used to
rank players, monitor hosts, infer scenario choices, train models, advertise,
market, or create gameplay profiles.

Security incidents that require different evidence, access, notification, or
retention remain governed by a separately approved safety and security data
lifecycle. A crash label does not bypass that gate.

## Provider and Dependency Gate

Any future diagnostic SDK, hosted collector, automated first-party upload, or
expanded platform API integration requires:

- ADR 0025 dependency and provider intake with explicit owner approval
- exact source, version, transitive code, licensing, provenance, pinning,
  update, rollback, and removal evidence
- data-flow, processor, subprocessor, region, encryption, access, retention,
  deletion, incident, and contractual review
- Apple privacy-manifest and App Store privacy reconciliation
- Google Play SDK Index, merged-manifest, permission, and Data Safety
  reconciliation
- collection disabled until the approved notice and consent state exists
- proof that the field allowlist, on-device scrubbing, retention, deletion, and
  opt-out behavior cannot be bypassed by the provider

Session replay, screen recording, advertising, cross-product tracking, data
sale, unbounded remote logging, unavoidable persistent identifiers, and silent
collection remain prohibited. Provider defaults and store acceptance do not
override this policy.

If mandatory platform or provider behavior cannot be reconciled with accurate
notice, applicable law, proprietary-content protection, and this policy, the
affected distribution or diagnostic feature does not proceed until the conflict
is resolved.

## Verification and Review

Release evidence includes:

- schema and prohibited-field tests with canary secrets
- application crash, hang, low-memory, background, media, reconnect, and
  authorization-failure cases on representative physical devices
- confirmation that declining or disabling offers leaves gameplay unchanged
- confirmation that local bundles expire and raw received artifacts are
  deleted on schedule
- access review and platform-console export review
- archived store disclosures that match the actual build
- dependency inventory evidence showing no unapproved diagnostic collector

The policy is reviewed before external beta, before supported release, after a
diagnostic disclosure incident, when Apple or Google behavior changes, and
before any provider or automatic collection proposal.

# Consequences

Positive:

- The project can diagnose common failures without embedding a new surveillance
  or third-party SDK surface.
- User-initiated reports are narrowly structured and cannot silently include
  gameplay content.
- Platform health evidence remains separated from accounts and sessions.
- Short raw retention and minimized issue records support a solo operation
  without building an indefinite diagnostic archive.
- Provider expansion requires explicit evidence and remains removable.

Negative:

- Some rare failures may lack enough context for immediate reproduction.
- Platform reports have provider-controlled fields and retention that Guilty
  Party cannot fully govern.
- On-device allowlisting, redaction tests, and physical crash testing require
  deliberate engineering work.
- A user must take an explicit action to share the first-party bundle.
- No account or session correlation means support cannot automatically connect
  a crash to a particular game.

# Alternatives Considered

## Add a Popular Crash SDK Immediately

Rejected because popularity does not establish compatible privacy, licensing,
retention, consent, supply-chain, or removal behavior.

## Automatically Upload a First-Party Crash Envelope

Rejected initially because the accepted product can begin with platform reports
and voluntary sharing without creating another silent collection path.

## Store Raw Logs and Memory Dumps for Better Debugging

Rejected because they can contain credentials, participant content, scenario
secrets, media, and unrelated device information.

## Associate Reports with Accounts or Sessions

Rejected because diagnostic convenience does not justify linking failures to
players, characters, or private gameplay.

## Disable All Crash Evidence

Rejected because reliability and safety need diagnostic evidence, and the
platform and voluntary boundaries provide a narrower path.

## Keep Sanitized Reports Indefinitely

Rejected because sanitization does not eliminate retention obligations and a
bounded issue record is sufficient for the initial operation.

# References

- [ADR 0024: Mobile Beta Distribution](0024-mobile-beta-distribution.md)
- [ADR 0025: Third-Party Dependency and SDK Governance](0025-third-party-dependency-governance.md)
- [ADR 0029: Companion Local Data Lifecycle](0029-companion-local-data-lifecycle.md)
- [Apple: Acquiring Crash Reports and Diagnostic Logs](https://developer.apple.com/documentation/xcode/acquiring-crash-reports-and-diagnostic-logs)
- [Apple: MetricKit Diagnostic Payload](https://developer.apple.com/documentation/metrickit/mxdiagnosticpayload)
- [Google Play: Android Vitals](https://support.google.com/googleplay/android-developer/answer/9844486)
- [Google Play: Crashes and ANRs](https://support.google.com/googleplay/android-developer/answer/9859174)
- [Google Play: Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play: Using SDKs Safely](https://support.google.com/googleplay/android-developer/answer/13326895)
