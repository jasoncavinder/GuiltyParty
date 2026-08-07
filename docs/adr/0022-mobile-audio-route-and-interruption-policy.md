# ADR 0022: Mobile Audio Route and Interruption Policy

## Status

Accepted

## Date

2026-08-06

---

# Context

A Companion may use a built-in microphone, wired headphones, Bluetooth
headphones, a device speaker, or another operating-system-managed audio route.
Those routes can change while media is active because a headset disconnects,
Bluetooth switches devices, a phone call or assistant interrupts the audio
session, the application moves to the background, audio focus is lost, or the
platform media service restarts.

A route that remains technically usable may no longer be private or may create
an unsafe acoustic path. In particular, private audio must never fall back from
headphones to a room-audible speaker, and a microphone must not resume merely
because an interruption ended. The policy must preserve the separate authority
for private Companion media, room-audible capture, and public Stage output
without treating operating-system route state as canonical scenario truth.

# Decision

## Route Model and Authority

Each mobile endpoint tracks microphone input and audio output as separate,
current route properties. Route evaluation includes:

- whether the output is personal, public or shared, or unknown
- whether input and output form one acoustic endpoint or a split room route
- supported voice-processing capabilities
- current participant, endpoint, audience, E2EE, media-grant, and room
  authority
- current room-microphone lease, push-to-talk intent, and Stage-ducking state

An operating-system route selection is a capability observation, not proof of
participant identity, physical-room membership, privacy, or authorization.
Bluetooth names, remembered devices, and physical proximity do not create
trust. Route state sent beyond the endpoint uses privacy-minimized classes such
as `personal headphones`, `device speaker`, or `unknown`; hardware addresses,
serial numbers, and unnecessarily identifying device names are not uploaded.

## Platform Routing

The operating system remains the primary audio-route arbiter. The Companion
may present platform-supported route choices and remember an explicit choice
only while that route remains available and authorized. It does not fight
system-level headphone switching or silently force the speaker for private
media.

iOS and iPadOS use `AVAudioSession` route, interruption, and media-service
notifications and the platform's supported selection interfaces. Android uses
current communication-device and audio-focus APIs, including device-change
callbacks and `setCommunicationDevice()` where appropriate. New work does not
use the deprecated Bluetooth SCO or speakerphone-routing APIs as its primary
design.

Route changes are applied break-before-make. An endpoint does not publish or
play protected media while waiting for a requested route to become current.
A failed or unconfirmed route request returns to a visible non-active state and
clears any temporary communication-device selection when appropriate.

## Changes That May Continue Automatically

Private playback may continue automatically only when all of the following are
verified:

- the change adds or selects a currently personal headphone output
- the authorized audience and endpoint authority are unchanged
- the microphone input, publication state, and room acoustic relationship do
  not change
- the output is not mirrored, cast, shared, or otherwise room-audible

This permits the ordinary expectation that connecting personal headphones does
not unnecessarily stop already-authorized private playback. It is not a rule
that every Bluetooth device is private.

Public, non-private playback may follow the operating system's selected output
when the authorized audience remains public and the route does not create an
unresolved echo, feedback, room-mapping, or ducking risk. A separately
authorized public Stage route remains governed by its own endpoint and Stage
projection authority.

## Changes That Require Stop and Confirmation

The Companion immediately pauses private playback, closes microphone
publication, releases any room-microphone lease and Stage-ducking reservation,
and invalidates the active route assumption when:

- wired or Bluetooth headphones disconnect
- Bluetooth switches, drops, or becomes ambiguous
- private output changes to a speaker, shared output, cast or mirrored route,
  or unknown destination
- the microphone input or communication device changes
- input and output change between combined and split room routes
- authorization, E2EE, provider enforcement, consent, or endpoint authority is
  absent or uncertain

Private audio never falls back to a speaker. Pending private buffers are
cleared and are not replayed. Resumption requires revalidation of the input and
output, a new media grant and key epoch where applicable, a fresh projection,
and explicit participant confirmation. Microphone capture always requires a
fresh speaking action; push-to-talk never resumes automatically.

## Calls, Assistants, and Audio Focus

A phone call, assistant, exclusive system audio, permanent audio-focus loss, or
another interruption that takes media authority stops microphone publication,
releases the room-microphone lease, and pauses private playback. A transient
duck request may reduce only eligible public, non-private playback. It does not
keep a microphone active or make private speech continue through an uncertain
or unintelligible route.

When an interruption ends or audio focus returns:

- control-plane transport and authorized projections may reconnect
  automatically under ADR 0009
- public playback may resume only when the same authorized public route and
  room relationship remain valid and the platform permits resumption
- private playback, open or latched microphones, and media publication require
  current route validation and explicit participant confirmation
- a hold-to-talk action that ended during the interruption remains ended

The endpoint may report a generic media-unavailable or readiness state needed
for session operation. It does not report caller information, call logs,
assistant content, the detailed interruption source, or other private device
activity to hosts, participants, analytics, or scenario state.

## Backgrounding, Locking, and Process Lifecycle

The initial mobile product does not support background microphone capture or
private session-media playback. Moving to an inactive or background state, or
locking the device, stops publication, releases microphone and ducking
authority, pauses private playback, and clears private audio buffers.

