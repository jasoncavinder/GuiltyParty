# Remote Friends MVP Service Contract

## Status

The local Cloudflare runtime completes the deterministic Host, Stage, and
participant service loop. The code is not deployed for named-friend use and the
remaining gates in [PLANS.md](../../PLANS.md) still apply.

## Service Topology

- Worker gateway: `/health`, `/api/protocol`, `/api/v1/sessions`,
  `/api/v1/join`, and `/ws/v1`
- one SQLite Durable Object per opaque session identifier
- one embedded, original scenario version
- first-party Rust `gp_scenario` engine compiled to WebAssembly
- no D1, R2, Queue, Container, Realtime, account, payment, analytics, media, or
  remote AI service

## Host Bootstrap

The browser Host sends `POST /api/v1/sessions` from an exact allowed HTTPS
origin. It supplies the operator bootstrap proof as `Authorization: Bearer`
and this body:

```json
{
  "protocol_version": "1.0",
  "endpoint": {
    "platform": "browser",
    "capabilities": ["host_control", "private_display"]
  }
}
```

A successful `201` response sets `__Host-gp_authority` with `Secure`,
`HttpOnly`, `SameSite=Strict`, and `Path=/`. The response contains the opaque
session identifier, Host endpoint and room identifiers, fifteen-minute pairing
proof, four-hour session expiry, and participant limit. The Host keeps the
pairing proof only in memory while displaying or transferring it; it never
places it in a URL or browser storage.

Browser HTTP calls use `credentials: "include"`. The gateway answers only
exact-origin credentialed CORS preflights and never emits a wildcard origin.
Because `SameSite=Strict` is intentional, the Host, Stage, and API test
hostnames must be same-site subdomains of `guiltyparty.app`; a Host served from
an unrelated site cannot rely on this cookie flow.

## Stage and Participant Pairing

The client sends `POST /api/v1/join` with:

- `X-GP-Session-ID: <opaque session identifier>`
- `Authorization: Pairing <short-lived pairing proof>`
- an exact allowed `Origin` for browser Stage; no `Origin` for native iOS
- the canonical `JoinRequest` body

Browser Stage authority is delivered only through the HttpOnly cookie and the
JSON response omits `token`. Native iOS receives `authority_transport: bearer`
and the opaque token in the non-cacheable response. The iOS app keeps the
access token in process memory and may store only separately approved opaque
resume authority in its protected device boundary.

Guest aliases, endpoints, participants, rooms, and characters are separate.
The session admits at most one Stage and eight participants. Participant
admission creates deterministic `participant_joined` and
`endpoint_registered` journal events; Stage connection metadata is operational
and does not become scenario truth.

## Realtime Control

Clients open `/ws/v1` and offer only `guiltyparty.control.v1`. Browsers send the
cookie automatically from their exact bound origin. iOS supplies the bearer
credential in the opening request. Credentials never appear in the WebSocket
URL or application envelope.

The service supports canonical v1 `get_projection`, `submit_command`, and the
following deterministic commands:

- Host: `assign_character`, `advance_scene`, `reveal_clue`, `open_voting`, and
  `close_voting`
- participant: `cast_vote`
- Stage: no mutation commands

Every command includes a unique message identifier, endpoint-scoped
`idempotency_id`, and current `primary_authority_generation`. Identical retries
return the stored result and sequence; conflicting reuse fails. After an
accepted command, the Durable Object broadcasts a freshly built authorized
projection to every current endpoint.

The Stage receives only public clues and no private objectives or individual
vote state. A participant receives its own objective, vote state, and
character-authorized private clues, never another participant's private fields.
The Host receives the scenario-management projection.

## Host Session Controls

The bound Host cookie and exact Host origin authorize these noncanonical
control operations:

- `PUT /api/v1/session/invitation` rotates and reopens pairing, returning a new
  fifteen-minute proof; the former proof immediately fails
- `DELETE /api/v1/session/invitation` closes pairing
- `POST /api/v1/session/endpoints/{endpoint_id}/revoke` increments and revokes a
  non-Host endpoint's authority and closes its current sockets
- `POST /api/v1/session/end` closes pairing, revokes every endpoint, closes
  sockets, and schedules active-storage deletion within seven days of that
  earlier end

Pairing attempts are limited per session and messages are limited per endpoint
in a short operational window. These counters contain no address, credential,
alias, or scenario content and do not become canonical journal entries.

## Current Recovery Behavior

SQLite stores the canonical, continuously sequenced journal and bounded
idempotency results. A projection request always replays the journal through
the shared engine. WebSocket attachments retain only routing and authority
metadata needed after hibernation; they contain no credential or scenario
secret.

Clients may reconnect and request a full current projection. Delta replay from
an acknowledged sequence is not yet implemented. Session expiry revokes stored
endpoint authority and closes sockets. A second alarm removes active session
data no later than seven days after the four-hour active window. Cloudflare
separately documents SQLite point-in-time recovery over the prior 30 days. The
service cannot claim unrecoverability at day seven; that provider recovery
horizon requires owner acceptance and tester notice before external use.

## Local Verification

Install Rust's approved `wasm32-unknown-unknown` target, then run:

```sh
make test
make check-cloudflare
```

The native/WebAssembly check builds the same original scenario and journal in
both runtimes, compares their Stage projection, and asserts that private clue,
objective, and individual-vote fields are absent. The Worker dry run bundles
the resulting first-party module.

## App Integration Blockers

Before physical-client rehearsal, finish and document:

- Host UI integration for invitation rotation, pairing close, endpoint
  revocation, and explicit session end
- edge protection for invalid Host creation
- stable test hostname and exact Host/Stage origins
- iOS bearer injection, memory clearing, reconnect, and conformance fixtures
- webOS cookie pairing and private-field-negative tests

No named friend should receive an invitation until the final owner gate is
recorded.
