# Mobile Notification and Live Status Checklist

## Current Status

[ADR 0031](../adr/0031-mobile-notifications-and-live-session-status.md) defines
the privacy boundary for future mobile notifications and Live Session Status.
The current MVP does not require or authorize push infrastructure, APNs or FCM
token handling, or live-status implementation.

## Surface Matrix

| Surface | Initial content | Initial actions | Rule |
| --- | --- | --- | --- |
| Lock-screen notification | One fixed generic template | Open or dismiss | Assume the full payload is visible. |
| Watch or desktop relay | Same fixed generic template | Open where safely supported | Never enrich relayed content. |
| Vehicle display | Disabled | None | CarPlay and Android Auto are out of scope initially. |
| iOS Live Activity | Fixed public-safe live state | Authenticated Open | Future capability after the implementation gate. |
| Android Live Update | Fixed public-safe live state | Authenticated Open | Fall back to a generic notification when unavailable. |
| In-app private view | Fresh authorized projection | Authorized application controls | Private content appears only after unlock and authentication. |

## Fixed Notification Templates

- [ ] Session reminder: **Open Guilty Party to review an upcoming session.**
- [ ] Active session: **Open Guilty Party—your attention is needed.**
- [ ] Account or security: **Open Guilty Party to review an account update.**
- [ ] Privacy or safety: **Open Guilty Party to review an important privacy
      update.**
- [ ] Localizations are reviewed project-owned strings.
- [ ] No host, creator, scenario, or AI-provided text can enter a notification.

## Prohibited Content Tests

Seed synthetic values for each category and prove none reaches a payload,
template argument, group label, badge, action, sound, image, live-status field,
log, or provider console:

- [ ] event, scenario, host, participant, character, room, or location identity
- [ ] language, schedule, invitation, attendance, or device details
- [ ] clues, objectives, votes, outcomes, scenes, messages, captions, or AI output
- [ ] codes, authentication or recovery links, credentials, tokens, or authority
- [ ] microphone, media, accessibility, safety-report, or security details
- [ ] creator text, art, audio, production media, or custom scenario sounds

## Delivery and Action Boundary

- [ ] remote payload has only fixed category, random notification ID, and expiry
- [ ] payload contains no private identifier, authority, or action token
- [ ] Open requires unlock, current authentication, and a fresh authorized fetch
- [ ] no gameplay, security, account, media, direct-reply, or smart-reply action
- [ ] previews are treated only as defense in depth
- [ ] Android public-version text is generic and lock-screen visibility is private
- [ ] communication-style, rich-extension, vehicle, and custom-sound paths are off
- [ ] enablement, delivery, open, dismissal, and engagement analytics are absent
- [ ] hosts and participants cannot observe notification settings or behavior

## Expiry and Removal

| Category | Maximum useful lifetime |
| --- | --- |
| Active-session notification or unrefreshed live status | 5 minutes |
| Session reminder | 30 minutes after scheduled start |
| Account, security, privacy, or safety notice | 24 hours |

- [ ] remove pending and delivered items when the relevant authority or purpose ends
- [ ] request immediate live-status removal on end, leave, transfer, removal,
      revocation, logout, account deletion, or user stop
- [ ] do not recreate a dismissed or demoted live status during the same session
- [ ] make delayed or stale delivery harmless because content is generic
- [ ] keep LAN gameplay functional without remote push

## Live Session Status Choice

- [ ] offer one contextual choice only after the first successful eligible join
- [ ] store the preference on that device and exclude it from backup and transfer
- [ ] start automatically after later intentional joins when the preference is on
- [ ] provide a global toggle and **Stop Live Status** for the current session
- [ ] respect platform disablement without repeated prompting
- [ ] do not expose the choice to hosts or participants
- [ ] initially create status only from a foreground authenticated join
- [ ] do not implement push-to-start or scheduled tracking under this decision

Permitted fixed states are **Session in progress**, a generic session-duration
or intermission countdown, **Session paused**, **Reconnecting**, and **Open
Guilty Party—your attention is needed**. The status does not identify why
attention is needed or name a game phase.

## Implementation and Release Gate

- [ ] stable native Companion baseline exists
- [ ] exact iOS and Android APIs and supported versions are recorded
- [ ] payload and live-status schemas reject unknown or dynamic content
- [ ] any provider and token lifecycle passes dependency and privacy review
- [ ] store disclosures match the shipped binary and data flow
- [ ] lock screen, always-on, Dynamic Island, watch, desktop relay, vehicle,
      screen sharing, accessibility, offline, stale, dismissal, and removal are
      tested on representative physical devices
- [ ] unsupported Android and manufacturer behavior has a generic fallback
- [ ] product remains fully correct when notifications are denied or disabled

If content safety, removal behavior, provider handling, or platform disclosure
cannot be verified, the affected notification or live-status path remains off.