Returning to the foreground may restore control-plane connectivity
automatically, but it revalidates the endpoint and routes, obtains fresh
authority where needed, and asks the participant to resume private playback or
capture. Cached private media is not revealed or replayed during recovery.

A targeted public Stage route is separate from Companion media. It may continue
only when the Stage has independent server authorization and can remain active
without preserving the private Companion media session. Otherwise the product
pauses the Stage honestly rather than keeping protected mobile media alive in
the background.

## Media-Service Reset and Application Restart

After a platform media-service reset, provider SDK reset, or application
process restart, the client rebuilds its audio session and graph but does not
automatically restart playback or recording. It clears stale communication-
device selection, media tracks, grants, route-scoped buffers, and key state as
applicable; then it revalidates the endpoint and waits for explicit participant
action.

## User Experience and Verification

The Companion identifies the route consequence without exposing unnecessary
device details. Examples include:

> Private audio paused because output changed to Device Speaker. Confirm a
> personal output to continue.

> Microphone off after interruption. Hold to talk when ready.

Route transitions remain visible and non-active until acknowledged. Accessible
controls provide the same confirmation and immediate stop behavior without
requiring a sustained gesture where the accepted room-microphone policy allows
an alternative.

Verification covers at least:

- wired-headphone insertion and removal
- Bluetooth connection, disconnection, multipoint switching, and route loss
- built-in speaker and personal-output transitions
- microphone-input and combined-versus-split route changes
- calls, assistants, alarms, transient ducking, and temporary or permanent
  audio-focus loss
- backgrounding, foregrounding, screen lock, process termination, and media-
  service reset
- push-to-talk, latched accessible capture, room-microphone lease expiry, and
  Stage ducking during interruption
- private audio, public audio, and a separately authorized Stage route

MC-DEL-002 defines the representative physical-device matrix for these cases.

## Determinism and Data Handling

Route, focus, interruption, Bluetooth, and lifecycle state is ephemeral
endpoint or media-control state, not canonical scenario truth. It is not
replayed to reconstruct media or participant behavior. A deterministic journal
may contain only an accepted gameplay consequence, such as a scenario-defined
pause or alternative, and never the private media or underlying device event.

Operational diagnostics use bounded, non-content reason classes and are
subject to the deferred data-lifecycle and crash-reporting decisions. This ADR
does not authorize collection of hardware identifiers, Bluetooth history,
call details, raw media, transcripts, or behavioral analytics.

# Consequences

Positive:

- Private audio cannot silently move from headphones to a public speaker.
- Microphones do not reopen after calls, backgrounding, focus loss, or reset
  without current participant intent.
- Public Stage output remains independent from private Companion routing.
- Modern native APIs and break-before-make transitions provide testable route
  behavior without making device state scenario truth.
- Host visibility and diagnostics remain operational and privacy-minimized.

Negative:

- Some harmless route changes require an extra confirmation.
- Brief interruptions terminate push-to-talk and may end an ephemeral private
  exchange rather than resuming it.
- Reliable behavior requires physical-device testing across OS versions,
  Bluetooth hardware, calls, lifecycle states, and room configurations.
- Background private audio and microphone capture are unavailable initially.
- Platform and OEM differences require native implementations and may prevent
  some route combinations from supporting private media.

# Alternatives Considered

## Always Resume the Former Route

Rejected because the former output, input, authorization, acoustic relationship,
or E2EE state may no longer be valid.

## Fall Back to the Device Speaker

Rejected because a technical route change must not turn private content into
room-audible content.

## Treat Every Bluetooth Connection as Private

Rejected because Bluetooth outputs may be shared, room-audible, switched by
another system, or incapable of preserving the expected input and output
relationship.

## Keep Microphone Capture Active Through Interruptions

Rejected because system focus, route, current intent, and room-microphone
authority may be lost or ambiguous.

## Support Background Companion Media Initially

Rejected because background execution adds substantial platform, consent,
privacy, battery, store-review, and lifecycle complexity before a demonstrated
product requirement.

## Send Detailed Interruption Information to the Host

Rejected because the host needs only operational readiness and is not entitled
to a participant's call, assistant, device, or private route details.

# References

- [Apple: Responding to audio route changes](https://developer.apple.com/documentation/avfaudio/responding-to-audio-route-changes)
- [Apple: Handling audio interruptions](https://developer.apple.com/documentation/avfaudio/handling-audio-interruptions)
- [Apple: Media services were reset notification](https://developer.apple.com/documentation/avfaudio/avaudiosession/mediaserviceswereresetnotification)
- [Android: Audio Manager self-managed call guide](https://developer.android.com/develop/connectivity/bluetooth/ble-audio/audio-manager)
- [Android: Manage audio focus](https://developer.android.com/media/optimize/audio-focus)
- [ADR 0009: Connection and Resumption Policy](0009-connection-resumption-policy.md)
- [ADR 0011: Room Audio Processing Ownership](0011-room-audio-processing-ownership.md)
- [ADR 0012: Capture Indicators and Consent](0012-capture-indicators-and-consent.md)
- [ADR 0013: Private-Audio Route Failure and Recovery](0013-private-audio-route-failure.md)
- [ADR 0014: Room Microphone Arbitration](0014-room-microphone-arbitration.md)
- [ADR 0021: Mobile Screen Capture and Stage Casting](0021-mobile-screen-capture-and-stage-casting.md)
