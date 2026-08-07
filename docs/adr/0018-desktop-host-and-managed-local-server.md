# ADR 0018: Desktop Host and Managed Local Server

## Status

Accepted

## Date

2026-08-06

---

# Context

Guilty Party intends to support host tools in web and possible desktop
applications. Normal commercial operation can use official Guilty Party remote
services, while accepted convention, private-event, and isolated-LAN use cases
require a locally operable server. ADR 0008 already defines an
installation-specific trust authority for a LAN server, and ADR 0010 permits a
desktop application to supervise a local media component.

A desktop application can make local hosting approachable, but combining UI,
server lifecycle, permanent-account authority, deterministic state, and private
storage without clear boundaries would create avoidable security and recovery
risks. Host mode must also remain restricted to authenticated, registered hosts
without making internet connectivity a runtime requirement for every approved
offline event.

# Decision

## Remote Hosting Is the Default

When the desktop application enters Host mode, it connects to Guilty Party's
official remote services by default. Remote operation uses the normal public
service identity, authentication, control-plane, media, storage, and operational
boundaries.

Running a server locally is an explicit host choice. The application explains
that local operation makes the host responsible for the computer, network,
availability, storage, updates, and recovery needed for that event. It does not
silently switch to a local server after a remote failure or silently downgrade
transport security.

## Host-Mode Eligibility

Host mode is available only to an authenticated Guilty Party account that the
official service recognizes as a registered host. Initial host registration and
the initial issuance of host authority require an internet connection to the
official service.

The desktop application may cache a signed, offline-verifiable host-eligibility
assertion so an already registered host can use Host mode on an isolated LAN.
The assertion is:

- issued only by the official account and host-registration authority
- bound to the host account and desktop installation
- scoped to authorizing Host mode and local hosting, not general account access
- bounded in time and subject to an online renewal requirement
- stored in operating-system-protected credential storage
- verified locally without treating editable profile data or a cached UI flag
  as authority

The exact offline-validity period, renewal window, revocation behavior while a
computer is disconnected, and active-session expiry behavior require a later
security and product decision. If no valid cached assertion is available, the
application does not enable Host mode offline and does not offer an insecure
override. An offline assertion does not register a new host, change account
status, or authorize permanent-account recovery.

Player, Stage, or other non-host desktop capabilities do not grant Host mode,
server administration, or host session authority merely because they run in the
same installed application.

## Managed Local Server Boundary

For local hosting, the desktop application installs or carries, configures,
starts, stops, updates, monitors, and recovers a separately bounded Guilty Party
server process. "Embedded" describes product packaging and supervision; it does
not merge the server into desktop UI state.

The server remains authoritative for:

- authentication and session authority accepted for the local deployment
- participants, endpoints, physical rooms, and permissions
- recipient-specific projections and secrecy enforcement
- deterministic scenario execution and journal replay
- scenario and session persistence
- control-plane and media-plane policy
- the installation-specific LAN certificate authority and pairing trust

The desktop UI is an authenticated server client plus a narrowly privileged
local supervisor. Its supervisor interface exposes lifecycle, configuration,
health, update, and recovery operations but not private payload inspection or
direct mutation of canonical scenario state.

## Lifecycle and Failure Behavior

The desktop application must:

- report server startup readiness and actionable, privacy-minimized failures
- use graceful shutdown and journal validation
- avoid unexpectedly terminating an active session when a window closes
- require confirmation before stopping a server with an active session
- never reset, invent, or silently discard state after a crash
- restart automatically only when journal and storage integrity checks make that
  safe, otherwise require explicit recovery
- show whether Host mode is using official remote services or a local server

The exact background-process UX may vary by desktop operating system, but an
active local session cannot depend on an otherwise invisible window remaining
open accidentally.

## Storage, Trust, Updates, and Uninstall

The managed server owns its data directory, journals, scenario content, schema
versions, and installation identity. Administrative credentials and private
keys use operating-system-protected storage with access restricted to the
applicable server and supervisor components. Health views and logs exclude
private participant and scenario payloads.

Server and media-component updates are signed and version-compatible. The
desktop application does not update or migrate them during an active session.
Migration performs preflight checks and preserves an explicit recovery path;
it never silently creates a fresh store or authority after failure.

Ordinary desktop application updates preserve the local server's
installation-specific trust identity. Uninstalling the application does not
silently delete server data, journals, scenarios, or trust identity. Permanent
deletion requires a separate explicit, clearly scoped action.

Secure migration of a complete server installation, including its trust
identity, to another computer remains a separate decision. Copying a database,
hostname, or display name does not transfer server identity under ADR 0008.

## Deployment Flexibility

The desktop application can operate as:

- a Host client connected to official Guilty Party remote services, which is the
  default
- a Host client and supervisor for a local isolated-LAN server
- a Host client connected to another explicitly configured, trusted deployment
  when a future approved product mode permits it

Selecting a desktop framework, supported operating systems, package layout,
updater, process manager, database, or secure-storage API is outside this ADR.

# Consequences

Positive:

- Hosts receive a normal managed remote experience and an explicit isolated-LAN
  option in the same product.
- Online registration prevents an unauthenticated local installation from
  inventing registered-host status.
- A signed cached assertion preserves approved offline hosting without making
  the official identity service an event-time dependency.
- Process and storage boundaries preserve server authority and deterministic
  recovery even when packaged with a desktop UI.

Negative:

- The product must operate both remote infrastructure and a supported local
  server package.
- Offline host assertions introduce issuance, expiry, renewal, revocation, and
  support responsibilities.
- Desktop installation, updates, protected storage, process supervision, and
  recovery require platform-specific work.
- Local hosts assume meaningful computer and network operational responsibility.

# Alternatives Considered

## Always Run a Local Server

Rejected. Official remote hosting should be the normal low-friction mode and can
provide centrally managed availability, updates, and operations.

## Remote Hosting Only

Rejected because isolated-LAN, convention, and private-event use cases are
accepted requirements.

## Enable Host Mode from a Local Preference

Rejected. A local setting cannot establish registered-host status or account
authority.

## Require Internet Throughout Every Hosted Session

Rejected because a previously registered and authorized host must be able to
run an approved isolated-LAN event.

## Merge the Server into Desktop UI State

Rejected. UI lifecycle and application windows are not reliable boundaries for
canonical state, journals, trust identity, media services, or recovery.
