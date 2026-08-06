# Mobile Companion Product Decisions

## Status

Accepted product direction as of 2026-08-05.

This document records product decisions for the intended mobile Companion. It
does not expand the approved local MVP, define production networking, or
authorize implementation. The long-term native-client direction is recorded in
[ADR 0015](../adr/0015-native-mobile-client-strategy.md). Open technical and
product questions are tracked in the
[mobile decision register](../platforms/mobile-decision-register.md).

## Role and Surfaces

### MC-PROD-001: Player-Only Mobile App

The installed mobile Companion is a player surface. Host tools belong in the
browser-based Host Console and may later be provided by desktop applications.
The mobile app does not become a Host Console.

### MC-PROD-002: First-Class Phone and Tablet Experiences

Phones and tablets are first-class Companion form factors. In particular, iPad
must have a deliberate tablet layout rather than merely running an enlarged or
compatibility-mode iPhone interface. Android tablet support is part of the
long-term mobile target. [ADR 0017](../adr/0017-android-prototype-entry-checkpoint.md)
defines the evidence required before the first narrow Android prototype begins;
it does not add Android to the current MVP.

## Identity and Continuity

### MC-PROD-003: Minimal Account Required

A player must establish at least a minimal Guilty Party account before using a
Companion in a session. The initial permanent-account authentication methods
are:

- passkeys
- Sign in with Apple
- Sign in with Google

Passwords, SMS login, and email magic links are not included in the initial
authentication set.

A permanent account requires only:

- an opaque internal user identifier
- at least one verified authentication binding
- one verified recovery email address
- security metadata and records of applicable terms and privacy acceptance

Passkeys must be available when permanent-account authentication launches,
alongside any other supported authentication bindings rather than as a later
enhancement. The initial methods listed above must be available across the
supported surfaces where their platforms permit them. A real name, persistent
display name, phone number, birth date, avatar, and location are not mandatory
account fields. A player may choose a session-specific display name. The
recovery email may use a privacy-preserving relay address and must not be used
as a public identifier, routine login method, marketing address, or discovery
mechanism.

An otherwise functional LAN session must not require internet access merely for
a player to join:

- with internet access, the player uses a normal Guilty Party account
- a previously authenticated player may use a securely cached,
  offline-verifiable account session
- a new player without internet access may receive a host-approved provisional
  account scoped to that session
- when connectivity returns, the product offers to link the provisional
  account to a permanent account

The provisional account provides session identity without granting unrelated
account capabilities. This requirement does not settle the additional identity
providers, credential design, linking mechanics, or recovery model. It also
does not add accounts to the account-free local MVP.

### MC-PROD-004: Move Between Personal Devices

A participant must be able to recover an in-progress session on another
supported personal device after signing in. For example, a player whose phone
battery dies may continue on a tablet without becoming a new participant or
receiving another character.

The product should attempt reconnection and recovery automatically. It may ask
the player to rejoin the in-progress session when automatic recovery cannot be
completed safely.

After a temporary disconnection or app restart, the Companion automatically
attempts to reconnect to the most recent server and session. When its stored
session authority remains valid, it resumes the same participant, character,
and endpoint without creating duplicates. It shows clear reconnecting and
rejoined states.

Account, participant, and endpoint identity recover independently. The account
is recovered only through an accepted authentication or account-recovery
method. After authentication, the server uses the durable account-to-session
relationship to recover the existing participant and its character rather than
creating a duplicate. By default, one account has at most one active participant
identity in a session.

A valid device-bound resume credential may recover an existing endpoint. A
different app installation or browser profile receives a new endpoint identity
after authorization and is attached to the recovered participant; it never
inherits the previous endpoint's credential. Display names, device identifiers,
network addresses, proximity, and pairing invitations do not prove an account
or participant identity. Character ownership follows the participant, not the
endpoint.

On an isolated LAN, a valid offline-admission assertion may prove the account
relationship. If a replacement endpoint has no usable account proof, the system
requires a defined host-assisted recovery path rather than inferring identity.

Several personal endpoints may remain registered and connected for one
participant, but exactly one is the primary private endpoint at a time. Only the
primary endpoint receives complete private projections and submits ordinary
participant actions. Other connected endpoints receive non-private connection
status and may request to become primary.

After authentication, choosing "Use this device" atomically transfers primary
authority to the requesting endpoint without requiring approval from an
unavailable former endpoint. The former primary immediately loses private-view
and participant-action authority, is notified of the transfer, and clears its
private view. Participant commands identify the endpoint, use an idempotency
identifier, and carry the current authority generation so the server can reject
stale commands after a transfer.

