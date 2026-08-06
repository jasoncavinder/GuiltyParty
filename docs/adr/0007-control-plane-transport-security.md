# ADR 0007: Control-Plane Transport Security Milestone

## Status

Accepted

## Date

2026-08-05

---

# Context

The current local MVP uses synthetic identities, placeholder content, and a
developer LAN server. The target product adds permanent accounts, private
participant projections, licensed creator content, mobile beta distribution,
and browser authentication. Those capabilities cannot safely rely on plaintext
HTTP or WebSocket transport merely because the server is on a local network.

The project needs an explicit transition point so prototype exceptions do not
leak into account-enabled, externally distributed, or production builds.

---

# Decision

## Permitted Plaintext Scope

HTTP/WS is permitted only for:

- automated tests bound to loopback
- local developer runs using synthetic data
- the account-free, placeholder-content MVP under an explicitly enabled
  development LAN profile

The development LAN profile:

- exists only in development builds and is absent from beta and release builds
- binds only to explicitly selected private or link-local interfaces
- displays a persistent unencrypted-development-session warning
- rejects permanent accounts, passkeys, Apple or Google sign-in, recovery data,
  real participant data, licensed or non-placeholder private scenario content,
  payments, recording, transcription, and private communications
- never activates automatically after a TLS or certificate failure

Loopback includes true loopback addresses and conforming `localhost` resolution.
An arbitrary LAN hostname or address is not treated as loopback.

## Mandatory HTTPS/WSS Milestone

HTTPS/WSS becomes mandatory before the earliest of:

- implementing a permanent-account or real-authentication slice
- using non-synthetic participant information
- loading non-placeholder private or licensed scenario content
- distributing a TestFlight, Play beta, convention, or external user-test build
- operating across an untrusted, routed, or internet-connected network
- enabling commercial or production deployment

All beta and release mobile configurations reject cleartext control-plane
traffic. Apple builds rely on App Transport Security without broad
arbitrary-load exceptions. Android builds use a Network Security Configuration
that disables cleartext. Browser clients use secure contexts and Secure session
cookies.

## Failure and Downgrade Behavior

Clients never offer to continue insecurely after TLS, certificate, or server
identity verification fails. A plaintext listener may redirect a non-sensitive
browser navigation to HTTPS, but it does not accept credentials, session
authority, private projections, state-changing commands, or WebSocket upgrades.
Servers and clients do not negotiate a plaintext fallback.

## Media Boundary

This decision applies to the control plane. The media plane remains separate
and must establish its own authenticated-encryption requirements before it
carries user audio, video, captions, whispers, or other media.

---

# Consequences

## Positive

- Prototype convenience has an explicit end and cannot silently become a
  production security posture.
- Browser passkeys and protected cookies operate within a secure origin.
- Mobile release configurations use platform cleartext protections.
- Certificate failure cannot be converted into a downgrade attack through user
  prompts or automatic fallback.

## Negative

- External testing cannot begin until the LAN certificate and trust mechanism
  is implemented.
- Developer and release networking configurations must remain deliberately
  separate and tested.
- Convention and isolated-LAN deployments still require authenticated local TLS
  even when they have no internet connection.

---

# Alternatives Considered

## Permit Plaintext on Any Private IP Address

Rejected because private networks can contain untrusted or compromised devices,
and IP address classification provides neither confidentiality nor server
identity.

## Defer TLS Until Commercial Launch

Rejected because browser authentication, beta users, real participant data,
and licensed content require the boundary earlier.

## Let Users Bypass Certificate Warnings

Rejected because this trains users to accept impersonation and prevents the
product from making a reliable server-identity claim.

## Automatically Fall Back to HTTP

Rejected because a network attacker could induce a TLS failure and force
credentials or private content onto plaintext transport.
