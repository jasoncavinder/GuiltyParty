# ADR 0006: Link-Local Service Discovery

## Status

Accepted

## Date

2026-08-05

---

# Context

Guilty Party clients must find a local control-plane server without requiring
players to type an IP address. Discovery occurs on home, event, and convention
networks where several servers may be present and where multicast records can
be observed or forged by other devices. Discovery therefore needs a stable
cross-platform service type, minimal metadata, privacy-safe naming, and a clear
separation from server trust, pairing, authentication, and authorization.

---

# Decision

## Service Type and Transport

The local server advertises `_guiltyparty._tcp.local.` through DNS-Based Service
Discovery over multicast DNS. The project will seek registration of the
`guiltyparty` service name with IANA before production distribution.

The SRV record identifies the host and port of the HTTPS/WSS control-plane
service. Advertising TCP describes the application service, even though mDNS
discovery itself uses multicast UDP.

## Instance Name

The default instance name is privacy-neutral and collision-friendly, such as
`Guilty Party A7K3`, using a short random display suffix. The instance name is a
human-facing label, not server identity. A host may choose a custom name only
after the product explains that it is visible to devices on the local link.

Standard mDNS probing and conflict resolution may rename a colliding instance.
Clients do not use the instance name, hostname, address, or suffix as an
authentication factor or persistent identity.

## TXT Record

The service publishes one small TXT record containing only:

- `txtvers=1`
- `protovers=1`
- `tls=1`

Detailed protocol compatibility and feature information comes from the
non-private HTTPS compatibility endpoint after resolution. TXT records do not
contain session or event names, hosts, participants, rooms, scenarios, joining
state, accounts, credentials, addresses, certificate fingerprints, or stable
tracking identifiers.

## Scope and Lifetime

Advertisement is link-local under `.local.` and is limited to explicitly
eligible LAN interfaces. Cellular, VPN, WAN, unicast wide-area DNS-SD, and
cross-subnet discovery relays are excluded by default and require a future
decision.

The advertisement remains present while the local control-plane service is
available, including when joining is closed, so authorized endpoints can
rediscover and reconnect. Operators can disable LAN discovery without disabling
manual connection. Implementations follow standard mDNS probing, update,
goodbye, and cache behavior.

## Trust and Selection

DNS-SD is untrusted discovery. It supplies a reachable candidate and protocol
hint but grants no pairing, membership, identity, authentication, or
authorization. Server identity is established only through the approved TLS
and pairing trust mechanism. TXT values are never used as certificate or key
fingerprints.

When several candidates are present, an unpaired client displays a chooser and
does not select by instance-name equality. A previously paired client may
reconnect automatically only after verifying the remembered authenticated
server identity. QR or short-code pairing and manual-address entry remain
fallback paths.

---

# Consequences

## Positive

- iOS, Android, and other LAN clients can discover the same logical service.
- Minimal records reduce passive disclosure on shared networks.
- Discovery collisions cannot silently redirect an authenticated client.
- Reconnection remains possible while joining is closed.

## Negative

- Networks that suppress multicast require QR, code, or manual fallback.
- The project must complete IANA service-name registration before production
  distribution.
- A custom instance name is visible to the local link and may disclose whatever
  the host enters.
- Cross-subnet and managed-network discovery require separate design.

---

# Alternatives Considered

## Advertise `_http._tcp`

Rejected because the control plane is not primarily generic human-readable web
content and needs service-specific discovery semantics.

## Put Session and Joining Details in TXT Metadata

Rejected because multicast metadata is observable and spoofable, changes more
frequently, and is unnecessary before an authenticated connection.

## Publish a Certificate Fingerprint in TXT Metadata

Rejected because an attacker able to spoof discovery can spoof that value as
well. Trust must come from pairing and authenticated TLS identity.

## Use a Stable Device Identifier in the Instance Name

Rejected because it creates a tracking identifier on every local network.
