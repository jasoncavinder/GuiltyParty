# Guilty Party Remote Service

This directory contains the test-gated Remote Friends MVP Cloudflare service
described by [ADR 0033](../../docs/adr/0033-cloudflare-remote-services.md) and
[PLANS.md](../../PLANS.md).

It is not yet ready for named friends, private or licensed scenario content,
production identity, or public traffic. The pairing, authority, deterministic
gameplay, journal, and recipient-projection loop is implemented; external use
remains blocked by the operational and client acceptance gates below.

## Current Surface

- `GET /health` returns non-private service status.
- `GET /api/protocol` returns protocol v1 compatibility and Remote Friends MVP
  feature identifiers.
- `POST /api/v1/sessions` requires an operator bootstrap proof, creates a
  four-hour session, sets browser Host authority in a Secure, HttpOnly,
  SameSite=Strict cookie, and returns a fifteen-minute pairing invitation.
- `POST /api/v1/join` admits one Stage and up to eight guest participants using
  the pairing proof. Browser authority uses the cookie; iOS and the packaged
  webOS Stage use returned bearer authority.
- `POST /api/v1/websocket-tickets` lets only a current packaged Stage exchange
  its memory-only bearer for a registered, 30-second, single-use secondary
  WebSocket subprotocol credential.
- `/ws/v1` validates the exact control subprotocol, origin, signed authority,
  endpoint generation, expiry, and current Durable Object authority record.
- Credentialed browser API preflight and responses echo only an exact allowed
  HTTPS origin. Packaged Stage pairing and ticket responses narrowly echo the
  opaque `null` file-scheme Origin without credentialed cookies. Wildcard CORS
  is never used.
- Cloudflare Rate Limiting bindings reject excess session creation and join
  traffic before Durable Object lookup; the exact per-session and per-endpoint
  limits remain separate.
- `GameSession` journals participant admission and every accepted gameplay
  transition, schedules expiry and seven-day maximum active-storage deletion
  through an alarm, and uses the Durable Object WebSocket hibernation API.
- The first-party Rust WebAssembly engine replays and validates every proposed
  transition and builds Host, Stage, and participant projections. JavaScript
  maps authorized protocol commands to proposed events but does not implement
  scenario rules.
- The implemented loop covers character assignment, scene advancement, public
  and private clues, voting, deterministic outcome, bounded idempotency, full
  projection refresh, and broadcast updates.

## Dependency Boundary

Runtime source is first-party ECMAScript and uses only Cloudflare Worker
platform APIs. Tests use Node's built-in test runner and the repository's
already-approved Ajv development tool. The owner-approved temporary tooling
exception pins `wrangler@4.119.0` with an exact `undici@7.29.0` override for
internal development, the first synthetic deployment, and credential-free CI
validation. It is excluded from the Worker bundle and is not approved for
production deployment authority or product redistribution. The owner approved
installation of Rust's official `wasm32-unknown-unknown` standard-library
target; the adapter adds no third-party crate and the Worker bundles only the
project-built first-party module.

Install the locked tooling with scripts disabled through `make setup`. Do not
use an unpinned `npx` command as a development, release, or CI path. See the
[tooling evaluation](../../docs/architecture/cloudflare-tooling-evaluation.md)
for the exact exception and review triggers.

## Local Verification

From the repository root:

```sh
make test-remote
make check-scenario-wasm
make check-cloudflare
```

The test suite does not contact Cloudflare or require an account.

After starting the local Worker or deploying a reviewed version, exercise the
packaged Stage handshake with the bootstrap proof supplied only through the
process environment:

```sh
GP_REMOTE_BASE_URL='https://api.test.guiltyparty.app' \
GP_HOST_BOOTSTRAP_PROOF='<read from the protected operator store>' \
make rehearse-packaged-stage
```

The rehearsal creates synthetic state and proves first-use `101`, replay
`401`, and tamper `401` without printing the bootstrap proof, pairing proof,
primary bearer, or connect ticket.

## Configuration Safety

`wrangler.jsonc` declares the approved synthetic development Worker
`guilty-party-remote-dev`. It enables its `workers.dev` endpoint and the
owner-approved `api.test.guiltyparty.app` Worker Custom Domain, disables preview
URLs, Wrangler usage metrics, dependency instrumentation, and persisted Worker
observability, and includes no account ID, resource ID, token, database, bucket,
or secret. It is not a staging or production configuration.

The Remote Friends MVP boundary expects:

- `ENVIRONMENT_PROFILE=friends-mvp-development`
- secret `AUTHORITY_SIGNING_KEY`, a random value of at least 32 bytes used only
  for HMAC signing of short-lived endpoint authority
- secret `HOST_BOOTSTRAP_TOKEN_SHA256`, the lowercase SHA-256 digest of the
  operator-controlled Host creation proof
- `ALLOWED_ORIGINS`, an exact comma-separated HTTPS allowlist for the browser
  Host and Stage origins
- `SESSION_CREATE_RATE_LIMITER`, ten attempts per minute per Cloudflare
  location, and `SESSION_JOIN_RATE_LIMITER`, sixty attempts per minute per
  location; both fail closed and neither uses or stores a network address
- optional secret `EMERGENCY_DISABLED=true`, which keeps health and protocol
  discovery available while returning `503` from every stateful entry point

The approved allowlist is committed as
`https://host.test.guiltyparty.app,https://stage.test.guiltyparty.app`. The
packaged Stage does not authenticate as the Stage web origin; its narrowly
accepted opaque `null` Origin is transport metadata under ADR 0035.

Secrets are configured with Wrangler and never placed in `wrangler.jsonc`, a
request URL, application envelope, log, or committed file. The raw Host proof
is supplied only when starting a session. Pairing proof is supplied only to the
HTTPS join operation. Browser join responses omit the bearer token; native join
responses contain it only in the non-cacheable HTTPS response.

## Remaining External-Test Gates

- reconnect acceptance across real Durable Object hibernation
- automated alarm expiry and deletion evidence
- physical Host, webOS Stage, and two-iOS-Companion conformance
- the approved `api.test.guiltyparty.app` deployment, packaged Stage Origin and
  subprotocol evidence, named-tester notice, and explicit final owner approval

Until those pass, local runtime tests use synthetic aliases and the committed
original scenario only.
