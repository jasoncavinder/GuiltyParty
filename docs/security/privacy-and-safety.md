# Privacy and Safety

## Overview

Privacy and trust are foundational design requirements for Guilty Party.

Because the platform involves:

- Live voice communication
- Video interaction
- Private messages
- Social interaction
- User-generated content
- AI-assisted features

the platform must prioritize user safety and responsible data handling.

---

# Privacy Principles

## Data Minimization

Guilty Party should collect only information required to provide:

- Core functionality
- Account continuity
- Payments
- Customer support
- Security
- Abuse prevention

The platform should avoid collecting unnecessary behavioral information.

---

## Privacy by Default

Default behavior should favor privacy.

Examples:

- Recording disabled.
- Transcription disabled.
- AI analysis disabled unless explicitly enabled.
- Private communication not accessible by default.
- Minimal account requirements.

---

## Transparency

Users should understand:

- What information is collected.
- Why it is collected.
- How long it is retained.
- Who can access it.

Privacy explanations should be understandable to normal users.

---

# Data Categories

## Account Data

Examples:

- Name
- Email address
- Authentication information
- Preferences

Purpose:

- Account management
- Continuity
- Payments

---

## Gameplay Data

Examples:

- Events attended
- Characters played
- Scenario history
- Achievements

Purpose:

- User experience improvements
- Personal history
- Recommendations

Retention:

Configurable and user-controlled where practical.

---

## Safety Data

Examples:

- Reports
- Moderation actions
- Limited communication metadata

Purpose:

- User protection
- Abuse investigation

Safety data should have:

- Defined retention periods
- Restricted access
- Audit logging

---

## Communication Data

Examples:

- Voice
- Video
- Chat
- Whispers

Default:

Not stored.

---

# Recording Policy

Guilty Party should not record sessions by default.

Recording requires:

- Explicit user consent
- Clear notification
- Visible status indicator
- Defined retention policy

All participants should know when recording occurs.

ADR 0012 requires affirmative consent from every affected participant before
recording, transcription, external caption processing, or AI media access. A
host may request or stop a feature but cannot consent for participants. Scope or
participant changes pause the feature for renewed consent, and withdrawal stops
the route. Recording, transcription, and AI media access remain off by default.

---

# Capture Permission and Indicators

Operating-system microphone or camera permission is requested just in time
after a user initiates the feature. Permission makes a capability available; it
does not publish media or authorize recording, transcription, retention, or AI
access.

Active microphone and camera capture has a persistent, labeled in-product
indicator in addition to platform indicators. Push-to-talk shows when it is
actually live, an open microphone requires an explicit session-scoped choice,
and camera publication includes a local preview. Mobile capture does not
continue in the background initially. Restart, endpoint replacement,
interruption, or unexpected route change returns capture to ready or paused
until the user resumes it.

Mobile microphone input and audio output are validated separately. Headphone
removal, Bluetooth loss or switching, speaker or unknown output, microphone-
route change, calls, audio-focus loss, backgrounding, locking, and media-
service reset stop private playback and microphone publication. Private audio
never falls back to a speaker, pending audio is not replayed, and capture does
not resume automatically. Host and server surfaces receive only the minimum
generic readiness needed for operation, not call details, Bluetooth history,
hardware identifiers, or private device activity. See
[ADR 0022](../adr/0022-mobile-audio-route-and-interruption-policy.md).

A shared room microphone is disclosed during session entry and is never
passive. A participant or shared-endpoint user explicitly activates it, and an
indicator remains visible within the physical room. A host may request or stop
public speech but cannot silently activate the shared endpoint or remotely
unmute a personal Companion.

Public-route state may appear on the Stage and affected endpoints. Private-route
state appears only to authorized senders, recipients, and host roles; it must
not reveal a whisper or accessibility choice publicly.

Recording, transcription, external captions, and AI media routes name the
actual operation with an unhideable active label and appropriate start, pause,
resume, and stop notices. A generic microphone icon is not sufficient.

# Companion Screen-Capture Protection

Active Android Companion windows use secure-window protection. iOS and iPadOS
cover protected content during reported recording or mirroring and warn
truthfully after a still-screenshot notification, which arrives after capture.
App-switcher snapshots use a neutral privacy shield on every platform.

Capture state is not scenario truth, is not reported to hosts or other players
by default, and is not retained for analytics, discipline, reputation, or
account enforcement. A required interaction may use another authorized endpoint
or a generic technical pause without identifying the participant.

A phone or tablet may control a separate public Stage route such as AirPlay,
but only the server-authorized Stage projection reaches the television. The
private Companion projection and notifications are never mirrored. The product
does not claim protection against physical cameras, external capture hardware,
browsers, or compromised operating systems. See
[ADR 0021](../adr/0021-mobile-screen-capture-and-stage-casting.md).

---

# Mobile Beta Privacy

