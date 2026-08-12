# Cloudflare Deployment Runbook

## Status

The Remote Friends MVP development service was most recently promoted on
2026-08-11 HST from reviewed `dev` commit
`0eedab967c94536eb618c1c0f4e93ba8093f447d` after the Stage MP3 atmosphere
adoption merged. The deployment remains limited to the synthetic
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
3. Confirm `apps/server/cloudflare/wrangler.jsonc` has the exact
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

## Remote Friends MVP Development Promotions

The reviewed runtime passes Host creation, browser cookie pairing, native
bearer pairing, two-participant deterministic gameplay, private clue filtering,
voting, outcome, identical idempotent retry, forbidden participant command,
native/WebAssembly parity, and Worker bundle checks. The completed development
promotion does not authorize named-friend traffic by itself.

The owner-operated development promotion followed this procedure:

1. Merge the implementation PR into `dev` after review and deploy the reviewed
   commit, not an uncommitted worktree.
2. Deploy the API Custom Domain at `api.test.guiltyparty.app`. Cloudflare
   creates the DNS record and exact-hostname certificate for a Worker Custom
   Domain; verify both are active before smoke testing. The owner approved
   `https://host.test.guiltyparty.app` and
   `https://play.test.guiltyparty.app`, and the exact comma-separated
   `ALLOWED_ORIGINS` value is committed in the reviewed configuration; do not
   use wildcards. There is no Stage website. Under ADR 0035, only packaged
   Stage pairing and realtime-ticket
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
   `SESSION_CREATE_RATE_LIMITER`, `SESSION_JOIN_RATE_LIMITER`, and
   `STAGE_PAIRING_RATE_LIMITER` bindings are present in the artifact before
   deploying.
7. Deploy manually and verify `/health` reports
   `friends-mvp-development` with status `test-gated`.
8. Rehearse Host creation, invalid bootstrap, invalid/expired participant
   invitation, one Host-approved packaged Stage pairing, two native
   participants, exact-origin rejection, opaque packaged-Origin rejection,
   display-code-without-secret rejection, pairing expiry, one-time Stage ticket
   replay rejection, the full
   game loop, private projections, idempotent retry, forbidden command,
   reconnect, admission throttling, and rollback using synthetic aliases only.
   Run `make rehearse-packaged-stage` with `GP_REMOTE_BASE_URL` and
   `GP_HOST_BOOTSTRAP_PROOF` supplied through the protected operator process
   environment as the repeatable ticket-use/replay/tamper check.
9. After the replacement is proven, remove the obsolete
   `DEVELOPMENT_ACCESS_TOKEN_SHA256` secret. Its old raw synthetic token is no
   longer an accepted authority path.

Promotion evidence:

- Reviewed source commit:
  `2501ff021b5a033c1357d9c9cea4f414a233fd6a`.
- Current Worker version after secret cleanup and the emergency-disable
  restoration rehearsal: `9f74107a-d613-4566-91ae-ad6f88d1dcd5`.
- Provider script ETag for the final Worker version:
  `1e6df89f84ba45a75a9a9b852a9d477dd8eec0f32be6a543d40371b7efa0055c`.
- Reproduced Wrangler 4.119.0 dry-run runtime artifact manifest from the
  reviewed source commit:

  - `worker.js` SHA-256:
    `6b7ec8358e613ae53501d3042fef14634dca44cf5cb7e09d289528f1f4371f82`.
  - `85b31fdbd5ef4c5f690c397f89cbbb70b9af79d5-gp_scenario_wasm.wasm`
    SHA-256:
    `3d01663fb738ceaf31f830705f427bfa7d7735bae5f1de17d0edeee230bba9b7`.

  At promotion time these runtime files were generated under the former
  `services/remote/.tmp/cloudflare-bundle/` path. After ADR 0039, the same
  `make check-cloudflare` command writes current artifacts under
  `apps/server/cloudflare/.tmp/cloudflare-bundle/`. The local source map is
  excluded because source-map upload is not enabled.
- `api.test.guiltyparty.app` is an active proxied Worker record with an active
  managed edge certificate. Both advertised edge addresses negotiated TLS 1.3,
  and the default HTTPS/HTTP2 health request succeeded after initial edge
  propagation.
- The only remaining Worker secrets are `AUTHORITY_SIGNING_KEY` and
  `HOST_BOOTSTRAP_TOKEN_SHA256`. Their protected raw inputs were generated
  independently, stored in macOS Keychain, verified byte-for-byte in memory,
  and sent to Wrangler through standard input. No raw value was written to a
  command, file, task output, or repository artifact.
- The service rolled back to pre-promotion version
  `dddc679c-3ea9-424a-a432-b7c2fea832d7`; `/health` reported the skeleton
  profile and `/api/v1/join` returned its fail-closed `501`. The exact reviewed
  commit was then redeployed and its secrets resynchronized from Keychain.
- Live checks passed for health and protocol discovery, invalid bootstrap
  `401`, untrusted-origin `403`, browser and packaged-Stage preflight, missing
  WebSocket authority `401`, wrong-origin WebSocket `403`, packaged-Stage join,
  first-use WebSocket `101`, ticket replay and tamper `401`, and explicit
  session cleanup `200`.