A shared Stage cannot become a primary private endpoint. Separately authorized,
capability-specific roles—such as using another device for a microphone—may be
designed later without creating a second general-purpose primary endpoint.
Revoking an endpoint invalidates its credentials and disconnects it.

The primary host, and co-hosts explicitly authorized to manage participants,
may inspect a minimal endpoint roster and revoke a lost endpoint. The roster
shows only operational information such as the participant, a friendly device
label, platform, capabilities, connection status, last-seen time, and
primary-or-standby state. Revocation immediately ends the endpoint's private,
action, and media authority and remains effective while it is offline.

When a replacement endpoint cannot present usable account proof, an authorized
host may approve session-only recovery for an existing participant. The host
selects the participant and confirms the requesting endpoint; the server
revokes the participant's former endpoints by default and grants the replacement
authority that ends with the session. This operation does not authenticate or
modify the permanent account, add an authentication binding, change recovery
information, or grant access outside the session. Normal account authentication
may reclaim the participant and revoke the session-only replacement.

Removing a participant revokes all of that participant's session endpoints but
does not delete or suspend the account. Offline status alone never causes
automatic revocation. Endpoint operations require explicit confirmation and a
minimal control-plane audit record. Any character reassignment or participation
change that affects deterministic story state remains an explicit scenario
journal event. The AI Stage Manager and support personnel cannot perform or
override these host operations.

The Companion does not display cached private content until the server
reauthorizes the endpoint and sends a fresh projection. It clears stale private
content and requires explicit sign-in or rejoining if authority expired or was
revoked, the participant was removed or reassigned, the session ended, or the
server identity no longer matches. A visible manual rejoin path remains
available when automatic recovery cannot complete.

### MC-PROD-012: Consumer-Friendly Account Recovery

Permanent-account recovery uses the verified recovery email rather than a
user-managed recovery key:

- a trusted, already signed-in endpoint may approve recovery immediately
- recovery from an unfamiliar endpoint requires verification through the
  recovery email and a 24-hour waiting period
- linked providers and trusted endpoints are notified and may cancel a pending
  recovery
- successful recovery revokes existing sessions, requires a new authentication
  binding, and temporarily restricts sensitive account changes
- support may explain or initiate the defined process but must not substitute
  security questions or discretionary personal judgment for proof

The product cannot safely guarantee recovery if the player loses every
authentication binding, every trusted endpoint, and access to the recovery
email. Additional cryptographic evidence, such as future store-signed purchase
records, may be considered separately.

This policy must be reviewed when observed user friction, failed recoveries,
account-takeover attempts, support workload, or the operating capacity of the
business shows that its balance is no longer appropriate.

## Participants, Rooms, and Endpoints

### MC-PROD-005: Shared Stage, Private Companion

Multiple participants may share a Stage and other public room equipment. Each
participant needs an individually authorized private endpoint for
player-specific information and actions. A public or shared Stage must not
become a substitute private display.

This preserves the existing separation among a person, participant, endpoint,
and physical room.

### MC-PROD-011: Browser Companion Fallback

When a participant cannot use the installed mobile app, the product provides a
browser-based Companion fallback. The browser Companion is still an
individually authorized private endpoint and must enforce the same server-side
secrecy boundaries as the installed app. A shared public Stage is not a
Companion fallback.

The normal browser fallback requires a publicly trusted HTTPS origin. On a
fully isolated LAN, a generic browser cannot dynamically trust the local
server's installation-specific authority. Browser surfaces in that environment
are supported only on operator-managed devices provisioned with the applicable
trust authority. Ordinary guests are not asked to install a root certificate or
bypass a certificate warning. A zero-install consumer browser fallback on a
completely isolated LAN is therefore not guaranteed initially; native
Companions remain the normal isolated-LAN private surface.

### MC-PROD-013: Safe Private-Capability Degradation

Scenarios declare each required private capability and an ordered set of safe
alternatives. Before a session starts, each participant completes a functional
capability check without being asked for a diagnosis. The host sees readiness
and available remedies, not private accessibility settings or the reason an
alternative is needed.

A private-capability fallback follows this order:

1. another independently authorized personal endpoint for the participant
2. an equivalent private modality on the same endpoint, including private
   text, captions, screen-reader content, private audio, alternate input, or an
   untimed or extended-time interaction
