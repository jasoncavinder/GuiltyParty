# Cloudflare Deployment Runbook

## Status

Preparation only. No Cloudflare resource, route, domain, database, bucket,
namespace, secret, or CI credential is created by this document.

The architecture is accepted in
[ADR 0033](../adr/0033-cloudflare-remote-services.md). Deployment remains blocked
by the owner approvals and technical gates below. The currently evaluated
Wrangler release is not approved; see the
[third-party component inventory](../legal/third-party-components.md#proposed-remote-deployment-tool--not-approved).

## Owner Website Checklist

Complete these in the Cloudflare dashboard without creating application
resources manually:

- [ ] Use the intended long-term owner email and verify it.
- [ ] Enable phishing-resistant two-factor authentication where available.
- [ ] Store recovery codes outside the development machine.
- [ ] Confirm the account name and ownership are appropriate for Guilty Party.
- [ ] Add the intended billing method and select the approved Workers plan.
- [ ] Create conservative account-level budget alerts for actual and forecast
      spend; record their thresholds in the private operations record.
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
3. Confirm `services/remote/wrangler.jsonc` still has `workers_dev: false`,
   `send_metrics: false`, dependency instrumentation disabled, and persisted
   observability disabled.
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
