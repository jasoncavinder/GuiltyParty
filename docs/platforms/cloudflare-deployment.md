# Cloudflare Deployment Runbook

## Status

The original development skeleton is deployed. Promotion of the Remote Friends
MVP code in the current implementation branch has not yet occurred. That next
development deployment remains limited to the synthetic
`guilty-party-remote-dev` Worker, its SQLite Durable Object class, the
`workers.dev` endpoint, the owner-approved `api.test.guiltyparty.app` Custom
Domain, exact browser origins, and the minimum test authority secrets described
below. No named-friend traffic, D1 database, R2 bucket, Queue, media resource,
production resource, or CI credential is approved.

The architecture is accepted in
[ADR 0033](../adr/0033-cloudflare-remote-services.md). The owner approved the
temporary development-only Wrangler exception and recommended development
settings on 2026-08-06. Staging and production remain blocked by the gates
below. See the
[third-party component inventory](../legal/third-party-components.md#remote-deployment-tool--temporary-development-exception).

## Initial Skeleton Website Checklist (Historical)

This checklist records the pre-skeleton state. Later sections govern promotion
of PR #17 and the now-approved API Custom Domain.

- [ ] Use the intended long-term owner email and verify it.
- [ ] Enable phishing-resistant two-factor authentication where available.
- [ ] Store recovery codes outside the development machine.
- [ ] Confirm the account name and ownership are appropriate for Guilty Party.
- [x] Add the intended billing method and select the approved Workers plan.
- [x] Create a conservative account-level budget alert. Cloudflare currently
      exposes the selected alert as a total-spend threshold rather than separate
      actual and forecast thresholds; the development account threshold is
      USD 10.
- [x] Reserve the intended `workers.dev` subdomain for development.
- [ ] Review the current Self-Serve Subscription Agreement, Developer Platform
      terms, Data Processing Addendum, Security Exhibit, and subprocessor list
      with qualified advice where needed.
- [ ] Decide which human administrators require access. Do not create shared
      human logins.
- [ ] Leave the Worker, Durable Object namespace, D1 databases, R2 buckets,
      Queues, Realtime applications, custom domains, DNS routes, API tokens, and
      production resources uncreated for now.

Do not paste recovery codes, account identifiers, payment information, API
tokens, OAuth tokens, or other secrets into a task, issue, commit, screenshot,
or repository file.

## Decisions Required Before the First Development Deploy

The owner must explicitly approve and record:

- a patched, exact Wrangler dependency graph and its install scripts, native
  binaries, licenses, telemetry configuration, and locked integrity evidence
- Cloudflare provider terms and the development-only data categories permitted
  to reach the service
- the development resource names and the maximum monthly budget/alerts
- whether development Durable Objects and D1 use default placement or an
  approved jurisdiction; this choice must precede resource creation because
  some location constraints cannot be added afterward
- the named human administrators and browser-OAuth development workflow
- whether a `workers.dev` development endpoint is temporarily enabled and
  which access control protects it

The initial skeleton used only synthetic identities and original synthetic
scenario content. A custom domain was unnecessary for that phase. The owner
subsequently approved `api.test.guiltyparty.app` for the Remote Friends MVP on
2026-08-07; the promotion procedure below governs its creation.

## Repository Preflight

Before any Cloudflare authentication or resource mutation:

1. Confirm the branch is not `main` or `dev` and is current with `origin/dev`.
2. Run `make test` from a clean dependency install.
3. Confirm `services/remote/wrangler.jsonc` has the exact
   `guilty-party-remote-dev` name, `workers_dev: true`, `preview_urls: false`,
   `send_metrics: false`, dependency instrumentation disabled, persisted
   observability disabled, and only the
   `api.test.guiltyparty.app` Custom Domain route.
4. Scan the repository and generated artifact for credentials, account IDs,
   resource IDs, private data, production endpoints, and licensed content.
5. Verify the exact approved Wrangler version and lockfile integrity, then run
   its local configuration validation and deployment dry run.
6. Inspect the generated Worker bundle and dependency report. The development
   tool graph must not be bundled into the runtime.

Do not use an unpinned `npx wrangler`, automatic project initializer, automatic
resource provisioning, framework template, or dashboard-created source copy.
The reviewed repository configuration is the source of truth.

## Development Resource Order

After the gates are approved, use the pinned local tool and browser OAuth for
the human operator:

1. verify the authenticated account and profile without printing credentials
2. perform an artifact-only dry run and review its output
3. verify the reviewed `api.test.guiltyparty.app` Custom Domain configuration
4. deploy the Worker and declarative SQLite Durable Object export
5. set a synthetic development access-token digest through the secret command,
   reading the secret interactively from standard input
6. run safe `/health`, `/api/protocol`, join rejection, unauthorized WebSocket,
   exact-subprotocol, hibernation, replay, and storage-failure smoke tests
7. inspect resource creation, access, metrics, logs, and billing in the dashboard
8. roll back and redeploy once before relying on the environment

Do not create D1, R2, Queue, Realtime, or production resources in this first
slice; the current code has no bindings for them. Each is added only with its
schema, access boundary, lifecycle, provider intake, test evidence, and rollback
plan.

## Development Deployment Evidence

The first synthetic deployment was completed on 2026-08-06 HST
(2026-08-07 UTC) from source commit `ddebbea`.

- Worker: `guilty-party-remote-dev`
- Development endpoint:
  `https://guilty-party-remote-dev.guilty-party.workers.dev`
- Stateful resource: the `GameSession` SQLite Durable Object export using
  Cloudflare's default placement
- Authentication: the named human operator used browser OAuth scoped to the
  Guilty Party account; Wrangler credentials are stored in the macOS Keychain
- Development access control: only the SHA-256 digest is stored in the Worker
  secret `DEVELOPMENT_ACCESS_TOKEN_SHA256`; the synthetic plaintext token is
  stored in the macOS Keychain under service
  `Guilty Party Cloudflare Development Access Token` and account
  `guilty-party-development`
- Browser origin policy: `ALLOWED_ORIGINS` is intentionally unset, so requests
  carrying an `Origin` header fail closed until the Host and Stage development
  origins are approved; native and command-line smoke tests without an Origin
  remain available. Origin approval alone will not enable browser WebSockets:
  the browser API cannot supply the temporary authorization and endpoint
  headers, so an approved browser-compatible pairing bootstrap is required
  before Host or Stage integration
- Billing guardrail: an enabled account-wide Billing Budget Alert emails the
  owner when total Cloudflare spend approaches USD 10; this dashboard alert
  type does not provide a separate forecast threshold

The deployed service passed the following live smoke checks before and after
the rollback rehearsal:

| Check | Expected and observed result |
| --- | --- |
| `GET /health` | `200` |
| `GET /api/protocol` | `200` |
| `POST /api/v1/join` | `501` fail-closed placeholder |
| WebSocket without credentials | `401` |
| WebSocket with an unapproved Origin | `403` |
| Authorized WebSocket upgrade without an Origin | `101`, reaching the Durable Object |

Rollback to the initial development version and redeployment of commit
`ddebbea` both succeeded. The Worker secret remained available across the
rollback. Cloudflare-side version identifiers remain in the provider activity
record and are intentionally not copied into the public repository.

No D1 database, R2 bucket, Queue, Realtime or media resource, custom domain,
DNS route, production resource, or CI credential was created. No production
identity, private participant information, or licensed scenario content was
sent to Cloudflare.

## Remote Friends MVP Development Promotion (Not Yet Run)

The local runtime now passes Host creation, browser cookie pairing, native
bearer pairing, two-participant deterministic gameplay, private clue filtering,
voting, outcome, identical idempotent retry, forbidden participant command,
native/WebAssembly parity, and Worker bundle checks. This evidence does not
authorize deployment or named-friend traffic by itself.

Before the owner-operated development promotion:

1. Merge the implementation PR into `dev` after review and deploy the reviewed
   commit, not an uncommitted worktree.
2. Deploy the API Custom Domain at `api.test.guiltyparty.app`. Cloudflare
   creates the DNS record and exact-hostname certificate for a Worker Custom
   Domain; verify both are active before smoke testing. The owner approved
   `https://host.test.guiltyparty.app` and
   `https://stage.test.guiltyparty.app`, and the exact comma-separated
   `ALLOWED_ORIGINS` value is committed in the reviewed configuration; do not
   use wildcards. The fully packaged webOS Stage does not use that hosted Stage
   cookie origin. Under ADR 0035, only its Stage pairing and realtime-ticket
   paths accept the opaque file-scheme Origin value `null` with bearer
   authority.
3. Generate an independent random `AUTHORITY_SIGNING_KEY` of at least 32 bytes.
   Store the raw value only in the Worker secret and the owner's protected
   credential store.
4. Generate a distinct strong Host bootstrap proof. Store only its lowercase
   SHA-256 digest as `HOST_BOOTSTRAP_TOKEN_SHA256` in the Worker secret and keep
   the raw proof only in the owner's protected credential store.
5. Install the approved official Rust `wasm32-unknown-unknown` target and run
   `make test`, `make check-scenario-wasm`, and `make check-cloudflare`.
6. Use pinned local Wrangler and interactive standard input to set the two
   secret values. Never place a raw value on a command line, in shell history,
   an issue, task, screenshot, or committed file. Confirm the declarative
   `SESSION_CREATE_RATE_LIMITER` and `SESSION_JOIN_RATE_LIMITER` bindings are
   present in the artifact before deploying.
7. Deploy manually and verify `/health` reports
   `friends-mvp-development` with status `test-gated`.
8. Rehearse Host creation, invalid bootstrap, invalid/expired pairing, one
   packaged Stage, two native participants, exact-origin rejection, opaque
   packaged-Origin rejection, one-time Stage ticket replay rejection, the full
   game loop, private projections, idempotent retry, forbidden command,
   reconnect, admission throttling, and rollback using synthetic aliases only.
   Run `make rehearse-packaged-stage` with `GP_REMOTE_BASE_URL` and
   `GP_HOST_BOOTSTRAP_PROOF` supplied through the protected operator process
   environment as the repeatable ticket-use/replay/tamper check.
9. After the replacement is proven, remove the obsolete
   `DEVELOPMENT_ACCESS_TOKEN_SHA256` secret. Its old raw synthetic token is no
   longer an accepted authority path.

Setting the Worker secret `EMERGENCY_DISABLED` to the exact string `true`
keeps `/health` and `/api/protocol` available while every session creation,
join, WebSocket, and Host-control path returns `503`. Removing or changing that
secret restores the ordinary test gate after a reviewed smoke check.

The first-party WebAssembly module and original scenario are bundled with the
Worker. Wrangler and its development dependency graph are not bundled. D1, R2,
Queues, Realtime, Containers, analytics, and remote AI remain absent.

Before named friends join, a separate readiness slice must complete hibernation
and deletion evidence, app conformance, API Custom Domain DNS/certificate
verification, packaged Stage transport evidence, tester notice, and the final
owner go/no-go record. The
emergency disable, invitation rotation and closure, endpoint revocation,
explicit session end, per-session join limiting, and per-endpoint message
limiting are implemented and still require app-level rehearsal.

## Staging Gate

Staging is a new isolated environment, not renamed development state. Before it
exists, complete:

- shared native/WebAssembly engine parity and deterministic export/replay tests
- canonical v1 runtime validation and recipient-projection privacy tests
- account-backed authentication, pairing, authority rotation, revocation, and
  deletion behavior
- database and object-storage migrations with lifecycle and restore tests
- exact-origin browser policy and native-client transport security
- abuse controls, rate limits, safe operational correlation, alerting, incident
  response, rollback, backup, export, and restore rehearsals
- provider and dependency approval for every enabled service

Staging remains synthetic and named-tester-only.

## Production Gate

Production requires a separate owner-signed release record. It includes all
staging evidence plus current legal/privacy review, domain and certificate
approval, production jurisdiction decisions, least-privilege CI identity,
media isolation and consent evidence, account deletion and retention automation,
store disclosure alignment, capacity and cost limits, support ownership, and a
successful recovery exercise.

No development or staging token, namespace, database, bucket, media credential,
route, or Durable Object ID is promoted into production.

## Rollback and Removal

Every deployment records the source commit, artifact digest, Worker version,
configuration, compatible Durable Object schema/event versions, and operator.
Rollback must preserve understanding of all journal entries already written.

Complete provider removal includes exporting portable journals and approved
global data, revoking OAuth and API credentials, deleting routes and secrets,
verifying provider-side data deletion under the approved lifecycle, removing
bindings and CI authority, reconciling billing, and retaining only the minimum
required release and deletion evidence.

## Current Primary References

- [Wrangler installation](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Durable Object class exports](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
- [Durable Object data location](https://developers.cloudflare.com/durable-objects/reference/data-location/)
- [D1 data location](https://developers.cloudflare.com/d1/configuration/data-location/)
- [Cloudflare Data Processing Addendum](https://www.cloudflare.com/cloudflare-customer-dpa/)
- [Cloudflare Security Exhibit](https://www.cloudflare.com/security-exhibit/)