3. a predefined scenario adaptation that preserves canonical truth and secrecy
4. participant-consented host assistance using only the minimum necessary
   information and explicit participant confirmation for consequential actions
5. pausing the affected interaction or session

The product pauses applicable timers without penalty and keeps private content
hidden while adapting. Other participants receive a generic technical or
accessibility pause message without the participant's identity or reason. AI
may suggest only authorized, scenario-defined alternatives and receives no
private accessibility information.

Private content is never rerouted to a shared Stage or speaker, another
participant's Companion, a lock-screen notification, unsecured communication,
or recording or transcription without explicit authorization. The product does
not automatically reveal it to the host or AI, require disability disclosure,
or pressure a participant to accept a public workaround. If no safe path
exists, the session pauses rather than weakening privacy, accessibility,
participant agency, or creator-content protection.

## Availability and Networking

### MC-PROD-006: Connected Experience with Reconnection

Offline gameplay is not an expected mode. Temporary disconnection is expected
and must be recoverable. The minimum operating environment is a network that
can reach a Guilty Party server; that may be an isolated LAN used for a private
event, prototype, or convention demonstration.

On Android, local joining uses foreground, user-initiated NSD and prefers the
Android 17 system service picker over broad LAN visibility. QR supplies pairing
and trust information but does not override operating-system network consent.
See [ADR 0020](../adr/0020-android-lan-discovery-and-permission-ux.md).

## Privacy and Capture Protection

### MC-PROD-014: Minimal Local Data and Prompt Deletion

The initial Companion does not persist private gameplay content. Character
secrets, objectives, evidence, private projections, messages, votes, private
media, captions, action payloads, and AI context remain in memory and are
discarded whenever connectivity, lifecycle state, audience, or endpoint
authority becomes uncertain. Returning private content requires a fresh,
server-authorized projection.

Persistent local data is limited to approved device-bound credentials, paired-
server trust, minimum opaque resumption metadata, and non-secret device
preferences. Credentials, trust, session metadata, diagnostics, and private
content do not migrate through backup or device transfer. Stale resumption
metadata expires no later than 24 hours after the last-known session end or,
when no end is known, the last authenticated server contact.

Browser private content remains page-memory-only and authenticated gameplay
responses are not cached. Sign-out, endpoint removal, local reset, and a
connected account-deletion request provide distinct, truthful controls. An
offline client may clear its own storage but does not claim that remote account
data has been deleted. See
[ADR 0029](../adr/0029-companion-local-data-lifecycle.md).

### MC-PROD-015: Voluntary, Minimized Mobile Diagnostics

The initial Companion uses Apple and Google platform-provided crash evidence
with accurate notice and offers a separate, user-initiated **Share Diagnostic
Report** action after recovery. It does not automatically upload a Guilty Party
report or embed a third-party diagnostic, analytics, remote-logging, or session-
replay SDK.

The optional report contains only allowlisted technical build, platform,
failure, symbolic stack, protocol, lifecycle, connection, route, capability,
resource-bucket, random report, rounded-time, and bounded breadcrumb fields. It
contains no direct identity, persistent device identifier, account or session
link, private gameplay, participant action, credential, communication, media,
AI content, raw log, memory dump, screenshot, or session replay. Scrubbing
occurs before the report is written or shared and fails closed.

The player chooses **Send once** or **Not now**. An optional **Always offer**
preference never becomes automatic-send consent. Local bundles expire after
sharing or within 24 hours, received raw reports within 30 days, and minimized
issue records 180 days after their last occurrence. Raw reports are restricted
to the human owner during solo operation; AI agents receive only explicitly
authorized minimized issue extracts. See
[ADR 0030](../adr/0030-mobile-crash-reporting-and-diagnostics.md).

### MC-PROD-016: Private-Safe Notifications and Live Session Status

Notifications are optional conveniences and never required for gameplay,
identity recovery, consent, safety, or canonical progress. They use only fixed,
localized, project-owned generic templates and contain no identity, event,
scenario, character, room, location, language, schedule, private gameplay,
communication, media, security, invitation, authentication, AI, or creator
content. Opening requires unlock, current authentication, and a fresh authorized
fetch. Notification settings and behavior are not visible to hosts or other
participants and are not collected as engagement analytics.

A future **Live Session Status** may use iOS Live Activities and Android Live
Updates to give a player a convenient route back into an in-progress game. The
player makes one contextual, device-specific choice after a successful join. If
enabled, live status starts automatically after later intentional joins without
a new confirmation for every session. A global toggle and per-session stop
remain available, and a dismissed status is not recreated during that session.

