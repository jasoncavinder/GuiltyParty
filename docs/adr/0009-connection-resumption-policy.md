# ADR 0009: Connection and Resumption Policy

## Status

Accepted

## Date

2026-08-06

---

# Context

Guilty Party expects temporary Wi-Fi loss, app suspension, server restart, and
movement between endpoints during a live session. Transport presence is not
canonical scenario truth, and reconnecting clients must not duplicate commands,
reuse stale primary authority, reveal cached private state, or claim a client
copy of state as authoritative.

The protocol therefore needs shared connection-health, retry, resumption,
sequence, and stale-endpoint rules across native and browser clients.

---

# Decision

## Connection Establishment

A client allows ten seconds to establish TCP, TLS, and WebSocket transport and
five additional seconds to complete authenticated protocol negotiation. Failure
enters the retry policy unless the error is classified as non-retryable.

## Heartbeat and Connection State

The server sends an application-level heartbeat every 15 seconds while the
connection is active. Any authenticated message counts as activity. Native
WebSocket control-frame pings may supplement this, but application heartbeat is
the cross-platform authority.

- After two missed heartbeats, or 30 seconds without authenticated activity,
  the client enters `connection-uncertain`, covers private content, and disables
  participant actions.
- After three missed heartbeats, or 45 seconds, the connection closes and the
  endpoint is marked disconnected.
- After five minutes disconnected, host tools label the endpoint stale.

Disconnected or stale status does not revoke the endpoint, remove the
participant, change character assignment, or transfer primary authority.
Presence remains ephemeral control-plane state.

## Retry and Backoff

An explicit network-interface change or app foreground transition permits one
immediate retry. Subsequent attempts use exponential backoff with full jitter
around 1, 2, 4, 8, 15, and 30 seconds, capped at 30 seconds. A longer
server-provided retry interval takes precedence. Backoff resets after 60 seconds
of stable connectivity.

Foreground retry continues while the session may remain active. Automatic
retry stops for certificate or server-identity mismatch, unsupported protocol,
revoked authority, participant removal, or ended session. It never downgrades
to plaintext.

## Mobile and Browser Lifecycle

The product does not promise continuous WebSocket connectivity while a mobile
app or browser page is backgrounded, suspended, frozen, or discarded. The
surface covers private content when authority can no longer be kept current and
reconnects on foreground or page restoration. No mobile background entitlement
is added solely to keep gameplay WebSockets alive.

## Resumption

An authenticated resume request contains:

- session, participant, and endpoint identifiers
- endpoint-bound resume authority
- the last applied server sequence
- the client's current primary-authority generation
- identifiers of commands whose results remain unknown

The server validates identity, authority, recipient scope, and sequence. It
never accepts client state as canonical truth. If an authorized projection
delta remains available, the server returns it from the last confirmed
sequence. Otherwise it sends a complete, fresh recipient-specific projection
and current sequence. Raw journal events are not used as a substitute for an
authorized projection.

The client applies the result atomically before revealing private content or
enabling actions. A sequence gap, impossible regression, or unexpected critical
message triggers controlled resynchronization. Server restart follows the same
flow after deterministic journal replay.

## Commands and Unknown Outcomes

Every state-changing command carries an idempotency identifier and current
primary-authority generation. A timeout leaves its outcome unknown. The client
resolves that identifier during resumption rather than creating a replacement
command automatically.

An identical retry returns the recorded result. Reuse of an identifier with
different content is rejected. A command from a stale primary-authority
generation is rejected. Client-side pending state never proves that a command
was accepted.

---

# Consequences

## Positive

- Temporary connectivity failures have consistent cross-platform behavior.
- Private content and actions fail closed when authorization freshness is
  uncertain.
- Idempotency and sequence resumption prevent duplicate actions and silent gaps.
- Server restart and ordinary reconnect use one deterministic recovery path.
- Offline presence cannot silently change canonical scenario state.

## Negative

- Covering private content after 30 seconds may interrupt a player during poor
  connectivity.
- Projection-delta retention and idempotency-result retention require bounded
  server storage policies.
- Mobile backgrounding normally appears as disconnection rather than persistent
  presence.
- Clients and servers require explicit resynchronization state machines and
  negative-path tests.

---

# Alternatives Considered

## Rely Only on TCP or WebSocket Control Pings

Rejected because application-level health and consistent browser behavior are
still required, and a live transport does not prove current authorization or
projection state.

## Retry Immediately Without Backoff

Rejected because a room of clients could create a synchronized reconnect storm
after server or network failure.

## Let Clients Replay Their Cached State

Rejected because clients are not canonical and may hold stale or no-longer
authorized private information.

## Revoke Endpoints Automatically When They Disconnect

Rejected because mobile suspension and temporary Wi-Fi loss are ordinary and
must not remove participants or force unnecessary recovery.

## Create a New Command After a Timeout

Rejected because the original command may already have committed, producing a
duplicate state transition.
