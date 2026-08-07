# ADR 0020: Android LAN Discovery and Permission UX

## Status

Accepted

## Date

2026-08-06

---

# Context

ADR 0006 defines `_guiltyparty._tcp.local.` DNS-SD advertisements as
privacy-minimized, untrusted discovery. ADR 0008 requires native clients to
authenticate the selected LAN server through pairing-bound TLS rather than
trusting discovery metadata. ADR 0019 sets Android 13/API 33 as the initial
deployment minimum and requires advance testing of Android 17/API 37 local-
network protections.

Android 17 blocks local-network access by default for applications targeting
API 37 unless the application uses an approved system-mediated path or receives
broad `ACCESS_LOCAL_NETWORK` permission. Android's NSD service picker can grant
access to a user-selected service without broad LAN permission. Guilty Party
must preserve usable QR pairing and reconnection while avoiding unnecessary
network visibility, background scanning, misleading manual fallbacks, or any
confusion between reachability and server identity.

# Decision

## User-Initiated, Foreground Discovery

The Android Companion starts local discovery only after an explicit user action
such as **Join local game** or a QR-pairing step. Discovery is scoped to the
Guilty Party DNS-SD service type, runs only while the relevant join or reconnect
experience is foregrounded, and stops after selection, cancellation, timeout,
or successful connection.

The application does not continuously scan in the background, build a history
of nearby servers, upload discovery results, or use service presence for
analytics or location inference.

## Android 13 Through Android 16

On API 33 through API 36, the application uses `NsdManager` for foreground
discovery and resolution under the platform's applicable network-access model.
It does not request location permission for Guilty Party discovery. It also does
not request unrelated Bluetooth or nearby-device authority as a substitute for
local-network access.

Where an Android 13 device or modular system version requires explicit Wi-Fi
multicast reception management for mDNS, the application holds that resource
only during an active foreground discovery attempt and releases it promptly.
The implementation must use capability and version checks rather than assume
that every Android 13 device has the same modular networking behavior.

## Android 17 and Later

When targeting API 37 or later, the normal local-join path uses Android's
system-mediated NSD service picker with the Guilty Party service type. A server
address obtained through that selection is used only for the selected join or
reconnect flow and is still subject to protocol checks, authenticated TLS, and
pairing authority.

The system picker is the default because it permits a person to select a local
service without granting the application general visibility of the LAN. An OS
service-picker choice establishes reachability permission only. It does not
establish Guilty Party server identity, invitation validity, account identity,
session membership, or participant authority.

## QR Pairing and Trust

QR pairing remains the preferred product path. The QR channel carries the
short-lived invitation and the installation-authority fingerprint required by
ADR 0008; it does not make an arbitrary network destination trusted.

On Android 17 and later, scanning a local-host QR code may be followed by the
system service picker so the user can grant access to the advertised endpoint.
The client then verifies that endpoint against the QR-bound server authority.
A matching service label, instance suffix, hostname, address, TXT record, or
proximity is never accepted as identity. A mismatch fails closed and does not
offer plaintext transport or a certificate-warning bypass.

## Optional Broad Local-Network Access

The application may offer broad local-network access as an optional convenience
only for a feature that actually needs it, such as automatic rediscovery of
previously paired local servers or direct/manual address connection when the
platform cannot mediate that route.

The request occurs just in time after the user chooses that feature. Before the
system prompt, the Companion explains in plain language that the permission
allows Guilty Party to find and connect to hosting computers on the local
network. It does not imply that the permission grants access to private game
content, microphones, files, other devices, or host authority.

Denial or later revocation preserves:

- official remote-server play
- system-picker-based local joining where the platform makes it available
- a clear route to reconsider the optional permission in system settings

The application does not repeatedly prompt, punish denial, or hide the remote
path. Permission state is an endpoint capability visible to the local UX, not a
participant characteristic or scenario event.

## Manual Addressing Is Not a Permission Bypass

Manual IP address or hostname entry is an alternate addressing method, not an
Android privacy-control bypass. If the platform requires broad local-network
permission for a direct connection, the UI says so and offers the system picker
or remote service rather than pretending the server is offline.

Failure or denial never enables HTTP/WS fallback, trust on first use,
certificate-warning bypass, another participant's endpoint, or a public Stage
as a private Companion substitute.

## Reconnection and Errors

A previously paired endpoint may reuse an OS-authorized route and reconnect
automatically only while the server's remembered installation authority and
session authority continue to validate. If Android requires renewed service
selection or permission, the Companion presents an explicit reconnect action
and retains no stale private projection while waiting.

The user-facing error distinguishes, where the platform provides enough
evidence:

- no Guilty Party service was selected or discovered
- local-network access is unavailable or revoked
- the chosen service is unreachable
- server identity verification failed
- protocol or session authorization is incompatible

Diagnostic details remain privacy-minimized and do not include invitations,
credentials, fingerprints, private projections, or a retained nearby-server
inventory.

## Verification

Before Android release, discovery and joining are tested on at least:

- API 33 at the supported minimum
- API 36 with current target behavior
- API 37 before target adoption, including system-picker selection, broad-
  permission grant, denial, revocation, and retry

Tests include multiple advertisements, spoofed names and TXT data, mismatched
TLS identity, multicast suppression, permission changes during reconnection,
remote-mode continuity, and discovery cleanup after lifecycle transitions.

# Consequences

Positive:

- Most Android 17 users can select a local server without granting broad LAN
  visibility.
- QR pairing retains the authenticated trust binding while Android owns local
  reachability consent.
- Remote play and a privacy-preserving picker remain available after optional
  broad-permission denial.
- Foreground scoping and non-retention reduce passive network observation.

Negative:

- Android 17 may add a system selection step after QR scanning.
- Automatic local rediscovery may require an optional broad permission or a
  renewed system selection.
- API 33 through API 37 require distinct discovery, multicast, permission, and
  test paths.
- System-picker behavior and modular Android networking updates require physical
  device verification.

# Alternatives Considered

## Always Request Broad LAN Access

Rejected. Ordinary local joining can use the Android 17 service picker, and the
application should not request visibility beyond the selected service without a
user-chosen feature that needs it.

## Treat QR Scanning as Network Permission

Rejected. A Guilty Party QR code supplies invitation and trust information but
cannot override Android's local-network privacy boundary.

## Use Manual IP Entry After Permission Denial

Rejected as a purported bypass. Direct sockets are still local-network access,
and misleading users would create confusing failures.

## Trust the System-Picker Selection

Rejected. The picker authorizes contact with a service; it does not authenticate
the Guilty Party installation or authorize a session.

## Scan Continuously for Faster Reconnection

Rejected because background observation is unnecessary and conflicts with the
project's privacy and data-minimization principles.

# References

- [Android local-network permission](https://developer.android.com/privacy-and-security/local-network-permission)
- [Android `NsdManager`](https://developer.android.com/reference/android/net/nsd/NsdManager)
