# Guilty Party Remote Service

This directory contains the development-only Cloudflare remote-service slice
described by [ADR 0033](../../docs/adr/0033-cloudflare-remote-services.md).

It is not ready for real players, private or licensed scenario content,
production identity, or external testing. The public surface fails closed until
the shared Rust scenario engine, account authority, data lifecycle, provider
intakes, and deployment gates are complete.

## Current Surface

- `GET /health` returns non-private service status.
- `GET /api/protocol` returns protocol v1 compatibility and labels the remote
  implementation as a development skeleton.
- `POST /api/v1/join` returns a safe `501` Problem Details response because the
  local prototype's synthetic join authority must not become production auth.
- `/ws/v1` validates the WebSocket upgrade and exact control subprotocol, then
  requires an explicitly configured synthetic-development credential before it
  can route to a session Durable Object.
- `GameSession` initializes SQLite journal and idempotency tables and uses the
  Durable Object WebSocket hibernation API. Until the shared engine is wired,
  application messages receive a safe `remote_engine_unavailable` error and do
  not mutate state.

## Dependency Boundary

Runtime source is first-party ECMAScript and uses only Cloudflare Worker
platform APIs. Tests use Node's built-in test runner and the repository's
already-approved Ajv development tool. No Cloudflare package, Wrangler version,
or WebAssembly build dependency is approved or added by this slice.

After owner approval of the exact tool intake, install the pinned tooling with
scripts disabled and run Wrangler locally. Do not use an unpinned `npx` command
as a release or CI path.

## Local Verification

From the repository root:

```sh
npm run test:remote
```

The test suite does not contact Cloudflare or require an account.

## Configuration Safety

`wrangler.jsonc` declares the approved synthetic development Worker
`guilty-party-remote-dev`. It enables only its `workers.dev` endpoint, disables
preview URLs, Wrangler usage metrics, dependency instrumentation, and persisted
Worker observability, and includes no account ID, resource ID, token, database,
bucket, custom domain, or secret. It is not a staging or production
configuration.

The temporary development WebSocket boundary expects:

- `ENVIRONMENT_PROFILE=development-skeleton`
- secret `DEVELOPMENT_ACCESS_TOKEN_SHA256`, containing a lowercase SHA-256 hex
  digest of a synthetic token
- `ALLOWED_ORIGINS`, an exact comma-separated allowlist for browser clients;
  native clients may omit `Origin`
- `Authorization: Bearer <synthetic token>`
- `X-GP-Session-ID`, `X-GP-Endpoint-ID`, and
  `X-GP-Projection-Audience` (`host`, `stage`, or `participant`)

This boundary exists only to support synthetic integration tests. It must be
removed when production identity and pairing replace it.
