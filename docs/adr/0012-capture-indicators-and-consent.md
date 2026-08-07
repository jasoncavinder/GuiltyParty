# ADR 0012: Capture Indicators and Consent

## Status

Accepted

## Date

2026-08-06

---

# Context

Guilty Party may transport live microphone and camera media and may later offer
ephemeral captions, transcription, recording, or AI-assisted media processing.
Operating-system permission establishes whether an application may access a
device capability; it does not explain the current audience, authorize
publishing, authorize retention, or provide informed consent for a different
processor or purpose.

Physical rooms make capture especially sensitive. A single room microphone may
capture people other than its endpoint owner, and a public Stage may expose a
feature state to people who are not authorized to know that a private route
exists. The product needs consistent states, indicators, consent scope, and
revocation behavior across native and browser surfaces without revealing why a
participant declined.

---

# Decision

## Permission Is Not Publication or Consent

Guilty Party requests operating-system microphone or camera permission only
after a user initiates a feature that requires it. A concise in-product
explanation immediately precedes the system prompt and identifies the purpose
and expected audience. Permission is not requested speculatively at launch.

A granted system permission makes the capability available but never starts a
capture track, publishes media, enables an open microphone, authorizes
recording, or authorizes a processor. Denial leaves the rest of the product
usable through documented alternatives where possible and must not create a
repeated blocking prompt.

## Observable States

Every capture or derived-processing feature has explicit, control-plane-visible
states equivalent to:

- `unavailable`: the capability or authorized route cannot be used
- `ready`: permission and route may be available, but no capture is active
- `requested`: an identified feature is awaiting a participant decision
- `active`: media is currently captured, published, or processed as labeled
- `paused`: capture and delivery to the named processor have stopped and may be
  resumed only through the approved transition
- `denied` or `revoked`: authority is absent and the route is closed

UI presentation may use friendlier language, but it must not call a feature
paused while capture or processor delivery continues. State changes are derived
from endpoint and server acknowledgment rather than optimistic UI alone.

After an app restart, endpoint replacement, authority change, or unexpected
interruption, microphone and camera publishing resume in `ready` or `paused`,
not silently in `active`. The user must affirmatively resume.

## Live Microphone and Camera

The endpoint owner explicitly activates live media. Holding an authorized
push-to-talk control is event-level consent for that transmission. A latched or
open microphone requires a separate, clearly labeled session-scoped choice and
an always-available mute or stop control. Camera publication requires an
affirmative action and shows a local preview before or while it is published.

While capture is active, the local surface displays an unhideable, persistent,
text-and-icon indicator identifying microphone, camera, or both. It supplements
and never suppresses, imitates, or replaces operating-system and browser privacy
indicators. A backgrounded Guilty Party mobile client does not continue camera
or microphone capture initially.

Public live routes expose an appropriate active-speaker or camera state to
affected participants, authorized host tools, and the public Stage. Private
routes show their state only to the authorized sender, recipients, and any host
role explicitly authorized for that route. The Stage and unrelated participants
receive no indicator that reveals a whisper or its members.

## Ephemeral Accessibility Captions

A recipient may enable local, ephemeral accessibility captions without another
participant vetoing the accommodation when all of the following are true:

- processing occurs on the recipient's authorized endpoint
- caption text is not stored, exported, retransmitted, or exposed to another
  processor
- caption input is limited to media the recipient is already authorized to hear
- the product has verified those properties for the implementation

Session entry discloses that recipients may use such accessibility captions,
but does not identify who enables them. The enabling recipient sees a persistent
`Captions on` indicator and an immediate stop control. If the product cannot
verify local, ephemeral behavior, it treats the feature as external caption
processing under the higher-risk consent rules below.

## External Processing, Transcription, Recording, and AI

Server- or cloud-generated captions, transcription, recording, and any route
that gives an AI system access to participant media require affirmative consent
from every affected participant before they start. An affected participant is
any person whose voice, image, private display, or communication may reasonably
be captured or processed, including people sharing a physical room microphone.
Silence, prior participation, terms acceptance, host approval, or a previously
granted operating-system permission is not consent.

The request identifies:

- the specific feature and purpose
- media and channels in scope
- intended audience and processors
- whether output is ephemeral or retained
- the approved retention and deletion policy when anything is retained

The host may request or stop a feature but cannot consent for another
participant, conceal a refusal, or force activation. Until every affected
participant affirmatively agrees, host tools show aggregate readiness such as
`Waiting for 1 response` or `Consent not complete`, not the identity or reason
of a person who declined. Operational live-media readiness may identify the
endpoint that is unavailable when routing requires it, but never exposes why
permission or consent is absent.

