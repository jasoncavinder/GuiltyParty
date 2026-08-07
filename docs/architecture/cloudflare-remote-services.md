# Cloudflare Remote Services

## Status

The target architecture is accepted in
[ADR 0033](../adr/0033-cloudflare-remote-services.md). The repository service
slice remains **development-only** until its production gates are complete.

## Runtime Map

```text
iOS Companion       Browser Host       webOS Stage
       \                 |                 /
        \------ HTTPS / WSS gateway ------/
                       |
                Cloudflare Worker
                 /      |       \
                /       |        \ short-lived media grants
       account/catalog  |         Cloudflare Realtime
              D1        |
                        v
            one Durable Object per session
             - canonical command order
             - SQLite journal + replay
             - idempotency + authority
             - recipient projections
             - hibernating WebSockets
                        |
              pinned scenario version
                        |
                       R2
```

Queues consume retry-safe, noncanonical work. Containers are reserved for a
future heavy adapter and are not on the live-game authority path.

## Repository Boundary

The remote service lives under `services/remote/`. It is deliberately separate
from the native Axum server under `server/`:

- `src/worker.js` is the Cloudflare transport and binding adapter.
- `src/game-session.js` is the per-session Durable Object adapter.
- `src/session-core.js` contains provider-neutral command/journal rules that can
  run under Node's built-in test runner.
- `wrangler.jsonc` declares local-development bindings but contains no account
  identifier, token, production route, domain, database ID, bucket ID, or
  secret.
- `test/` proves the first-party logic without connecting to Cloudflare.

The native and remote implementations share the canonical files in
`contracts/`. Neither service may invent a second transport schema. The Rust
`gp_scenario` crate remains the canonical scenario engine and will be exposed
through a separately reviewed WebAssembly adapter.

## First Development Slice

The first slice intentionally proves only infrastructure-neutral behavior:

- safe `/health` and `/api/protocol` responses
- strict WebSocket subprotocol negotiation at `/ws/v1`
- opaque session routing to one Durable Object
- an append-only, continuously sequenced session journal in Durable Object
  SQLite
- bounded command idempotency
- WebSocket hibernation attachments containing only routing metadata
- replay validation before accepting mutation
- no account system, licensed scenario, private player content, remote media,
  analytics, AI provider, or production deployment

Any route that could appear production-capable must fail closed while the
environment profile is `development-skeleton`.

## Data Ownership

| Data | Canonical owner | Notes |
| --- | --- | --- |
| Account bindings and host eligibility | D1 identity/catalog module | Not readable by a session without an authenticated minimum projection. |
| Event and pinned scenario-version references | D1 catalog module | A live session copies only the immutable reference it needs. |
| Immutable scenario bundle | R2 | Addressed by approved immutable version and verified before play. |
| Live session journal and sequence | Session Durable Object SQLite | Only canonical writer for the session. |
| Current scenario state | Rebuilt by `gp_scenario` from the journal | Cacheable, never an independent truth source. |
| WebSocket connection state | Session Durable Object runtime | Reconstructable; hibernation attachment excludes secrets. |
| Media packets | Selected media-plane provider | Never enter the control journal by default. |
| Retryable side effects | Queue consumer | Must not create scenario truth. |

## Environment Isolation

Use three Cloudflare environments with distinct names and resources:

| Environment | Content and identities | External access | Purpose |
| --- | --- | --- | --- |
| Development | Synthetic only | Developer allowlist | Local and remote integration checks. |
| Staging | Synthetic, rights-cleared | Named tester allowlist | Deployment, restore, media-isolation, and client conformance evidence. |
| Production | Approved minimum | Public clients through production identity and abuse controls | Supported events only after explicit release approval. |

Do not copy a production D1 database, Durable Object namespace, R2 bucket,
secret, token, or media credential into development or staging. Promotion
deploys versioned artifacts and migrations; it does not reuse mutable test
resources.

## Command Path

