# Mobile Companion Product Decisions

## Status

Accepted product direction as of 2026-08-05.

This document records product decisions for the intended mobile Companion. It
does not expand the approved local MVP, select a cross-platform framework,
define production networking, or authorize implementation. Open technical and
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
long-term mobile target; its delivery timing and implementation strategy remain
open.

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

## Availability and Networking

### MC-PROD-006: Connected Experience with Reconnection

Offline gameplay is not an expected mode. Temporary disconnection is expected
and must be recoverable. The minimum operating environment is a network that
can reach a Guilty Party server; that may be an isolated LAN used for a private
event, prototype, or convention demonstration.

## Privacy and Capture Protection

### MC-PROD-007: Protect App-Switcher Snapshots

Private session content must be obscured in operating-system app-switcher and
task-switcher snapshots.

### MC-PROD-008: Discourage Session Capture

During a session, the Companion should detect screen capture where the platform
provides a reliable signal, warn the player, and prevent or obscure capture
where the platform permits it. The product must not promise universal
prevention on platforms that do not provide that control.

This protects participant privacy and creator intellectual property. The exact
response, user messaging, and treatment of screenshots versus screen recording
remain implementation and policy decisions.

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

## Authority and Scope

These decisions are product requirements. Significant implementation choices
still require an accepted ADR. In particular, this document does not select:

- separate native apps, Kotlin Multiplatform, Flutter, React Native, or another
  sharing strategy
- an authentication provider or account recovery design
- a media protocol, provider, or mixing topology
- production transport security or local certificate handling
- minimum operating-system versions or release cadence

The accepted MVP technology decision remains
[ADR 0004](../adr/0004-mvp-technology-stack.md): the first Companion slice is a
native Swift and SwiftUI iOS development app, while Android and production
accounts remain outside that prototype.
