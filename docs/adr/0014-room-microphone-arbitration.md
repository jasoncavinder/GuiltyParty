# ADR 0014: Room Microphone Arbitration

## Status

Accepted

## Date

2026-08-06

---

# Context

A physical room may contain a shared microphone and several personal Companion
microphones. Opening two co-located room-audible capture paths can produce echo,
duplicate speech, feedback, ambiguous attribution, and unclear consent. A
microphone capability does not itself confer permission to publish, and a host
must be able to facilitate or stop public speech without silently activating a
participant's device.

The system therefore needs one authoritative room-audible capture role, explicit
speaker intent, safe transfer, bounded authority during control-plane loss, and
visible state across the physical room. Private headset routes remain separate
when they satisfy the privacy and acoustic boundaries in ADRs 0011 and 0013.

---

# Decision

## One Room-Audible Capture Lease

Each physical room has at most one active room-audible capture lease. The lease
is ephemeral control-plane authority bound to:

- session and physical-room identity
- capture endpoint
- participant identity when the source is personal
- source type: personal or shared
- authorization generation and unique request identifier
- route profile and authorized audience
- server-issued expiration

The control plane grants and revokes the lease atomically. The media adapter and
SFU enforce the resulting publication authority but do not decide who receives
the floor. Microphone hardware capability, a published provider track, client UI
state, or physical proximity cannot create the lease.

One room's lease does not prohibit an authorized speaker in a different physical
room. Any session-wide speaking order or dramatic turn-taking remains a
separate control-plane or scenario policy.

## Personal and Shared Sources

A personal microphone request is bound to its participant and endpoint. A
shared microphone belongs to the physical room and is not itself a participant,
account, character, or proof of who is speaking.

A shared microphone receives participant attribution only when the participant
or authorized host makes an explicit, visible selection and the selected
speaker confirms activation. Without that confirmation, public UI labels it
`Room microphone`. Guilty Party never uses voice recognition, biometrics, or AI
inference to identify a speaker.

Session entry discloses that an active shared room microphone may capture nearby
speech. It is never passive. Activation requires a current speaker action on an
authorized Companion, browser fallback, accessible control, or the shared
endpoint itself. A host request or queue selection alone cannot turn it on.

## Request and Activation States

The conceptual lifecycle is:

1. `requested`: a participant asks for the floor; capture remains closed.
2. `reserved`: the control plane selects one current request and validates the
   endpoint, audience, room, and route; capture remains closed.
3. `active`: current user intent, lease authority, required Stage ducking, and
   media publication are all acknowledged.
4. `releasing`: local capture is already muted while server and provider
   authority close.
5. `idle`: no room-audible lease remains.

The UI may use friendlier wording, but `requested` or `reserved` must never look
or behave like an open microphone. State-changing commands use idempotency and
authority generations under ADR 0009.

## Queue and Preemption

An active speaker keeps the room-audible role until release, explicit stop,
lease expiry, route failure, or an authorized host safety stop. An ordinary new
request never preempts an active speaker.

Host tools may select or reorder pending public-speaking requests, invite a
participant to speak, cancel requests, close the active microphone, or apply
scenario eligibility. These operations affect the queue or close existing
authority; they cannot remotely unmute a personal endpoint or silently activate
a shared microphone. A selected participant still confirms current intent.

Safety, authorization, privacy, room-association, and route failures preempt all
ordinary priority and close capture immediately. AI may suggest an order to an
authorized human but cannot request on behalf of a participant, grant, transfer,
preempt, renew, or activate a lease.

## Current User Intent

A hold-to-talk request exists only while the participant holds the control.
Release immediately mutes local capture, releases an active lease, and cancels a
pending request. If the request waits in a queue, it does not activate after the
participant releases it.

A tap-based or assistive request may remain queued without requiring a sustained
press, but selection produces a fresh `Your turn` confirmation. It never opens
later solely because the earlier tap remains recorded. An accessible
tap-to-start/tap-to-stop transmit mode is permitted where hold-to-talk is not
usable, while preserving the same explicit activation, indicator, ducking, and
stop behavior.

Any latched room-audible activation, including the accessible alternative, has
an initial maximum of 120 seconds with a prominent elapsed or remaining-time
indicator. Continuing beyond that bound requires explicit renewal by the
speaker. Renewal does not bypass host stop, route validation, or the technical
lease below.

## Technical Lease Timing