- Live Cloudflare admission checks returned creation `429` after ten synthetic
  sessions, each explicitly ended, and join `429` after 61 synthetic misses
  against one opaque nonexistent session identifier.
- The obsolete `DEVELOPMENT_ACCESS_TOKEN_SHA256` Worker secret and its matching
  legacy Keychain plaintext item were permanently deleted after replacement
  proof. They are not recoverable and are no longer accepted by the service.

Setting the Worker secret `EMERGENCY_DISABLED` to the exact string `true`
keeps `/health` and `/api/protocol` available while every session creation,
join, WebSocket, and Host-control path returns `503`. Removing or changing that
secret restores the ordinary test gate after a reviewed smoke check.

The live emergency rehearsal completed on 2026-08-07 HST. Health reported
`disabled`; protocol discovery remained `200`; and creation, join, and a raw
standards-compliant WebSocket upgrade each returned the safe disabled `503`.
After the temporary secret was deleted, `workers.dev` served the restored
version before the Custom Domain converged. Redeploying the unchanged reviewed
bundle restored both hostnames to `test-gated`; the provider script ETag stayed
`1e6df89f84ba45a75a9a9b852a9d477dd8eec0f32be6a543d40371b7efa0055c`,
the secret inventory returned to the two intended values, and the authenticated
packaged-Stage create/join/ticket/WebSocket/end rehearsal passed. Operators
must therefore verify every routed hostname after a secret-only restoration
and redeploy the reviewed bundle if a Custom Domain lags.

The development-only lifecycle rehearsal proposed in ADR 0038 uses a separate
operator-authenticated creation route with code-fixed short windows. After its
implementation is reviewed and deployed, run `make rehearse-remote-lifecycle`
with the base URL and Host bootstrap proof supplied through the protected
operator process environment. The rehearsal must observe the documented
10-second Cloudflare hibernation window before requesting the same Stage
projection, then observe retained expiry and active-session data deletion. It
does not change the ordinary four-hour and seven-day defaults and does not
claim deletion from Cloudflare's provider-controlled recovery history.

The reviewed PR #23 promotion created the `StagePairing` Durable Object export
and produced Worker version `a9a70148-51de-47dc-bc0d-5329c9e480a4`. Both the
`workers.dev` endpoint and `api.test.guiltyparty.app` reported `test-gated` with
profile `friends-mvp-development`. Live operator rehearsals then passed:

- packaged Stage approval, first WebSocket use, replay rejection, tamper
  rejection, and cleanup
- invalid, rotated, closed, and expired invitation boundaries
- 120-second Stage transaction privacy, idempotent redemption, and edge `429`
- ticket consumption, expiry, tamper, revocation, and fresh-ticket reconnect
- Durable Object hibernation/reactivation and journal-derived projection
- explicit end, alarm expiry, and active-storage deletion
- the full deterministic game with a browser Host, two browser fallback
  participants, and a public-only packaged Stage projection

The full-game rehearsal also proved identical command retry, forbidden
participant mutation, recipient-authorized private clue delivery, private
objective separation, individual-vote privacy, reconnect, and deterministic
outcome. This evidence used synthetic aliases and does not substitute for the
remaining physical-client checks.

For that PR #23 promotion, the provider script ETag was
`bbb78395675d19eb187f86753b086c9255cb51cbe6facb3ed63fce2bbea4282d`.
A Wrangler 4.119.0 dry run of exact reviewed commit
`09ee0c09d5af16fd7275312612be5edcf5ecbeec` produced `worker.js` SHA-256
`2bf963a6532a9b577671a7b2cf8d82340c7bb77b2a5351ec02983d30f8eeda3c`
and the existing WebAssembly SHA-256
`3d01663fb738ceaf31f830705f427bfa7d7735bae5f1de17d0edeee230bba9b7`.

The reviewed PR #25 promotion advanced the API to Worker version
`603165d6-001a-4de4-98e6-faad5e78c426` from exact `dev` commit
`e85b486b1928704382329bbd73d4fa0a4ae28539`. The provider script ETag is
`fb72c47a3ee2bf94bbac88d4925919aac14a1719641fb49a935588c615a2b52c`.
A fresh Wrangler 4.119.0 dry run produced `worker.js` SHA-256
`814a516a80430c27f22bec38f447af8042f76f58c1f4e1ee15a9063527b9c0a5`;
the WebAssembly SHA-256 remained
`3d01663fb738ceaf31f830705f427bfa7d7735bae5f1de17d0edeee230bba9b7`.

