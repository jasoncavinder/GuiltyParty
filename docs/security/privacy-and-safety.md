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

---

# Whisper Privacy

Whispers are private communications.

Default behavior:

- Not recorded.
- Not transcribed.
- Not available to AI systems.

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
