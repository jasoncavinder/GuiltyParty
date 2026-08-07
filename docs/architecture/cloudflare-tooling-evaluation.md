# Cloudflare Tooling Evaluation

## Status

Point-in-time evaluation as of 2026-08-06. This document does not approve or
add a dependency. Adoption still requires the complete intake and explicit
owner decision required by [ADR 0025](../adr/0025-third-party-dependency-governance.md).

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

- **Candidate only:** not approved or installed in Guilty Party
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

**Recommendation:** do not adopt Wrangler 4.119.0 as currently resolved. Wait
for a Cloudflare release that resolves the Undici advisories, then repeat the
full locked-graph, license, script, binary, behavior, and audit review. A
temporary override should be considered only as a time-bounded local spike with
explicit owner approval; it must not become the deployment or CI baseline on
the evidence currently available.

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

## Proposed Adoption Test

After a clean candidate release passes renewed intake:

1. add only exact pinned development dependencies and a committed lockfile
2. install with scripts disabled into an empty cache and reconcile actual files
3. prove config validation and a no-network dry-run build
4. run `workerd` locally against `/health`, `/api/protocol`, fail-closed join,
   WebSocket negotiation, hibernation, SQLite schema, replay, and idempotency
5. inspect process, file, log, and network behavior with no Cloudflare login
6. authenticate by browser OAuth with keychain storage only after owner approval
7. deploy the synthetic development environment with automatic resource
   provisioning disabled and no production resource identifiers
8. export and remove the test deployment to prove rollback and removal

## Removal Scope

Removal deletes Wrangler and all transitives from the manifest and lockfile,
project scripts and caches, generated bundles, local state, OAuth profiles and
credentials, CI tokens, Cloudflare development resources, tooling-specific
documentation and notices, and corresponding SBOM entries. The first-party
Worker source, canonical contracts, and provider-neutral tests remain.