Local, internal, and initial invitation-only mobile testing uses local or
staging services, synthetic or dedicated non-production accounts, and original
test scenarios. Early cohorts do not enable payments, recording,
transcription, behavioral analytics, retained private communications,
production creator libraries, or unapproved AI media access.

Feedback attachments require an explicit tester action and use synthetic
content. Raw screenshots, logs, and similar artifacts are access-restricted and
deleted promptly after triage; durable issues keep only a minimized technical
summary. Beta membership is not consent for marketing. No third-party crash,
analytics, session-replay, or diagnostic SDK is authorized until its fields,
scrubbing, provider, retention, licensing, update, and removal behavior are
approved. See [ADR 0024](../adr/0024-mobile-beta-distribution.md).

---

# Accessibility Caption Consent

A recipient may privately enable verified local, ephemeral accessibility
captions for media that recipient may already hear. Caption text is not stored,
exported, retransmitted, or sent to another processor, and other participants
cannot veto the accommodation. Session entry discloses that this capability may
be used without identifying who uses it.

If local and ephemeral behavior cannot be verified, captions are treated as
external processing and require affirmative consent from every affected
participant. Caption access never authorizes transcript retention.

These rules are a product minimum. Applicable regional, age-related, recording,
and multi-party-consent requirements require legal review before distribution,
and stricter requirements take precedence.

---

# Whisper Privacy

Whispers are private communications.

Default behavior:

- Not recorded.
- Not transcribed.
- Not available to AI systems.

Private audio stops when its authorized audience, E2EE key epoch, endpoint
authority, personal output, or media-provider enforcement becomes absent or
uncertain. It is not queued, replayed, downgraded, or redirected to a speaker,
Stage, another participant, recorder, transcription service, or AI process.

Affected participants receive direct, honest notice if partial delivery or
unintended playback cannot be ruled out. The host sees only the minimum
authorized operational status, while the Stage and unrelated participants do
not learn that a private route exists. A possible unintended output or
subscriber is handled as a potential exposure, not merely a network error.

Exceptions may exist for:

- Explicit user reports
- Safety investigations
- Legal obligations

Any exception must be:

- Documented.
- Time limited.
- Access controlled.

---

# Safety Investigations

If communication data is temporarily retained for safety purposes:

Requirements:

- User notification where appropriate.
- Limited access.
- Purpose-specific retention.
- Automatic deletion.

Example:

```
Complaint submitted:
January 1
Evidence retention:
30 days
Automatic deletion:
January 31
```

---

# AI Privacy Boundaries

AI systems must not automatically receive:

- Private whispers
- Private conversations
- Personal information
- Unnecessary user history

AI access should be:

- Explicitly authorized.
- Limited to necessary data.
- Logged.

If AI receives participant media, every affected participant must consent to
the named route, purpose, processor, and retention policy. Public-route consent
does not authorize whisper or private-conversation access.

---

# User Safety Features

Potential features:

- Report participant
- Block participant
- Disable whispers
- Leave session
- Contact host privately
- Moderation tools

---

# Accessibility

Safety includes accessibility.

Support:

- Captions
- Alternative communication
- Adjustable interface
- Screen reader compatibility
- Reduced motion
- Keyboard navigation
- Controller navigation

Capability preflight asks what functions are available or needed, not for a
medical diagnosis. Hosts see only readiness and remediation choices. When a
required private capability is missing, the product uses another authorized
personal endpoint, an equivalent private modality, a scenario-approved
accessible variant, or participant-consented minimum host assistance. If none
is safe, it pauses.

Accessibility does not justify exposing private content through a Stage, shared
speaker, another participant's endpoint, lock-screen notification, unsecured
channel, AI prompt, recording, or transcription. A pause must not identify the
affected participant or reveal why assistance is needed.

---

# Security Requirements

The platform must protect:

- Account data
- Payment information
- Scenario content
- Private player information
- Creator intellectual property

---

# Server Enforcement

Security-sensitive rules must be enforced server-side.

Never trust:

- Client applications
- Browser code
- Smart TV applications
- User-provided state

Examples:

Incorrect:

```
Client decides:
"Player can see this clue."
```

Correct:

```
Server verifies:
"This participant is authorized."
```

---

# Trust as a Product Feature

Guilty Party should maintain a reputation as:

- Respectful
- Transparent
- Privacy-conscious
- User-focused

Trust should be considered part of the product experience.

---

# Related Documents

- [Security model](security-model.md)
- [Data lifecycle and decision register](data-lifecycle.md)
- [Session journal boundaries](../architecture/session-journal.md)
- [AI Stage Manager boundaries](../architecture/ai-stage-manager.md)
- [Capture indicators and consent](../adr/0012-capture-indicators-and-consent.md)
- [Private-audio route failure](../adr/0013-private-audio-route-failure.md)
- [Repository security policy](../../SECURITY.md)
