# Device Pairing Boundaries

## Status

This document expands the preferred pairing flow already described in the
device-and-room model. It defines requirements without selecting an identity
provider, transport, QR library, or token format.

## Purpose

Pairing associates an endpoint with an event or session, a physical room, and
the permissions appropriate to its role and capabilities.

Pairing does not imply that a device is a person or that every device belongs to
exactly one participant.

## Preferred Experience

The documented preferred flow is:

1. A Stage displays a QR code or short pairing code.
2. A Companion scans or enters the code.
3. The user authenticates when required.
4. The server authorizes the endpoint for the selected session and room.
5. The participant chooses or confirms the permitted role.

The flow should avoid requiring substantial text entry with a television remote.

## Invitation Authority

A Stage-displayed QR code or short code authorizes only:

- locating the intended Guilty Party server and session
- requesting admission as a Companion endpoint
- viewing the minimum non-private lobby information needed to confirm the
  intended session
- suggesting the physical room associated with the displaying Stage

Possession of the invitation does not create a participant identity, grant
session membership, assign a character or permissions, expose rosters or
scenario information, or activate endpoint capabilities such as microphones or
cameras. A suggested room is not an authoritative room assignment.

After following the invitation, the player authenticates or establishes an
authorized provisional account, confirms the session and suggested room, and
requests membership. The server remains responsible for granting membership,
room association, participant authority, and access to private information.

## Control-Plane Responsibility

Pairing belongs to the control plane. The authoritative service must verify:

- that the event or session is joinable
- that the pairing invitation is valid for the intended scope
- which room and endpoint roles may be selected
- which participant, host, or guest permissions may be granted
- that endpoint capabilities do not create permissions by themselves

Media services consume the resulting authorization but do not decide session or
scenario membership.

## Security Requirements

Pairing credentials must be:

- scoped to the intended operation
- difficult to guess
- short-lived and invalidated after use where practical
- revocable when a device is removed or a session ends
- free of embedded private participant or scenario information

A pairing invitation is valid for 15 minutes from its server-issued time. It
expires sooner if the session ends or the host revokes joining. Code length,
admission approval policy, invitation reuse behavior, and behavior during
server disconnection remain human and implementation decisions.

While joining remains open, the Stage automatically obtains and displays a
replacement invitation when the current invitation expires. Automatic renewal
stops when joining closes, joining is revoked, or the session ends.

The Stage displays only the replacement invitation, but the immediately
previous invitation remains redeemable for a 120-second grace period to
accommodate scanning, submission, and minor authentication delays. Closing or
revoking joining, or ending the session, invalidates both invitations
immediately without a grace period.

The Stage never generates an invitation locally or extends an expired
invitation. If it cannot reach the server when renewal is due, it removes or
disables the expired code, explains that joining is temporarily unavailable,
and retries automatically with bounded backoff. After reconnecting, it confirms
that joining remains open before displaying a fresh server-issued invitation.
This pairing failure does not by itself remove already joined participants or
decide how cached Stage presentation behaves during disconnection.

The server is the sole authority for invitation issuance and expiry. Stage and
Companion wall clocks cannot extend validity. Clients derive informational
countdowns from server-provided timing and use monotonic timers locally. A
material timing disagreement triggers resynchronization; the server's
redemption decision remains authoritative.

One valid Stage invitation may initiate admission requests for multiple
players. It is not consumed by the first request. Each player authenticates or
establishes a provisional account independently, submits a separate admission
request, and receives distinct participant and endpoint authority. Expiration,
joining closure, or revocation prevents further use by every player.

Each admission request has a unique client-generated attempt identifier. The
server binds it to the invitation, authenticated or provisional identity,
endpoint, and request contents. Repeating the identical request from the same
authorized context returns the same pending, approved, or rejected result and
does not create another participant, endpoint, host prompt, or journal event.
Reusing the identifier with different contents is rejected. An intentional
corrected request uses a new identifier.

A public Stage may display a pairing invitation, but it must not display private
character data, account details, or reusable credentials.

## Capability Registration

An endpoint advertises capabilities such as display, microphone, camera, audio
output, and input methods. The server treats these as claims to validate and use
for routing; capability claims do not authorize access to private information.

Permission changes and room reassignment must be server-authorized and visible
to affected users where privacy or media routing changes.

## Failure and Recovery

The experience must account for:

- expired or already-used invitations
- a code presented for the wrong session
- a device losing connectivity during pairing
- duplicate endpoint registration
- a participant changing rooms
- host removal of an endpoint
- loss of the original Stage or Companion

Recovery must not silently broaden access.

## Open Decisions

- provisional-account linking and recovery behavior
- invitation consumption, replay, and revocation behavior
- room creation and approval authority
- device reauthentication and revocation UX
- capability attestation and permission prompts
- recovery ownership when the host is disconnected