1. The gateway authenticates the transport and rejects unsafe origin, profile,
   protocol, size, and rate-limit conditions.
2. It derives the opaque session routing key from authenticated server context,
   never from an unchecked authority claim inside the command.
3. The session object authenticates the forwarded principal context again,
   checks the endpoint and current authority generation, and validates the
   canonical envelope.
4. It resolves the command's idempotency identifier. An identical prior command
   returns the prior result; a conflicting reuse is rejected.
5. The shared deterministic engine validates the transition against the pinned
   scenario version.
6. The object commits the journal entry and idempotency result in one storage
   transaction before broadcasting a projection.
7. Each recipient receives a freshly authorized projection carrying the latest
   journal-derived `server_sequence`.

If storage commit, replay, engine validation, or authorization is uncertain,
the object does not broadcast acceptance.

## WebSocket Hibernation Rules

- Use the Durable Object hibernation API rather than keeping the object billed
  merely to retain idle sockets.
- Store only endpoint ID, projection class, protocol version, and a non-secret
  connection correlation value in serialized socket attachments.
- Never serialize tokens, character secrets, private content, or media grants
  into attachments.
- Reauthenticate authority after activation and before accepting a mutation.
- Heartbeats, transport reconnects, and duplicate deliveries do not enter the
  scenario journal.
- Resume from the last authorized journal sequence; do not replay another
  recipient's projection.

## Browser Connection Bootstrap

The standard browser WebSocket API cannot attach an `Authorization` header or
arbitrary endpoint-context headers to its opening handshake. An origin
allowlist prevents cross-origin use but does not authenticate a browser Host or
Stage.

Before browser integration, an approved HTTPS pairing flow must exchange the
one-time pairing proof for short-lived, server-derived authority carried by a
WebSocket-compatible mechanism. The server—not the browser—binds that authority
to the session, endpoint, audience, authority generation, expiry, and exact
origin. Credentials remain out of URLs, browser storage, logs, and application
envelopes. The shared synthetic development token is restricted to native and
command-line smoke tests and is removed when this bootstrap exists.

## Failure and Recovery Rules

On activation, the session verifies schema creation/migration, loads the pinned
scenario reference, and replays every canonical journal entry in order. Gaps,
unsupported event versions, scenario mismatch, invalid transitions, or a
projection privacy failure put the object in a read-only fault state. A safe
operational correlation value may be exposed, but journal content and identity
details are not.

Deployment must support rollback to a version that understands every already
written event. A schema or event writer is not deployed until forward and
backward compatibility, export, restore, and deterministic replay have been
tested against a staging copy.

## Owner-Gated Cloud Setup

The repository can be built and tested before any Cloudflare resource exists.
When the owner is ready, deployment proceeds in this order:

1. secure the Cloudflare account, billing profile, and recovery path
2. approve the exact deployment and WebAssembly tool dependencies under ADR
   0025
3. authenticate Wrangler through browser OAuth for a human development deploy
4. create development-only Worker, Durable Object, D1, and R2 resources from
   reviewed configuration
5. apply migrations and run synthetic smoke, replay, privacy, idempotency, and
   reconnect tests
6. create a least-privilege, environment-specific CI token only after CI design
   is approved
7. repeat with isolated staging resources; do not create production resources
   until the production identity, lifecycle, media, and operational gates pass

Account IDs, resource IDs, tokens, client secrets, signing material, and
provider credentials belong in Cloudflare bindings or the approved secret
store, never in committed files.

## Exit Evidence

The remote service must be able to export:

- immutable scenario bundle bytes plus their version and integrity metadata
- global relational records in a documented versioned form
- each session's canonical journal with scenario and event version metadata
- the minimum identity mapping needed to honor access and deletion requests

The native replay suite validates exported journals without Cloudflare APIs.
This keeps the scenario engine, contracts, and story truth portable even though
the gateway and live coordinator use Cloudflare-specific adapters.
