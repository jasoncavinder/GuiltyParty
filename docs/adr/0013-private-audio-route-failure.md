# ADR 0013: Private-Audio Route Failure and Recovery

## Status

Accepted

## Date

2026-08-06

---

# Context

Private audio may fail before it starts or while speech is in flight. Causes
include loss of authorization, an E2EE key error, an unexpected subscriber, a
headphone or output change, endpoint transfer, network interruption, or a
provider failure. A route may remain technically connected while no longer
being private, such as when headphones disconnect and playback moves to a
speaker.

Private speech cannot be made private again after an unintended person or
output has received it. Recovery must therefore stop first, avoid optimistic
delivery claims, tell affected participants what is known, and never solve a
route problem by weakening privacy or pressuring a participant into a public
alternative.

---

# Decision

## Fail-Closed Invariant

A private-audio route stops capture, publication, subscription, decoding, and
playback as soon as any required property becomes absent or uncertain:

- current sender, recipient, endpoint, and session authorization
- server-enforced audience restrictions
- the expected E2EE key epoch and authenticated members
- an approved personal output route
- current endpoint and primary-authority generation
- the media provider's ability to enforce the route

Affected endpoints mute and close local tracks, clear pending playback and
caption buffers, and cover related private UI. The control plane and media
adapter revoke or update grants and subscriptions, remove a provider participant
when necessary, and deny renewal under stale authority.

No failure path downgrades E2EE, broadens the audience, enables a public speaker,
uses the Stage, selects another participant's endpoint, admits an AI or
transcription process, or records content for later delivery.

## Output and Endpoint Changes

A private output classification is valid only for the currently confirmed
endpoint and route. Headphone disconnection, Bluetooth or output change,
casting, endpoint transfer, app restart, reconnect, or loss of route
confirmation returns the private route to a non-active state. The user must
confirm or select an approved personal output and affirmatively resume.

Platform-specific detection and interruption mechanics remain MC-MEDIA-003.
Regardless of platform timing, a newly selected speaker, Stage, cast target, or
unknown output is not assumed private. If the product cannot continuously
validate a route closely enough to enforce this rule, private audio is
unavailable on that route.

## Encryption and Membership Changes

Private media uses a route-scoped E2EE key epoch. A membership, endpoint,
authorization, or route change invalidates the prior epoch before a replacement
route becomes active. Reconnection does not restore an old epoch. Stale or
out-of-order media from an invalid epoch is rejected and is not played after
recovery.

Failure to establish or confirm the new key fails closed. Transport encryption
alone is not a fallback for a route that requires application E2EE.

## Delivery Semantics

Private audio is ephemeral and is not a reliable message queue. Interrupted
speech is not retained, retransmitted, or automatically replayed. Recovery
starts a new transmission only after the sender chooses to speak again.

If failure occurs after any media may have left the sender, Guilty Party does
not claim that none was delivered. The sender sees an honest state such as
`Private audio interrupted; part may have been heard`. An intended recipient
who received only part sees that the private audio was interrupted. The product
does not infer semantic completion from packet or transport delivery.

## Audience-Specific Status

| Audience | Permitted status |
| --- | --- |
| Sender | Route stopped, whether partial delivery is possible, and safe recovery choices; local device or output detail may be shown to its owner. |
| Intended recipients | Route interrupted or unavailable and whether they may have received only part; no unnecessary sender-device or permission detail. |
| Explicitly authorized host or route manager | Minimum participant or endpoint readiness needed to offer a remedy; never content, captions, denial reason, or broader private-route information. |
| Stage and unrelated participants | No indication that a private route or whisper exists. If gameplay must pause, only a generic pause state. |

Host tools do not identify who refused a less-private alternative. A host who is
not authorized to know a private route exists receives only aggregate session
readiness. Operational error messages and logs use safe reason classes rather
than communication content, character secrets, or unnecessary device names.

## Recovery Order

Recovery offers only choices that preserve or deliberately re-establish the
required audience:

