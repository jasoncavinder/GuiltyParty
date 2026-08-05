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

Exact lifetimes, code lengths, and authentication requirements remain human and
implementation decisions.

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

- guest identity and account requirements
- invitation lifetime and retry limits
- room creation and approval authority
- device reauthentication and revocation UX
- capability attestation and permission prompts
- recovery ownership when the host is disconnected
