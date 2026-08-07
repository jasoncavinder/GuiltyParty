# ADR 0032: Mobile Store Privacy and Review Readiness

## Status

Accepted

## Date

2026-08-06

---

# Context

The native player Companions will eventually require Apple App Store and Google
Play distribution. Store declarations, privacy policies, account deletion,
review access, age and content ratings, encryption questions, and product claims
must describe the binary and services that are actually distributed. A form
approved once can become inaccurate when code, dependencies, providers,
permissions, data practices, scenarios, or platform policies change.

Guilty Party requires a minimal permanent account and supports Apple, Google,
and passkey authentication bindings. It also handles private scenario content,
LAN discovery, media capabilities, optional AI assistance, and platform-
specific capture protections. These characteristics require clear review
instructions without exposing real players, production scenarios, credentials,
or proprietary content.

Current project documentation intentionally leaves some server-side retention
periods unresolved. Store preparation cannot silently convert those unknowns
into indefinite collection or unsupported declarations.

This ADR establishes an evidence and approval policy. It does not provide legal
advice or predetermine answers that depend on the future binary, territories,
providers, or applicable law.

# Decision

## Release-Specific Evidence Pack

Every external beta promotion and supported mobile release has a versioned
evidence pack tied to the exact commit, build, package identifier, store track,
service configuration, and distribution territories. It includes:

- an application and server data-flow inventory
- observed network destinations and transmitted field categories
- application permissions, entitlements, capabilities, and purpose strings
- Apple privacy manifests, required-reason API declarations, and merged third-
  party privacy information
- Android merged manifests, permissions, Data Safety inputs, and applicable SDK
  Index evidence
- the dependency inventory, SBOM, licenses, provider intake records, and removal
  evidence required by ADR 0025
- account, consent, notification, diagnostic, cache, retention, deletion, and
  provider behavior applicable to the release
- archived drafts or exports of store declarations, privacy-policy revisions,
  review notes, ratings, screenshots, and other public claims
- verification results and explicit human-owner approval

Automated inventories, network inspection, and agent review may assemble or
challenge evidence. They do not approve store answers. The human owner remains
accountable for the final declarations and release decision and obtains
qualified legal advice when a jurisdictional or legal conclusion is required.

Apple App Privacy and Google Play Data Safety use their own current taxonomies;
one answer set is not copied mechanically into the other. Declarations include
behavior from embedded third-party code and applicable services, not merely
fields intentionally read by first-party application code. If any currently
distributed Google Play version, region, or supported use has a data practice,
the global package-level declaration accounts for it under the then-current
Play rules.

The pack is regenerated and reviewed before each external promotion or release,
after any material data or provider change, and whenever a platform policy or
questionnaire changes. Prior store approval is evidence of review, not proof of
continued accuracy or legal compliance.

## Privacy Policy and User Choices

Before external distribution, Guilty Party publishes stable, publicly
accessible, versioned URLs for:

- the privacy policy
- privacy choices and account deletion
- an appropriate privacy or support contact

The privacy policy is also easily accessible inside each Companion. It
accurately states the collected data, purposes, collection triggers, required
and optional status, processors and sharing, security practices, retention and
deletion, consent withdrawal, account deletion, and meaningful platform-
controlled behavior. It does not promise that data is absent merely because it
is pseudonymous, processed briefly, or collected by an SDK or provider.

Store metadata, in-app notices, permission purpose strings, consent interfaces,
privacy manifests, Data Safety answers, provider contracts, and observed
traffic must agree. If they do not, the affected feature or distribution is
blocked until the conflict is corrected.

## Self-Service Account Deletion

Both native Companions provide a clear in-app account-deletion path. A public
web path also permits an authenticated user to request deletion without
reinstalling the application and satisfies the additional Google Play web-
resource requirement.

The flow uses fresh authentication and an explicit confirmation that explains:

- which account and associated data will be deleted
- what access stops immediately
- the expected completion time
- any narrowly retained category, purpose, duration, and legal basis
- how the user will receive completion confirmation

The flow does not require a recovery key, telephone call, email exchange, or
discretionary support intervention. A user may use the already accepted account-
recovery methods to reauthenticate. Confirmation immediately revokes active
access, endpoint and session-resume authority, and ordinary credentials. The
default maximum for completing project-controlled deletion is 30 days, with
earlier completion where practical or where applicable rules require it.

Deletion removes or irreversibly disassociates, as applicable:

- account profile and the verified recovery email
- passkey registrations and Apple, Google, or other authentication bindings
- provider tokens and permissions, including Sign in with Apple token
  revocation
- endpoint credentials, paired trust, push tokens, and account-linked
  preferences
- user-controlled gameplay history and other data represented as deletable

Local deletion follows ADR 0029. Provider unlinking and project-controlled
deletion are both required; one is not presented as proof of the other.

Transaction, legal, security, safety, abuse, consent, deterministic journal, or
backup data may survive account deletion only under a separately approved and
documented purpose, field set, access boundary, retention period, deletion
mechanism, and disclosure. Otherwise it is deleted or irreversibly
disassociated. Public distribution remains blocked until every server-side
account and session data category has enough approved lifecycle information to
support truthful deletion language and store declarations.

## Authentication Provider Obligations

The release pack verifies that every offered authentication method complies
with the provider and store requirements current for that release. When social
or third-party login is offered on Apple platforms, the accepted Apple and
passkey options remain presented consistently with the applicable login-
service rules. Account deletion and unlinking revoke provider access rather
than merely hiding the binding in the user interface.

Provider-specific branding, token revocation, key rotation, email relay,
consent, data use, and deletion obligations are tested. Provider approval does
not authorize Guilty Party to retain additional identity data.

## Honest Capture and Privacy Claims