An active capture lease lasts at most 15 seconds and is renewed every five
seconds while all authority and route checks remain valid. The server is the
expiration authority; endpoints use monotonic timing for their local fail-safe
and cannot extend a lease from wall-clock changes.

The capture endpoint and media adapter both enforce expiry. Failure to receive
or apply renewal mutes local capture and revokes publication no later than the
lease boundary, which is intentionally shorter than the general
connection-uncertain threshold in ADR 0009. Renewal never restores an expired
lease silently; returning to active requires current user intent and a new
valid generation.

## Break-Before-Make Transfer

Transfer is always break-before-make:

1. The current endpoint mutes locally.
2. The control plane revokes the old generation and provider publication.
3. The old route acknowledges closure or reaches confirmed expiry.
4. The replacement request is reserved and revalidated.
5. Required Stage ducking is acknowledged.
6. The replacement endpoint receives the new generation and may publish after
   current user confirmation.

If closure cannot be confirmed, the replacement does not open. Stale grants,
renewals, releases, or provider tracks from an older generation are rejected.
The Stage may remain safely ducked while the state is uncertain, but another
microphone is not opened to resolve the uncertainty.

## Stage Ducking and Split Routes

For a split acoustic route, reserving the floor initiates Stage ducking but does
not open capture. The Stage must acknowledge the required Guilty
Party-controlled audio state before the lease becomes active. Failure or timeout
returns the request to a safe non-active state. Releasing or expiring the final
room-audible lease restores Stage audio through an acknowledged transition.

## Visibility and Consent

The active room-audible source and public-speaking queue may be visible on the
Stage, room Companions, and authorized host tools. A personal source uses the
participant's session display identity; a shared source uses `Room microphone`
unless explicit attribution is current. The active state uses the persistent
capture indicators required by ADR 0012.

Queue and active state for public speech contain no character secrets, private
messages, microphone-permission denial reason, or accessibility diagnosis.
Private headset routes and whispers are not exposed through this public state.
Declining, cancelling, timing out, or failing to confirm a request does not
identify a reason or produce a gameplay penalty.

## Determinism and Journaling

Requests, reservations, lease renewal, active media presence, and queue order
are ephemeral control-plane state, not scenario truth. They are not replayed to
recreate speech. A scenario may separately define a canonical speaking turn or
accepted choice, but that event is recorded only when its deterministic rule
accepts it and never contains captured audio.

---

# Consequences

## Positive

- Co-located public microphones cannot legitimately publish at the same time.
- Speaker intent remains necessary even when a host facilitates the queue.
- Shared microphones do not collapse endpoint, participant, and character
  identity.
- Short technical leases bound capture after control-plane loss.
- Break-before-make generations prevent stale or overlapping publication.
- Accessible activation is supported without creating passive capture.

## Negative

- Lease renewal and acknowledged handoff add protocol and provider complexity.
- A 15-second authority lease may end capture during control-plane disruption
  even if media transport remains healthy.
- Latched speakers must renew after 120 seconds.
- Waiting for closure and Stage acknowledgment may create a brief handoff gap.
- Public queue facilitation requires careful host and accessibility UX.

---

# Alternatives Considered

## Let Every Endpoint Publish and Rely on Client Muting

Rejected because hidden UI state does not enforce one room-audible source and a
stale or compromised client could continue publishing.

## Let the Host Remotely Unmute Participants

Rejected because facilitation authority does not replace participant consent to
capture from a personal or shared endpoint.

## Allow Immediate Make-Before-Break Handoff

Rejected because even a brief overlap can produce echo, duplicate speech, and
ambiguous authority.

## Permanently Assign the Shared Microphone to One Participant

Rejected because a shared endpoint belongs to the room and may capture several
speakers; permanent attribution would confuse devices with people.

## Let AI Select and Activate the Next Speaker

Rejected because AI may assist a human but cannot own capture authority or
replace participant intent.

---

# References

- [ADR 0009: Connection and Resumption Policy](0009-connection-resumption-policy.md)
- [ADR 0010: Media-Plane Protocol and Provider Boundary](0010-media-plane-protocol-and-provider.md)
- [ADR 0011: Room Audio Processing Ownership](0011-room-audio-processing-ownership.md)
- [ADR 0012: Capture Indicators and Consent](0012-capture-indicators-and-consent.md)
- [ADR 0013: Private-Audio Route Failure](0013-private-audio-route-failure.md)
- [Device and Room Model](../architecture/device-and-room-model.md)
