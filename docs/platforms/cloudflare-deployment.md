# Cloudflare Deployment Runbook

## Status

Development deployment approved. The first deployment is limited to the
synthetic `guilty-party-remote-dev` Worker, its SQLite Durable Object class, the
`workers.dev` endpoint, and one development access-token digest. No custom
domain, D1 database, R2 bucket, Queue, media resource, production resource, or
CI credential is approved.

The architecture is accepted in
[ADR 0033](../adr/0033-cloudflare-remote-services.md). The owner approved the
temporary development-only Wrangler exception and recommended development
settings on 2026-08-06. Staging and production remain blocked by the gates
below. See the
[third-party component inventory](../legal/third-party-components.md#remote-deployment-tool--temporary-development-exception).

## Owner Website Checklist

Complete these in the Cloudflare dashboard without creating application
resources manually:

- [ ] Use the intended long-term owner email and verify it.
- [ ] Enable phishing-resistant two-factor authentication where available.
- [ ] Store recovery codes outside the development machine.
- [ ] Confirm the account name and ownership are appropriate for Guilty Party.
- [ ] Add the intended billing method and select the approved Workers plan.
- [x] Create a conservative account-level budget alert. Cloudflare currently
      exposes the selected alert as a total-spend threshold rather than separate
      actual and forecast thresholds; the development account threshold is
      USD 10.
- [ ] Reserve the intended `workers.dev` subdomain for development.
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

Development initially uses only synthetic identities and original synthetic
scenario content. A custom domain is unnecessary for this phase and should wait
for product naming, trademark, and DNS approval.

## Repository Preflight

Before any Cloudflare authentication or resource mutation:

1. Confirm the branch is not `main` or `dev` and is current with `origin/dev`.
2. Run `make test` from a clean dependency install.
3. Confirm `services/remote/wrangler.jsonc` has the exact
   `guilty-party-remote-dev` name, `workers_dev: true`, `preview_urls: false`,
   `send_metrics: false`, dependency instrumentation disabled, persisted
   observability disabled, and no custom route.
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
3. enable a development route in reviewed configuration
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
  remain available
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
- [Durable Object class exports](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
- [Durable Object data location](https://developers.cloudflare.com/durable-objects/reference/data-location/)
- [D1 data location](https://developers.cloudflare.com/d1/configuration/data-location/)
- [Cloudflare Data Processing Addendum](https://www.cloudflare.com/cloudflare-customer-dpa/)
- [Cloudflare Security Exhibit](https://www.cloudflare.com/security-exhibit/)
