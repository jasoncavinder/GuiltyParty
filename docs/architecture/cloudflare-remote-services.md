# Cloudflare Remote Services

## Status

The target architecture is accepted in
[ADR 0033](../adr/0033-cloudflare-remote-services.md). The repository service
slice is now the **test-gated Remote Friends MVP**. Pairing and short-lived
guest authority are implemented, but named-friend traffic remains blocked
until the shared engine and the explicit acceptance gates in `PLANS.md` pass.

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
- `wrangler.jsonc` declares local-development bindings and the owner-approved
  `api.test.guiltyparty.app` test Custom Domain, but contains no account
  identifier, token, production route, database ID, bucket ID, or secret.
- `test/` proves the first-party logic without connecting to Cloudflare.

The native and remote implementations share the canonical files in
`contracts/`. Neither service may invent a second transport schema. The Rust
`gp_scenario` crate remains the canonical scenario engine. Its first-party
`gp_scenario_wasm` adapter exposes a versioned raw WebAssembly ABI without
adding a bindgen or Cloudflare Rust dependency. CI compares native and
WebAssembly output before bundling the module into the Worker.

## Implemented Remote Friends Slice

The current slice proves:

- safe `/health` and `/api/protocol` responses
- strict WebSocket subprotocol negotiation at `/ws/v1`
- opaque session routing to one Durable Object
- an append-only, continuously sequenced session journal in Durable Object
  SQLite
- bounded command idempotency
- WebSocket hibernation attachments containing only routing metadata
- replay validation before accepting mutation
- operator-gated Host session creation and short-lived pairing
- Secure, HttpOnly browser authority and native bearer authority
- packaged webOS Stage memory-only bearer authority with registered,
  30-second, single-use realtime connect tickets
- Cloudflare-native pre-Durable-Object admission budgets of ten session-create
  attempts and sixty join attempts per minute per Cloudflare location, backed
  by the existing exact per-session join limit
- current endpoint-generation and origin checks before every message
- shared Rust/WebAssembly replay and recipient projections
- character assignment, scenes, clues, votes, deterministic outcome, and
  private-projection filtering
- four-hour session expiry and seven-day maximum active-storage deletion
  scheduling; the owner accepted Cloudflare's separate 30-day SQLite recovery
  history for this limited friends MVP on 2026-08-07, subject to tester notice
- no account system, licensed scenario, private player content, remote media,
  analytics, AI provider, or production deployment

The remaining friend-test gate includes real hibernation/deletion evidence, app
conformance, physical packaged-Stage transport evidence, tester notice, and deployment at the
owner-approved `api.test.guiltyparty.app` hostname. Any uncertainty in
authority, storage, replay, or projection continues to fail closed.

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

## Browser and Packaged Stage Connection Bootstrap

The standard browser WebSocket API cannot attach an `Authorization` header or
arbitrary endpoint-context headers to its opening handshake. An origin
allowlist prevents cross-origin use but does not authenticate a browser Host or
Stage.

The Remote Friends MVP HTTPS pairing flow exchanges the bounded pairing proof
for signed, short-lived authority. Browser Host and hosted-browser Stage
authority is carried in a Secure, HttpOnly, SameSite=Strict cookie; the iOS
Companion uses a bearer credential. A fully packaged webOS Stage cannot use
cookies and cannot attach an Authorization header to a standard WebSocket. It
therefore keeps primary bearer authority in memory and exchanges it over HTTPS
for a 30-second, single-use ticket offered as a secondary WebSocket
subprotocol. The Durable Object stores only its digest and atomically consumes
it with current endpoint-authority validation before accepting the socket.

The server binds authority to the session, endpoint, audience, participant
where applicable, authority generation, expiry, and exact browser origin where
one exists. The packaged app's `null` Origin is permitted only on its Stage
pairing and ticket paths and is never treated as authority. The session Durable
Object verifies current stored authority again before accepting the WebSocket
and every message. Credentials remain out of URLs, logs, application
envelopes, Durable Object names, and browser-readable persistent storage. See
[ADR 0035](../adr/0035-packaged-stage-realtime-authority.md).

## Admission Abuse Boundary

After cheap origin, credential-shape, and request-body validation, the Worker
invokes separate Cloudflare Rate Limiting bindings before session creation or
join can allocate or address a Durable Object. The development budgets are ten
authenticated Host session-create attempts per 60 seconds using a Host-class
key and sixty join attempts per 60 seconds using the SHA-256 digest of the
opaque session identifier as the resource key. Neither key contains a network
address or participant identifier. Cloudflare's binding is permissive,
eventually consistent, and local to each serving location, so it is coarse cost
protection rather than authorization or exact accounting. The session Durable
Object independently retains its exact bounded join-attempt counter, and all
pairing and Host bootstrap checks remain
mandatory. A missing or failed edge binding closes admission with `503`.

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
