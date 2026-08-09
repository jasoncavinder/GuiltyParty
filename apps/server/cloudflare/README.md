# Guilty Party Remote Service

This directory contains the test-gated Remote Friends MVP Cloudflare service
described by [ADR 0033](../../../docs/adr/0033-cloudflare-remote-services.md) and
[PLANS.md](../../../PLANS.md).

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
- `POST /api/v1/join` admits up to eight guest participants using the invitation
  proof. The packaged Stage does not receive or redeem that shared proof.
- `POST /api/v1/resume` lets a native participant recover the same participant
  and endpoint after restart. The device-only credential rotates on every
  successful use through a client-staged replacement. An exact retry of the
  same transition is idempotent, a different replacement for a consumed
  credential revokes its family, and the response carries a fresh short-lived
  bearer plus the current journal sequence.
- `POST /api/v1/stage-pairings` creates a 120-second packaged Stage transaction;
  an authenticated Host approves its non-secret display code, and the Stage
  redeems with a separate high-entropy memory-only polling secret.
- `POST /api/v1/websocket-tickets` lets only a current packaged Stage exchange
  its memory-only bearer for a registered, 30-second, single-use secondary
  WebSocket subprotocol credential.
- `GET /api/v1/session/context` revalidates a browser cookie and returns only
  the caller's opaque endpoint context for reload recovery.
- `GET /api/v1/session/endpoints` gives only the Host a credential-free
  operational roster for endpoint support and revocation.
- `/ws/v1` validates the exact control subprotocol, origin, signed authority,
  endpoint generation, expiry, and current Durable Object authority record.
- Credentialed browser API preflight and responses echo only an exact allowed
  HTTPS origin. Packaged Stage pairing and ticket responses narrowly echo the
  opaque `null` file-scheme Origin without credentialed cookies. Wildcard CORS
  is never used.
- After cheap origin, credential-shape, and body validation, Cloudflare Rate
  Limiting bindings reject excess authenticated Host creation traffic by Host
  class, join traffic by an opaque session-resource digest, and Stage pairing
  traffic by operation or transaction digest before Durable Object lookup; the
  exact per-session, pairing-transaction, and endpoint limits remain separate.
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
[tooling evaluation](../../../docs/architecture/cloudflare-tooling-evaluation.md)
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

The rehearsal creates synthetic state, exercises Host-approved Stage pairing,
and proves first-use `101`, replay `401`, and tamper `401` without printing the
bootstrap proof, polling secret, primary bearer, or connect ticket.

After the proposed development lifecycle surface in ADR 0038 is reviewed and
deployed, exercise its fixed short-lived synthetic sessions with:

```sh
GP_REMOTE_BASE_URL='https://api.test.guiltyparty.app' \
GP_HOST_BOOTSTRAP_PROOF='<read from the protected operator store>' \
make rehearse-remote-lifecycle
```

This longer rehearsal verifies invitation and ticket negative paths, an idle
hibernatable connection and projection after reactivation, fresh-ticket
reconnect, explicit end, alarm expiry, and active-session data deletion. It never accepts
caller-selected lifetimes and does not change ordinary session defaults.

Exercise the Stage transaction privacy and edge boundary separately:

```sh
GP_REMOTE_BASE_URL='https://api.test.guiltyparty.app' \
GP_HOST_BOOTSTRAP_PROOF='<read from the protected operator store>' \
make rehearse-stage-pairing-boundaries
```

Exercise the entire deterministic session with a browser Host, two browser
fallback participants, and a Host-approved packaged Stage:

```sh
GP_REMOTE_BASE_URL='https://api.test.guiltyparty.app' \
GP_HOST_BOOTSTRAP_PROOF='<read from the protected operator store>' \
make rehearse-remote-game
```

## Configuration Safety

`wrangler.jsonc` declares the approved synthetic development Worker
`guilty-party-remote-dev`. It enables its `workers.dev` endpoint and the
owner-approved `api.test.guiltyparty.app` Worker Custom Domain, disables preview
URLs, Wrangler usage metrics, dependency instrumentation, and persisted Worker
observability, and includes no account ID, resource ID, token, database, bucket,
or secret. It is not a staging or production configuration.

The Remote Friends MVP boundary expects:

- `ENVIRONMENT_PROFILE=friends-mvp-development`
- secret `AUTHORITY_SIGNING_KEY`, a random value of at least 32 bytes used for
  domain-separated HMAC signing of short-lived endpoint authority and keyed
  participant-resume credential digests; raw resume credentials are never
  stored in the Durable Object
- secret `HOST_BOOTSTRAP_TOKEN_SHA256`, the lowercase SHA-256 digest of the
  operator-controlled Host creation proof
- `ALLOWED_ORIGINS`, an exact comma-separated HTTPS allowlist for the browser
  Host and Companion fallback origins
- `CLIENT_BUILD_POLICY_JSON`, the committed minimum-build policy for the four
  approved external-test application identifiers
- `SESSION_CREATE_RATE_LIMITER`, ten authenticated Host attempts per minute per
  Cloudflare location, and `SESSION_JOIN_RATE_LIMITER`, sixty validated-shape
  attempts per opaque session-resource digest per minute per location; both
  fail closed and neither uses or stores a network address
- `STAGE_PAIRING_RATE_LIMITER`, 120 Stage pairing operations per minute per
  operation or opaque transaction digest per Cloudflare location; the pairing
  coordinator also enforces its exact per-transaction attempt ceiling
- optional secret `EMERGENCY_DISABLED=true`, which keeps health and protocol
  discovery available while returning `503` from every stateful entry point

The operator-authenticated `/api/v1/rehearsals/lifecycle/sessions` route is a
development verification surface, not a gameplay-client operation. It creates
only fixed 15-second invitation, 45-second active, and 30-second retention
windows. The ordinary creation route remains 15 minutes, four hours, and seven
days respectively.

The approved allowlist is committed as
`https://host.test.guiltyparty.app,https://play.test.guiltyparty.app`. The
packaged Stage has no web origin; its narrowly
accepted opaque `null` Origin is transport metadata under ADR 0035.

Secrets are configured with Wrangler and never placed in `wrangler.jsonc`, a
request URL, application envelope, log, or committed file. The raw Host proof
is supplied only when starting a session. Participant invitation proof and the
Stage polling secret are supplied only in HTTPS authorization headers. Browser
join responses omit the bearer token; native and packaged-Stage authority
responses contain it only in the non-cacheable HTTPS response.

## Remaining External-Test Gates

- reviewed Browser Host and Companion fallback Pages deployment and browser UI
  rehearsal
- physical packaged webOS Stage and two-iOS-Companion conformance, including
  restart recovery without a duplicate participant or action
- named-tester notice and explicit final owner approval

Until those pass, local runtime tests use synthetic aliases and the committed
original scenario only.