The 2026-08-08 participant-resumption promotion advanced the API to Worker
version `1aecea5a-e07b-4f61-97ad-b9da1da6ece1` from exact reviewed `dev` commit
`af43fa47ac956e967d361698d41b4144ae01eae4`. A pinned Wrangler 4.119.0 dry run
from the relocated `apps/server/cloudflare/` workspace produced `worker.js`
SHA-256
`eb5ceecb327b3c56b66c2a49de5b2df4508cd473aed0e8aa854a4402920adb6b`;
the WebAssembly SHA-256 remained
`3d01663fb738ceaf31f830705f427bfa7d7735bae5f1de17d0edeee230bba9b7`.
The provider script ETag for this Worker version is
`1b3ce9ee062303213f091b2e5f1e0d28badbff10d81b8a5291b70d9dd433d26d`.

Both `workers.dev` and `api.test.guiltyparty.app` advertised the
`native_participant_resume` protocol feature after route convergence. The
Custom Domain briefly served the prior version after deployment and converged
on the new version after 20 seconds; both hostnames were verified separately.
An unauthenticated `POST /api/v1/resume` returned `401`, and the Browser Host
and Companion fallback remained available. No secret, binding, Durable Object
migration, Pages deployment, or new Cloudflare resource was added.

The 2026-08-11 Stage MP3 atmosphere promotion advanced the API to Worker
version `445d7acc-1e3f-4c52-95dd-3027089f2b48` from exact reviewed `dev` commit
`0eedab967c94536eb618c1c0f4e93ba8093f447d`. A pinned Wrangler 4.119.0 dry run
produced `worker.js` SHA-256
`3a603336dd6baf004bb652f6bf8cab327618f301f8b31d779c862862201b2c67`;
the first-party WebAssembly SHA-256 remained
`3d01663fb738ceaf31f830705f427bfa7d7735bae5f1de17d0edeee230bba9b7`.
The provider script ETag is
`5b90c6ad7a2497de8e370bcaeee57611c68c7a6829f4798ae62c04f91b9296b8`.

Both routed hostnames immediately reported the expected `test-gated` health
profile and advertised Stage presentation media and Host presentation status.
No secret, binding, Durable Object migration, Pages deployment, or new
Cloudflare resource was added. Stage 0.2.1 (4), exact IPK SHA-256
`27e87d942c74327befb4c3df240c0c813edd781c8d1ee0f17ab371dbfd0e71c8`,
then paired through the deployed service and passed the integrated physical
MP3 presentation, status, mute/re-enable, session-end, and relaunch regression
recorded in the webOS Stage build runbook.

The physical-iPhone and iPad-simulator exercise passed same-participant and
same-endpoint restart recovery, no duplicate roster entry, interrupted-vote
reconciliation without duplicate action, deterministic tie handling, and
post-session credential invalidation. Detailed non-secret evidence is recorded
in `android-entry-checkpoint-evidence.md` and
`ios-companion-mvp-test-record.md`.

The 2026-08-11 protocol `1.1` Android rehearsal promotion advanced the API from
exact merged `dev` commit
`4d82f5229addddd9efd4337c42bb7083c54ba4a7` to Worker version
`981a0b5a-822b-4951-af6b-2be89a6c50f9` and deployment
`b70b82a9-0813-46ce-babe-039068dd3b5e`. Before deployment, `make test`,
`make check-scenario-wasm`, and `make check-cloudflare` passed. Both the
`workers.dev` endpoint and `api.test.guiltyparty.app` then reported the existing
test-gated profile, preferred protocol `1.1`, and
`participant_vote_targets_v1`.

No secret, binding, route, custom domain, Durable Object migration, retention
setting, or new Cloudflare resource changed. The Host Pages artifact required a
separate reconciliation because its deployed shared parser still required
preferred protocol `1.0`; that Pages evidence and the completed Android
rehearsal are recorded in `remote-client-delivery.md` and
`android-companion-mvp-test-record.md` respectively.

The Browser Companion fallback remains on the production Pages deployment
manually promoted from exact reviewed `dev` commit
`e85b486b1928704382329bbd73d4fa0a4ae28539`, deployment
`eed998d9-d960-4cab-9c9f-537967ab2798`. The Browser Host's current production
deployment is the protocol-reconciled `3f67d939-5ba2-46ce-b8b5-2ff1e1fe5412`
from commit `4d82f5229addddd9efd4337c42bb7083c54ba4a7`. No secret or private runtime
value is configured in either Pages project. Automated gameplay,
packaged-Stage, pairing-boundary, and lifecycle rehearsals passed against the
promoted API. The lifecycle rehearsal required a follow-up correction so its
synthetic Host and fallback-participant requests declare the supported build
metadata enforced by PR #25; the deployed service itself was unchanged.

The first-party WebAssembly module and original scenario are bundled with the
Worker. Wrangler and its development dependency graph are not bundled. D1, R2,
Queues, Realtime, Containers, analytics, and remote AI remain absent.

Before named friends join, the readiness gate still requires the remaining app
conformance, the approved tester notice, and the final owner go/no-go record.
Hibernation, active-storage deletion, API and Pages Custom Domain
DNS/certificate checks, packaged Stage transport, emergency disable,
invitation rotation and closure, endpoint revocation, explicit session end,
per-session join limiting, per-endpoint message limiting, and native participant
resumption have deployed evidence. The second-physical-Apple-device claim
remains unverified.

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