Live status shows only fixed public-safe states such as **Session in progress**,
a generic duration or intermission countdown, **Session paused**,
**Reconnecting**, or **Open Guilty Party—your attention is needed**. It does not
identify why attention is needed or reveal a game phase. It is optional,
non-authoritative, expires promptly when stale, and is removed when session or
endpoint authority ends. Initial creation is limited to a foreground,
authenticated join; remote push-to-start remains a separate future decision.
See [ADR 0031](../adr/0031-mobile-notifications-and-live-session-status.md).

### MC-PROD-007: Protect App-Switcher Snapshots

Private session content must be obscured in operating-system app-switcher and
task-switcher snapshots.

### MC-PROD-008: Discourage Session Capture

During a session, the Companion should detect screen capture where the platform
provides a reliable signal, warn the player, and prevent or obscure capture
where the platform permits it. The product must not promise universal
prevention on platforms that do not provide that control.

Android active-session windows use secure-window protection. iOS/iPadOS warns
honestly after a detected still screenshot and shields private content during
active recording or mirroring. Capture signals are not sent to hosts or used
for discipline by default.

A private Companion projection is never cast or mirrored. The same physical
device may initiate and control a separately authorized public Stage endpoint,
including an AirPlay television, provided that only the server-authorized Stage
projection reaches that route. See
[ADR 0021](../adr/0021-mobile-screen-capture-and-stage-casting.md).

## Audio Input

### MC-PROD-009: Room-Aware Microphone Selection

The current speaker's Companion is normally the microphone endpoint. A shared
room device, including a capable Stage device, may instead provide the room
microphone when explicitly selected and authorized. Device capability alone
does not grant capture permission.

### MC-PROD-010: Conditional Push-to-Talk

Push-to-talk is required when microphone capture and Guilty Party audio output
are on different endpoints and coordinated ducking is required. It may be
optional in configurations that do not need ducking, subject to visible capture
indicators and the no-passive-monitoring privacy rule.

## Mobile Audio Routes and Interruptions

The Companion treats microphone input and audio output as separate, current
capabilities. It does not infer that a Bluetooth device is personal or that an
operating-system route selection authorizes private media.

Connecting a verified personal headphone output may preserve private playback
when microphone input, audience, and room acoustics remain unchanged.
Headphone removal, Bluetooth loss or switching, speaker or unknown output,
microphone-route change, calls, audio-focus loss, backgrounding, locking, and
media-service reset stop affected private media and microphone publication.
Private playback and capture require route revalidation and a fresh participant
action; push-to-talk never resumes automatically and private audio never falls
back to a speaker.

The initial product does not support background Companion capture or private
session-media playback. A separately authorized public Stage route remains an
independent endpoint and may continue only while its public audience and route
remain valid. See
[ADR 0022](../adr/0022-mobile-audio-route-and-interruption-policy.md).

## Authority and Scope

These decisions are product requirements. Significant implementation choices
still require an accepted ADR. In particular, this document does not select:

- an authentication provider or account recovery design
- a media protocol, provider, or mixing topology
- production transport security or local certificate handling
- release cadence

The accepted MVP technology decision remains
[ADR 0004](../adr/0004-mvp-technology-stack.md): the first Companion slice is a
native Swift and SwiftUI iOS development app, while Android and production
accounts remain outside that prototype.

For the target product, [ADR 0015](../adr/0015-native-mobile-client-strategy.md)
selects separate native SwiftUI and Jetpack Compose applications. It does not
bring Android or production mobile capabilities into the MVP scope.

[ADR 0019](../adr/0019-initial-mobile-os-support-baseline.md) establishes the
first supported product baseline at iOS/iPadOS 18 and Android 13/API 33. It
separates deployment minimums from current store build and target SDK
requirements and does not expand the local MVP.

[ADR 0027](../adr/0027-kotlin-multiplatform-reconsideration-thresholds.md)
keeps Kotlin Multiplatform outside the current architecture and defines the
evidence, experiment, and exit thresholds required before it may be proposed
again. Meeting a reconsideration trigger does not authorize adoption.

[ADR 0028](../adr/0028-mobile-release-parity.md) requires equivalent core
product guarantees before iOS/iPadOS and Android are represented as supported
for the same scope. Native adaptations and sequential delivery remain
permitted when capability gaps are disclosed, tracked, and safely governed.