1. Revalidate authorization, audience enforcement, personal output, and a new
   E2EE epoch, then let the user explicitly resume the same route.
2. Move the participant to another authorized personal endpoint or confirmed
   personal output and establish a new route.
3. Offer an authorized private text or ephemeral caption modality when the
   scenario and recipient capabilities permit it.
4. Offer a scenario-defined adaptation or participant-consented,
   minimum-information host assistance under the safe capability-degradation
   policy.
5. Pause or cancel the private interaction.

The participant may reject any recovery choice without timer penalty, public
identification, or pressure. A scenario may continue without the interaction
only when it defines a deterministic, secrecy-preserving alternative and the
affected participant confirms it.

## Potential Exposure

If media may have played through a public output, reached an unexpected
subscriber, used the wrong key audience, or otherwise crossed the intended
privacy boundary, the event is classified as a potential exposure rather than
an ordinary connectivity failure.

Affected senders and intended recipients receive a prompt, factual notice of
what is known, what may have occurred, when the route stopped, and available
next actions. The product does not provide false assurance when exposure cannot
be ruled out. Any known unintended recipient or output class is disclosed only
to the extent needed by affected participants and authorized safety personnel.
The Stage and unrelated participants are not used to announce the event.

Potential-exposure records contain only opaque references, safe cause and
audience classes, lifecycle times, detection source, and response actions. They
contain no raw media, transcript, caption text, or scenario secret. Production
retention, access, notification, and deletion require an approved safety-data
lifecycle; absent that policy, `TBD` does not permit indefinite storage.

## Determinism and Journaling

Media route state, packets, and exposure metadata are not scenario truth and
are not replayed as communication content. The deterministic scenario journal
may record only a minimum accepted gameplay transition when the scenario itself
requires one, such as choosing an approved alternative or pausing a timer. It
does not record private speech or reconstruct a failed whisper.

---

# Consequences

## Positive

- Private audio stops before recovery attempts can broaden its audience.
- E2EE, provider authorization, personal output, and endpoint authority are
  treated as one route invariant rather than independent UI hints.
- Participants receive honest partial-delivery and potential-exposure notices.
- Recovery remains private, accessible, voluntary, and deterministic where it
  affects gameplay.
- Private audio never becomes a retained or replayable message implicitly.

## Negative

- Route changes and reconnects require explicit resume and a new key epoch.
- Short interruptions may terminate a whisper even when transport soon
  recovers.
- Some device and output combinations cannot support private audio reliably.
- Exposure detection, audience-specific notices, and minimized incident records
  add security and support complexity.
- Exact safety-event retention and notification remain blocked on data-lifecycle
  and legal decisions.

---

# Alternatives Considered

## Fall Back Automatically to the Device Speaker

Rejected because connectivity does not justify turning private speech into
public room audio.

## Queue and Replay Interrupted Audio

Rejected because it would create retained private communication, ambiguous
delivery, stale authorization risk, and new deletion obligations.

## Resume the Former Route After Reconnect

Rejected because endpoint authority, output, membership, and E2EE state may all
have changed while disconnected.

## Tell Only the Host About Failures

Rejected because the affected participants need direct control and accurate
knowledge, while the host may not be authorized to know that the route exists.

## Treat Possible Disclosure as an Ordinary Network Error

Rejected because a privacy boundary may have been crossed and affected people
need an honest, purpose-limited response.

---

# References

- [ADR 0009: Connection and Resumption Policy](0009-connection-resumption-policy.md)
- [ADR 0010: Media-Plane Protocol and Provider Boundary](0010-media-plane-protocol-and-provider.md)
- [ADR 0011: Room Audio Processing Ownership](0011-room-audio-processing-ownership.md)
- [ADR 0012: Capture Indicators and Consent](0012-capture-indicators-and-consent.md)
- [Privacy and Safety](../security/privacy-and-safety.md)
- [Data Lifecycle and Decision Register](../security/data-lifecycle.md)