Store copy, screenshots, onboarding, support text, and review notes do not claim
that Guilty Party universally prevents screenshots, recording, mirroring, or
external capture. They may state that the Companion detects, discourages,
blocks, or shields capture where supported, with platform limitations explained
consistently with ADR 0021.

Review notes distinguish private Companion protection from an authorized public
Stage route, including Stage casting initiated by a phone or tablet. Marketing
does not imply that operating-system controls protect against physical cameras,
external hardware, compromised devices, or every browser environment.

## Review Access and Materials

Each submission supplies permanent, maintained review instructions appropriate
to the platform, including:

- a dedicated non-production reviewer account or a fully featured review mode
- synthetic users and original, rights-cleared test scenario content
- sample invitations or QR codes and steps for joining, reconnecting, and
  deleting the account
- reachable review services with required features enabled throughout review
- directions for LAN discovery, local-network consent, Stage pairing and
  casting, media permission and capture indicators, notifications, and any AI
  feature present in the submitted build
- explanation of deterministic scenario authority, public and private
  projections, and platform-specific behavior that may otherwise appear broken
- a monitored review contact and any required configuration or hardware notes

Reviewer materials never contain a real player's account, production secret,
private creator content, shared human credential, or unrestricted
administrative authority. The review path exercises the actual relevant
controls rather than bypassing privacy or authorization.

## Audience, Ratings, Content, and Rights

Initial mobile distribution is not directed to children and does not enroll in
Apple's Kids Category or Google Play's Families program. Store target-audience
and content-rating questionnaires are answered from the actual application,
features, communication capabilities, and scenario catalog available in that
release.

The scenario eligibility service does not offer content exceeding the
application's declared store rating in a territory. Store graphics and previews
remain appropriate for their required public audience even when the application
has a higher rating. Adding child-directed distribution, unrestricted user-
generated content, a creator marketplace, or materially different horror,
violence, sexual, substance, gambling, or communication content requires a new
policy, safety, moderation, legal, and ratings review before distribution.

Only original or verified rights-cleared text, translations, images, sounds,
fonts, media, and scenarios appear in review materials and distributed builds.
AI-assisted content or translation does not remove human publication approval
or rights verification.

## Other Store Declarations

The owner answers encryption and export-compliance questions from the exact
cryptography and distribution facts for each build, using qualified advice when
needed. No agent or checklist assumes an exemption.

The evidence pack also addresses, when applicable:

- advertising declarations, with the initial no-advertising position reflected
  accurately
- sensitive permission and entitlement declarations
- AI provider and third-party data disclosures and consent
- local-network, microphone, camera, notification, Live Activity or Live Update,
  background, and media behavior
- accessibility, language, territorial, commerce, and content availability
- support, privacy, account-deletion, and other required URLs

An unimplemented, disabled, or local-development-only feature is not advertised
as available. A dormant production capability, permission, SDK, or data path is
not omitted merely because ordinary review steps do not trigger it.

## Release Gate and Recertification

The human owner signs a dated release record confirming that:

- the evidence pack matches the submitted artifact and enabled services
- privacy and deletion behavior has been tested end to end
- declarations, policy, metadata, ratings, and review instructions agree
- dependencies, content, translations, and media have acceptable rights
- reviewer access works without production data
- unresolved `TBD` retention or provider behavior does not reach users
- applicable platform requirements have been rechecked against current official
  guidance

Failure of any item blocks the external promotion or release. Emergency fixes
may use a shortened evidence cycle only when every affected declaration and
privacy guarantee is still reviewed before submission; urgency does not permit
false metadata or undisclosed collection.

# Consequences

Positive:

- Public claims and store declarations are tied to verifiable release evidence.
- Self-service deletion remains usable for a solo business without making
  customers depend on support availability.
- Reviewer access can exercise real privacy and LAN behavior without real data.
- Platform-specific capture limits and authentication obligations are presented
  honestly.
- Unresolved server retention cannot silently become an indefinite production
  archive.

Negative:

- Every external promotion and release requires deliberate owner review and
  archived evidence.
- Server-side data lifecycle decisions must be completed before public mobile
  distribution even if the clients are otherwise ready.
- Maintained reviewer services and synthetic test content create ongoing work.
- Ratings or territory changes may restrict available scenarios until their
  review is complete.

# Alternatives Considered

## Reuse One Privacy Answer Set Across Both Stores

Rejected because the stores use distinct taxonomies and may treat SDK,
ephemeral, regional, versioned, and provider behavior differently.

## Treat Store Approval as Continuing Compliance

Rejected because binaries, services, providers, laws, and store policies change,
and the developer remains responsible for accurate declarations.

## Require Support to Delete Accounts

Rejected because it creates avoidable friction, does not scale for the current
solo operation, and does not meet the intended self-service store posture.

## Promise Universal Capture Prevention

Rejected because the supported platforms do not provide a universal guarantee
and such a claim would mislead players and reviewers.

## Target Children Initially

Rejected because accounts, private communications, hosted social play, and a
variable scenario catalog would require additional safety, consent, moderation,
rating, and legal work not authorized by the current product scope.

# Current Official References

These references were reviewed on the decision date and must be checked again
for each release:

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple App Privacy reference](https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy)
- [Apple privacy manifest documentation](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files)
- [Google Play Data Safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google Play review preparation](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en-EN)

# Review Triggers

Revisit this decision when either store changes its privacy, account, identity,
rating, AI, SDK, permission, encryption, review-access, or deletion rules; when
a new territory or store is added; when distribution becomes child-directed;
when payments, advertising, creator publication, production AI, recording,
transcription, analytics, or user-generated content is introduced; or when
release evidence reveals that the policy cannot be implemented accurately.
