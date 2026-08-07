# ADR 0031: Mobile Notifications and Live Session Status

## Status

Accepted

## Date

2026-08-06

---

# Context

Mobile notifications can help a player return to an active session, but lock
screens, watches, vehicle displays, desktop relays, shared devices, and other
ambient surfaces are not private Companion surfaces. Even a seemingly harmless
title, participant name, character, timer label, or notification action can
expose attendance, relationships, scenario content, or creator-controlled
material.

iOS Live Activities and the corresponding Android Live Update experience could
provide a particularly convenient way to return to a game after using another
application or reaching the lock screen. They are optional operating-system
presentations, however, and must never become scenario authority or a gameplay
dependency. Platform support, presentation, dismissal, and delivery also vary.

The initial prototype does not require push notifications or live status. This
decision establishes the product and privacy boundary for later implementation;
it does not select a push provider or authorize production notification data
flows.

# Decision

## General Notification Boundary

Notifications are optional conveniences. Gameplay, identity recovery, consent,
safety, and canonical progress must remain usable without them. Permission is
requested contextually when a player encounters a clear benefit, not on first
launch.

Every notification payload must remain safe if the operating system displays it
in full. Preview-hiding settings are defense in depth, not the secrecy boundary.
The initial fixed, localized templates are:

- session reminder: **Open Guilty Party to review an upcoming session.**
- active session: **Open Guilty Party—your attention is needed.**
- account or security: **Open Guilty Party to review an account update.**
- privacy or safety: **Open Guilty Party to review an important privacy update.**

Notification text is project-owned and selected from reviewed templates. Hosts,
scenarios, creators, and AI cannot inject or customize it.

Notifications never contain event or scenario titles, host or participant
identity, characters, rooms, locations, language or schedule details, clues,
objectives, votes, outcomes, messages, captions, AI output, pairing or recovery
material, authentication links, device names, security details, images, media,
creator content, or custom sounds.

A remote payload contains only a fixed category, a random notification
identifier, and a bounded expiry. It carries no private identifier, authority,
or action token. Opening performs a fresh authenticated fetch and requires
device unlock and current application authority.

The initial action set is **Open** and operating-system dismissal. Gameplay,
security, account, and media actions do not execute from a lock screen. Watches
receive the same generic content. CarPlay, Android Auto, communication-style
presentation, direct or smart replies, and rich notification extensions are
disabled initially. Android uses a generic public version and private lock-
screen visibility; especially sensitive account or privacy notices may use
secret visibility. Group labels and badge counts remain generic.

Active-session notifications expire no later than five minutes, reminders no
later than 30 minutes after the scheduled start, and account or privacy notices
no later than 24 hours. Pending and delivered items are removed when practical
after the relevant end, leave, transfer, revocation, logout, or account
deletion. Stale content remains harmless because it is generic.

The project does not collect notification delivery, enablement, opening,
dismissal, or engagement analytics. Hosts and other participants cannot learn
whether a player enabled, received, opened, or dismissed a notification.

An isolated-LAN session does not depend on push infrastructure. It may use only
generic local notifications within the same rules. Any APNs, FCM, hosted push,
or token lifecycle requires the applicable dependency, provider, privacy,
retention, deletion, and store-disclosure gates before implementation.

## Live Session Status

Live Session Status is the product capability that may use iOS Live Activities
and Android Live Updates. It is a future optional capability, not part of the
MVP or initial native baseline.

After a player's first successful, foreground, authenticated join on a device,
the Companion may make one contextual choice available: **Show live session
status on this device?** The device-local, non-backed-up preference can be
changed globally at any time. If enabled, an eligible live status starts
automatically each time that player intentionally joins a session; there is no
separate confirmation for every session.

The player may stop live status for the current session. If the player dismisses
or the operating system demotes it, the application does not recreate it during
that session. The stored preference may apply again after the player's next
intentional session join. Platform settings are respected without repeated
prompting. Hosts and participants cannot inspect or alter the preference.

Initial creation occurs only from the foreground, authenticated join flow.
Push-to-start and automatic tracking of scheduled sessions remain unapproved
until a separate, explicit proposal addresses token lifecycle, scheduling,
consent, privacy, and platform review.

Live status uses only fixed, public-safe states:

- **Session in progress**
- a generic session-duration or intermission countdown
- **Session paused**
- **Reconnecting**
- **Open Guilty Party—your attention is needed**

It does not label the reason attention is needed or describe a vote, reveal,
scene, clue, or other game phase. It never identifies the event, scenario, host,
language, location, participant, character, room, microphone or media state, or
any private or scenario-specific content.

Its only application action is authenticated **Open**. Live status is
non-authoritative: scenario progress, deadlines, voting, or safety processes do
not depend on its presence or displayed time. Without authoritative refresh it
becomes stale within five minutes and either ends or displays only a generic
refresh state.

The application requests immediate removal on session end, leave, endpoint
transfer, removal, revocation, logout, account deletion, or a player stop
action. Unsupported Android versions and manufacturer behaviors fall back to
the generic notification policy. A platform-specific adaptation is not a
release-parity failure when the same return-to-session purpose and privacy
guarantees remain available.

## Implementation Gate

Implementation requires a stable native Companion baseline, a concrete public-
safe use case, a separate review of any push provider and token lifecycle, and
physical-device evidence covering lock screens, always-on displays, Dynamic
Island where applicable, watches, desktop relays, vehicle displays, screen
sharing, accessibility, stale data, offline behavior, dismissal, and removal.

A follow-up implementation ADR or bounded prototype must record the exact
platform APIs, supported versions, fallback behavior, payload schema, and
verification evidence. This product decision alone does not authorize push
infrastructure.

# Consequences

Positive:

- Players can return quickly to an in-progress session from a lock screen or
  another application without confirming the feature every session.
- Fixed, generic text prevents scenario, identity, and creator content from
  escaping through ambient surfaces.
- Notification state cannot become a host-monitoring or gameplay-authority
  channel.
- LAN play and unsupported devices retain a safe, optional fallback.

Negative:

- Generic copy offers less context than ordinary event notifications.
- A one-time device choice and operating-system controls must be explained
  clearly enough that players can find and change them.
- Platform-specific presentation, dismissal, and stale-state behavior require
  substantial physical-device testing.
- Push-to-start and scheduled-session automation remain unavailable until a
  later decision.

# Alternatives Considered

## Require Explicit Enablement for Every Session

Rejected as unnecessary friction for a player who already chose live status on
that device. Intentional session join supplies the recurring context, while the
global and per-session controls preserve choice.

## Start Live Status Remotely for Scheduled Sessions

Deferred. It may be useful later, but it introduces additional token,
scheduling, consent, stale-state, and provider questions without being required
for the return-to-game use case.

## Include Scenario or Participant Context

Rejected because ambient surfaces and relays are not private Companion
endpoints. Preview controls cannot make such payloads safe.

## Make Live Status Required for Gameplay

Rejected because the operating system and user control presentation and may
disable, dismiss, throttle, or omit it.

# Review Triggers

Revisit this decision when evidence shows meaningful user friction or
dismissal, insufficient usefulness, privacy exposure, stale presentation,
battery or network impact, material platform or manufacturer changes, or a
proposal to add content, actions, analytics, push-to-start, or scheduled-session
tracking.
