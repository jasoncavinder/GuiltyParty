# Cloudflare Tooling Evaluation

## Status

Point-in-time evaluation as of 2026-08-06. The owner approved a temporary,
development-only exception for the exact Wrangler and Undici combination below.
It is not approved for production, product redistribution, or CI deployment
authority. Any version or graph change requires renewed intake under
[ADR 0025](../adr/0025-third-party-dependency-governance.md).

## Scope

The dependency-free remote-service source can be inspected and tested with
Node, but Cloudflare-compatible bundling, local `workerd` execution, generated
configuration validation, OAuth login, and deployment require a deployment
tool. Cloudflare's official Wrangler CLI is the preferred candidate because it
is the platform's documented configuration source of truth and includes the
matching local runtime.

The repository does not need `@cloudflare/workers-types` for the current plain
JavaScript slice. It also does not need a frontend framework, Vite plugin,
testing pool, telemetry SDK, or Cloudflare service client package.

## Evaluated Candidate

### Wrangler 4.119.0

- **Development-only exception:** exact package and override approved and
  installed as repository development tooling; production and CI deployment
  remain prohibited
- **Package:** exact development dependency `wrangler@4.119.0`
- **Publisher and source:** Cloudflare, in the
  [workers-sdk repository](https://github.com/cloudflare/workers-sdk)
- **Runtime baseline:** Node.js 22 or later
- **Declared license:** `MIT OR Apache-2.0`; the selected license grant and
  required notice still require owner review
- **Registry integrity:**
  `sha512-ookClf+zly4DTc8pBMNrwGQzZKH8IpIYTXkjDw3XS7ZvBQ5mLYH6eOvfD5BEpk3U63zTbv91WRlo1UeRSKXa0g==`
- **Direct runtime dependencies:** `unenv@2.0.0-rc.24`,
  `esbuild@0.28.1`, `workerd@1.20260801.1`,
  `miniflare@5.20260801.0-alpha`, `blake3-wasm@2.1.5`,
  `path-to-regexp@6.3.0`, `@cloudflare/unenv-preset@2.16.1`, and
  `@cloudflare/kv-asset-handler@0.5.0`; `fsevents@2.3.3` is optional
- **Resolved graph:** the isolated npm lock contains 91 package entries,
  including 60 platform-optional entries; 36 packages installed on the
  evaluated Apple Silicon macOS host
- **Native/precompiled surface:** platform-specific `workerd`, `esbuild`,
  `sharp`, and `libvips` packages; the lock contains binaries for multiple
  operating systems even though npm installs only applicable optional entries
- **Install scripts:** `esbuild@0.28.1` and `workerd@1.20260801.1` declare
  `postinstall` scripts. The research install used `--ignore-scripts` and the
  applicable prebuilt packages still allowed `wrangler --version` to execute.
  Local development and deployment must be proven under that restriction
  before adoption.

The resolved license labels are predominantly MIT, Apache-2.0, dual
MIT/Apache-2.0, ISC, 0BSD, and CC0-1.0. The graph also includes optional
`@img/sharp-libvips-*` packages labeled `LGPL-3.0-or-later`, plus sharp packages
with combined Apache/LGPL labels. ADR 0025 requires explicit owner and, where
appropriate, professional legal review of copyleft components even for a
development tool. Nothing in this evaluation decides that question or changes
Guilty Party's proprietary license.

## Security Finding and Current Recommendation

The unmodified `wrangler@4.119.0` graph pins `undici@7.28.0` through
`miniflare@5.20260801.0-alpha`. The isolated `npm audit` reported five advisories
against that version, with aggregate results of one high and two moderate
affected packages. The findings include cross-user cache information disclosure
and a parse-time crash, response desynchronization, CRLF injection, and cookie
attribute injection. The registry's suggested automatic fix would downgrade
Wrangler to 4.35.0 and is not an acceptable automatic update decision.

An isolated research override to exact `undici@7.29.0` produced a zero-finding
audit on 2026-08-06. Its registry integrity is
`sha512-IDxfleLmmbSskfWSUATiN1nfn2rDuvnMOqb5CWR92iIfojA0Ud+ulOAAEQ57LPr9rWmsreUyf5lwyao+7GNNVw==`
and its declared license is MIT. However, Miniflare pins 7.28.0 rather than a
compatible range. Overriding the pin without Cloudflare compatibility evidence
would make Guilty Party responsible for an unreviewed combination.

**Temporary decision:** do not use Wrangler 4.119.0 with its unmodified graph.
The repository temporarily pins Wrangler 4.119.0 and overrides only Undici to
exact 7.29.0 for owner-operated development builds and the approved synthetic
development deployment. Installs keep scripts disabled. This exception must be
removed or re-reviewed when Cloudflare publishes a suitable patched release and
must not become the production or CI deployment baseline.

### Owner-Approved Isolated Override Spike

The owner approved a local-only, time-bounded compatibility spike on
2026-08-06. The spike did not authenticate to Cloudflare, mutate the account,
deploy a Worker, or add a dependency to the repository.

The isolated npm project pinned `wrangler@4.119.0` and overrode only Undici to
exact `7.29.0`. Its lock contained 92 package entries, 36 packages installed on
the Apple Silicon macOS host with scripts disabled, and `npm audit` reported no
known vulnerabilities. `wrangler --version` executed successfully without
install scripts.

Wrangler's artifact-only deployment dry run validated the committed
configuration and produced a 14.67 KiB Worker bundle (4.28 KiB gzip) with only
the `GAME_SESSIONS` Durable Object and the development profile binding. The
bundle and sanitized log scan contained no account identifier, credential,
domain, or secret value.

The local `workerd` runtime passed `/health`, `/api/protocol`, fail-closed join,
unauthorized WebSocket, exact subprotocol, authenticated Durable Object routing,
SQLite initialization, and application-message rejection checks. The first run
also exposed a redundant close-frame echo that attempted to send reserved code
`1006`; the service removed that handler, and the corrected runtime smoke test
shut down without an exception.

This evidence supported the owner's subsequent repository-adoption and first
synthetic-development-deployment exception. The Miniflare pin remains
overridden, native-package notice reconciliation is limited to internal
development use, and production-like rollback and removal have not been
exercised. CI receives the locked development graph for tests but receives no
Cloudflare credential or deployment authority.

Advisory references:

- [GHSA-8xcm-r25x-g524](https://github.com/advisories/GHSA-8xcm-r25x-g524)
- [GHSA-4cwx-7wf7-3272](https://github.com/advisories/GHSA-4cwx-7wf7-3272)
- [GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5)
- [GHSA-jr45-8vmc-qm54](https://github.com/advisories/GHSA-jr45-8vmc-qm54)
- [GHSA-v3r7-h72x-cjcm](https://github.com/advisories/GHSA-v3r7-h72x-cjcm)

## Privacy and Local Data Controls

Wrangler 4.119.0 defaults several collection features on. The committed
development configuration explicitly sets:

- `send_metrics: false`
- `dependencies_instrumentation.enabled: false`
- `observability.enabled: false`

Cloudflare documents that dependency instrumentation otherwise uploads npm
package names and versions with Worker uploads. Wrangler also writes local debug
logs and supports `WRANGLER_LOG_PATH` and `WRANGLER_LOG_SANITIZE`. The isolated
version check attempted to create a log under the user's Wrangler preferences
directory even though no deployment occurred.

If adopted, project commands must keep sanitization enabled, direct ephemeral
logs to an ignored project-controlled directory, prevent secrets and private
content from entering command arguments or logs, disable automatic resource
provisioning for reviewed deployment flows, and define log retention and
deletion. OAuth credentials should use the operating-system keychain rather
than a plaintext token file. CI must use a separate least-privilege token and
must not reuse a human OAuth credential.

Official references:

- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Wrangler system environment variables](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/)
- [Durable Object class exports](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)
- [Cloudflare dependency-instrumentation notice](https://developers.cloudflare.com/changelog/post/2026-07-07-wrangler-deploy-upload-dependencies-metadata/)

## Adoption and Deployment Test

The temporary exception follows this sequence:

1. add only the exact pinned development dependencies and committed lockfile
2. install with scripts disabled into an empty cache and reconcile actual files
3. prove config validation and a no-network dry-run build
4. run `workerd` locally against `/health`, `/api/protocol`, fail-closed join,
   WebSocket negotiation, hibernation, SQLite schema, replay, and idempotency
5. inspect process, file, log, and network behavior with no Cloudflare login
6. authenticate by browser OAuth with keychain storage only for the approved
   human development deploy
7. deploy the synthetic development environment with automatic resource
   provisioning disabled and no production resource identifiers
8. export and remove the test deployment to prove rollback and removal

## Removal Scope

Removal deletes Wrangler and all transitives from the manifest and lockfile,
project scripts and caches, generated bundles, local state, OAuth profiles and
credentials, CI tokens, Cloudflare development resources, tooling-specific
documentation and notices, and corresponding SBOM entries. The first-party
Worker source, canonical contracts, and provider-neutral tests remain.