A new affected participant, additional channel, new processor, changed purpose,
or changed retention policy pauses the feature and requires renewed consent.
Withdrawal immediately stops the affected feature. Where a physical-room source
cannot reliably exclude the withdrawing participant, the entire recording or
processing route stops.

## Start, Pause, Resume, and Stop Indication

Recording, transcription, external caption processing, and AI media access use
a short pre-start transition, a clear visual label, and an audible notice on
the affected public or private route when appropriate. The active label names
the actual operation, such as `Recording`, `Transcription active`, or `AI Stage
Manager can hear this channel`; a generic microphone icon is insufficient.

The label remains visible and cannot be dismissed while the feature is active.
Pause, resume, and stop are distinct and announced to affected participants.
The system offers immediate participant and host stop controls. No feature may
continue solely because a notice surface disconnected.

## Minimal Consent Evidence

Consent evidence is control-plane audit data, not deterministic scenario truth
and not communication content. The minimum structured record contains:

- opaque session and participant references
- feature, purpose, source channels, audience, and processor class
- applicable notice, consent, and retention-policy versions
- decision and server-authoritative request, grant, withdrawal, and stop times

It contains no reason for denial, raw media, caption or transcript text,
character secret, or unnecessary account profile. Production use of any feature
that requires retained consent evidence is blocked until a separate server-side
data-lifecycle decision approves its storage, retention, deletion, backup,
access, and export behavior. ADR 0029 governs Companion-local caches only and
does not satisfy this gate. `TBD` is not indefinite retention permission.

## Scope Limits

Recording, transcription, and AI media access remain off by default. Consent to
one feature, route, purpose, processor, or session does not authorize another.
Whisper content remains unavailable to recording, transcription, and AI by
default even when a public route has separately enabled one of those features.

Screenshot and operating-system screen-recording detection or restriction is a
separate decision under MC-PRIV-003. Lock-screen notification content remains
deferred under MC-PRIV-001.

These product safeguards are a minimum, not a conclusion about regional law.
Recording, transcription, caption, biometrics, age-related, and multi-party
consent requirements need legal review before distribution in each intended
jurisdiction; stricter applicable requirements take precedence.

---

# Consequences

## Positive

- Users can distinguish device permission, live transport, derived processing,
  and retained recording.
- Persistent, named indicators make active capture and processing difficult to
  mistake or conceal.
- Accessibility captions remain available without publicly identifying or
  subjecting the recipient to another participant's veto.
- Higher-risk features use all-affected-party consent and stop on scope change
  or withdrawal.
- Private-route indicators do not disclose whisper existence to the Stage.
- Consent evidence is minimized and kept outside canonical scenario truth.

## Negative

- All-affected-party consent may prevent optional recording, transcription, or
  AI processing when one person declines.
- Joining or scope changes can pause an active higher-risk feature.
- Cross-surface state acknowledgment and persistent indicators add client and
  protocol complexity.
- Production higher-risk features remain blocked until retention and deletion
  policy is approved.
- Local-caption implementations require validation that text and audio do not
  leave the authorized endpoint or persist.
- Regional legal review may impose stricter consent, notice, age, or retention
  requirements than this product baseline.

---

# Alternatives Considered

## Treat Operating-System Permission as Sufficient Consent

Rejected because the system prompt does not authorize a particular audience,
processor, retention policy, open microphone, or future use.

## Let the Host Consent for the Room

Rejected because a host cannot waive another participant's privacy or creator
rights and may not know who a shared microphone can capture.

## Require Group Approval for Local Accessibility Captions

Rejected because it would let other participants veto a private accessibility
accommodation for media the recipient is already authorized to hear. External
or retained caption processing remains subject to stronger consent.

## Show Every Media State on the Public Stage

Rejected because doing so could reveal private routes, whisper membership, or a
participant's accessibility choice.

## Resume Capture Automatically After Reconnection

Rejected because endpoint replacement, backgrounding, route change, or stale
authority can make the former consent context invalid or surprising.

---

# References

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple privacy design guidance](https://developer.apple.com/design/human-interface-guidelines/privacy/)
- [Android permissions overview](https://developer.android.com/guide/topics/permissions/overview)
- [Android runtime permission guidance](https://developer.android.com/training/permissions/requesting)
- [W3C Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/)
- [ADR 0010: Media-Plane Protocol and Provider Boundary](0010-media-plane-protocol-and-provider.md)
- [ADR 0011: Room Audio Processing Ownership](0011-room-audio-processing-ownership.md)
