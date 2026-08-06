# ADR 0008: LAN Server Certificate and Trust Model

## Status

Accepted

## Date

2026-08-05

---

# Context

ADR 0007 requires HTTPS/WSS before real authentication, private data, external
testing, or production use. An isolated-LAN server cannot depend on an online
public certificate authority at runtime, and DNS-SD records are observable and
spoofable. Native applications can perform application-specific server trust
evaluation, while ordinary browsers rely on their operating-system or browser
trust stores and do not expose an application API for accepting a newly created
private authority.

The design must support native isolated-LAN play, certificate renewal, server
replacement, and explicit recovery without teaching users to bypass certificate
warnings or making one shared project key capable of impersonating every local
server.

---

# Decision

## Installation-Specific Authority

Each LAN server creates an installation-specific private certificate authority
and server identity key during secure setup. There is no universal Guilty Party
LAN private key shared among installations. Private keys remain in the host
platform's protected credential or key storage with restrictive process access;
they are excluded from APIs, logs, analytics, ordinary backups, and repository
configuration.

The installation authority issues short-lived leaf certificates for the
server's current LAN service names and addresses. It renews them locally before
expiry and reissues them when relevant network names or addresses change. Leaf
renewal under the same paired authority does not require client re-pairing.

## Pairing and Native Trust

A QR pairing invitation carries the server identity and installation-authority
public-key fingerprint alongside the short-lived invitation. A short-code or
manual flow that cannot carry the full binding requires a human-comparable
authentication string on the host or Stage and the joining client before trust
is stored.

Native clients perform application-controlled certificate validation anchored
to the server-specific authority learned through that pairing channel. They
store the trust binding in platform-protected storage. DNS-SD instance names,
TXT values, hostnames, addresses, and first network contact are never trust on
first use and cannot replace the paired fingerprint.

On reconnect, the certificate must chain to the remembered installation
authority and satisfy the expected server-authentication and validity checks.
A mismatch fails closed and does not offer plaintext or certificate-warning
bypass.

## Rotation, Loss, and Replacement

A planned installation-authority rotation is authenticated by the existing
server authority and visibly announced to the host and paired clients. Exact
rotation intervals and key algorithms are implementation decisions subject to
security review.

If the authority key is lost, corrupted, unexpectedly changed, or cannot
authenticate its successor, the server has a new identity. Clients require
explicit re-pairing. A database restore, matching DNS-SD name, matching address,
or copied display name cannot silently transfer trust. Resetting server identity
invalidates local endpoint and session authority and produces a prominent host
warning.

An owner-controlled encrypted identity migration or backup may be designed
later, but ordinary backups do not contain the authority key.

## Public and Browser Trust

Public or cloud services use ordinary publicly trusted certificates. A generic
browser surface cannot dynamically pin the installation authority. Its normal
Companion path therefore uses a publicly trusted HTTPS origin when internet or
cloud connectivity is available.

On a fully isolated LAN, browser surfaces are supported only on
operator-managed devices whose trust store was provisioned with the applicable
server authority. Ordinary guests are not asked to install a root certificate
or bypass a warning. A zero-install consumer browser Companion on a completely
isolated LAN is not guaranteed in the initial product. Any future mechanism for
that case must preserve authenticated TLS and receive a separate architectural
decision.

## Hosting Form

The trust model applies whether the LAN server runs as a standalone process or
is later embedded in a desktop host application. A desktop application that
hosts the server would own the installation-specific authority through its
secure local storage and present the approved pairing flow. Whether to build and
package that combined desktop host/server remains a separate future decision.

---

# Consequences

## Positive

- Native clients can authenticate an isolated-LAN server without internet or a
  device-wide private root.
- Compromising one server authority does not impersonate every installation.
- Leaf renewal and network changes do not routinely interrupt paired clients.
- Discovery spoofing and copied server names cannot transfer trust.
- A future desktop-hosted server can reuse the same boundary.

## Negative

- Loss of the installation authority requires re-pairing unless a later secure
  migration mechanism is approved.
- Generic browser fallback is limited on a completely isolated LAN.
- Operator-managed browser devices need advance trust provisioning.
- Native clients require carefully reviewed custom trust evaluation.

---

# Alternatives Considered

## Trust the First Discovered Certificate

Rejected because an attacker can win discovery or first connection and become
the remembered server.

## Share One Private Root Across Every LAN Server

Rejected because extraction from one installation would permit impersonation
of all installations.

## Ask Guests to Install a Root Certificate

Rejected as the normal consumer path because it creates severe security and
support risk and conditions users to grant device-wide trust casually.

## Allow Browser Certificate-Warning Bypass

Rejected because it destroys authenticated server identity and conflicts with
the no-downgrade transport invariant.

## Require Internet for Every LAN Session

Rejected because isolated-LAN operation and convention use are accepted product
requirements.
