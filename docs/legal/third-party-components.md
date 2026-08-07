# Third-Party Components

## Purpose and Status

This document is the human-readable intake and inventory required by
[ADR 0025](../adr/0025-third-party-dependency-governance.md). It does not
replace package manifests, lockfiles, complete license texts, required release
notices, privacy manifests, store declarations, or a release SBOM.

The current inventory is **retrospective review pending**. Existing prototype
components may remain within their current local-development scope, but this
record does not approve them for invitation-only beta, production, commercial
distribution, or a new purpose. Complete the review before external beta.

## Current Repository Sources

Reviewed source-of-truth files:

- `server/Cargo.toml`
- `server/Cargo.lock`
- `server/crates/gp_scenario/Cargo.toml`
- `server/crates/gp_session/Cargo.toml`
- `server/crates/gp_server/Cargo.toml`
- browser client HTML, CSS, and JavaScript under `clients/`

The browser Host and Stage currently have no package-manager manifest and load
no third-party script, stylesheet, font, or media asset from an external origin.
Their application visuals are first-party HTML and CSS. This statement must be
rechecked from the built artifact before external distribution.

## Direct Prototype Components Awaiting Retrospective Review

The Rust workspace currently declares these direct third-party crates. Version
constraints are shown from the manifests; actual resolved versions and
transitives are in `server/Cargo.lock` and must be reconciled during review.

| Component | Declared constraint | Current purpose | Review status |
| --- | --- | --- | --- |
| `async-trait` | `0.1` | Async trait support for server adapters | Pending |
| `axum` | `0.7` | Prototype HTTP and WebSocket server | Pending |
| `reqwest` | `0.12` | Local AI-adapter HTTP client | Pending |
| `serde` | `1.0` | Structured serialization and deserialization | Pending |
| `serde_json` | `1.0` | JSON contracts, scenarios, projections, and journal data | Pending |
| `tokio` | `1.37` | Async runtime and synchronization | Pending |
| `tower-http` | `0.6` | Prototype CORS middleware | Pending |
| `tracing` | `0.1` | Structured operational instrumentation | Pending |
| `tracing-subscriber` | `0.3` | Local logging subscriber and filtering | Pending |
| `uuid` | `1.11` | Random prototype identifiers | Pending |

The server also contains an optional adapter for an OpenAI-compatible local
HTTP endpoint used with a separately installed local model runner. No model,
model weights, model license, provider SDK, or local runner is bundled in the
repository. Any external-beta or distributed AI configuration requires a
separate component, model, service, privacy, and license intake.

The Python standard-library HTTP server used by development commands and the
installed Xcode, Android Studio, webOS, browser, and simulator tools are
development environment prerequisites rather than redistributed components.
Plugins, extensions, templates, generated artifacts, or runtimes copied from
those tools into a release still require review.

## Approved Contract Validation Tool

### Ajv

- **Status:** Approved and installed as development-only contract validation
  tooling.
- **Category and risk:** Elevated development/build tool. Ajv compiles schemas
  into JavaScript validation functions, so it executes during tests even though
  it is excluded from application and release artifacts.
- **Purpose and alternatives:** Provide standards-compliant JSON Schema Draft
  2020-12 meta-schema and fixture validation for the canonical control-plane
  contract. The existing first-party checker deliberately implements only the
  committed keyword subset. Rust `jsonschema` 0.49.6 supports the required
  draft and meta-validation but resolves a substantially broader dependency
  graph even with network/file resolver features disabled. Rust `boon` 0.6.1
  includes HTTP, TLS, YAML, and URL dependencies that this local-only check does
  not need. `ajv-cli` is unnecessary and has a separate, older dependency
  surface. An external validation service is rejected because contract content
  should not be uploaded and validation must be reproducible offline.
- **Canonical source and publisher:** npm package `ajv`, maintained by the Ajv
  project; canonical repository
  [ajv-validator/ajv](https://github.com/ajv-validator/ajv). npm lists Evgeny
  Poberezkin (`esp`) and Blake Embrey (`blakeembrey`) as maintainers.
- **Package coordinates and exact version:** npm development dependency
  `ajv@8.20.0`, exact version only. Published 2026-04-24. Proposed development
  baseline is Node.js 20 or later; the reviewed release supports Node.js 18
  through current releases.
- **Platforms and artifacts:** Developer machines and GitHub Actions contract
  checks only. The package, its generated in-memory validator functions, and
  `node_modules` must not enter the Rust server, browser clients, native apps,
  packaged Stage, or distributed product.
- **Provenance, signing, and integrity evidence:** npm registry integrity
  `sha512-Thbli+OlOj+iMPYFBVBfJ3OmCAnaSyNn4M1vz9T6Gka5Jt9ba/HIR56joy65tY6kx/FCF5VXNB819Y7/GUrBGA==`;
  SHA-1 `304b3636add88ba7d936760dd50ece006dea95f9`; independently calculated
  SHA-512
  `4e16e58be3a53a3fa230f60505505f2773a60809da4b2367e0cd6fcfd4fa1a46b926df5b6bf1c8479ea3a32eb9b58ea4c7f142179557341f35f58eff194ac118`.
  npm registry metadata includes a package signature. GitHub identifies the
  `v8.20.0` release commit as verified. A committed npm lockfile must preserve
  exact resolved packages and integrity values.
- **Direct and material transitive components:** `fast-deep-equal@3.1.3` (MIT),
  `fast-uri@3.1.5` (BSD-3-Clause), `json-schema-traverse@1.0.0` (MIT), and
  `require-from-string@2.0.2` (MIT). The isolated review resolved exactly these
  four transitive packages. Their registry integrity values must be retained in
  the proposed lockfile and rechecked in review.
- **Enabled features, build scripts, native code, and endpoints:** Use only the
  Draft 2020-12 class from core Ajv. Do not add format, keyword, CLI, remote-
  loading, or mutation plugins. Configure strict schema checks, no coercion,
  no default insertion, no additional-property removal, and no remote schema
  retrieval. Disable only Ajv's non-standard `strictRequired` lint because the
  canonical envelopes declare required properties through sibling `allOf`
  branches; JSON Schema `required` validation remains active. Treat `format` as
  the Draft 2020-12 annotation used by the current contract. Install with
  `npm ci --ignore-scripts`; the five resolved packages
  declare no install script and contain no native binary. Ajv generates
  validation functions in memory from reviewed first-party schemas; it makes
  no runtime network request for this use.
- **License, copyright, patent, attribution, and redistribution evidence:** Ajv
  is MIT licensed, copyright 2015-2021 Evgeny Poberezkin. Three transitives are
  MIT and `fast-uri` is BSD-3-Clause. No separate patent grant is stated. The
  full copyright and notice texts require reconciliation before any tool or
  generated material is redistributed; the proposed development-only use does
  not alter Guilty Party's proprietary license.
- **Data, purpose, recipients, retention, deletion, and consent:** Input is
  limited to committed schemas and synthetic fixtures. Processing is local to
  the developer or CI runner. No gameplay, credential, participant, private
  communication, or production data is collected, transmitted, retained, or
  shared. Ajv has no telemetry or remote endpoint in the proposed use.
- **Permissions, entitlements, sensitive APIs, and background behavior:** None.
  The checker reads repository contract files and exits with validation status.
  It receives no mobile permission, entitlement, secret, persistent identifier,
  background mode, or production authority.
- **Apple privacy manifest, signature, required-reason, and label impact:** Not
  applicable because the tool is not linked, bundled, or executed in an Apple
  application or distributed artifact.
- **Android manifest, SDK Index, Data Safety, and policy impact:** Not applicable
  because the tool is not linked, bundled, or executed in an Android
  application or distributed artifact.
- **Security advisories, update source, and support status:** The canonical
  repository is active and the reviewed release is current as of 2026-08-06.
  GitHub's repository advisory endpoint reported no published project security
  advisories, and an isolated npm audit of the five-package locked graph
  reported zero known vulnerabilities. These are point-in-time signals, not a
  warranty. Updates come only from the npm registry after renewed intake; no
  automated dependency update may merge.
- **Test, rollback, and complete-removal plan:** Before adoption, run an isolated
  spike against every committed positive, negative, additive-field, null,
  Unicode, discriminator, numeric-boundary, and privacy fixture. Validate the
  canonical schema against its meta-schema, forbid remote references, and
  compare results with the first-party checker. Removal deletes the tooling
  package manifest and lock, Ajv checker, Makefile and CI invocation, inventory
  entry, and any Ajv-specific documentation; canonical schemas and fixtures
  remain usable by another validator.
- **Required notices and SBOM evidence:** Retain Ajv and transitive license
  evidence in dependency review. Include the locked development tool in the
  development SBOM where applicable, but exclude it from product SBOMs only
  after verifying it is absent from release artifacts.
- **Reviewer and explicit owner decision:** Approved by the project owner in the
  repository work session on 2026-08-06.
- **Approval date, scope, review triggers, and exception expiry:** Approved
  2026-08-06 for exact `ajv@8.20.0` as a development-only contract validator
  with the four listed locked transitives and no plugins or remote retrieval.
  Any version, transitive, script, license, provenance, maintainer, execution,
  network, schema-source, or distribution change requires renewed review. No
  exception is requested.

## Retrospective Review Work

Before invitation-only external beta:

- resolve the exact direct and transitive versions from the release lockfile
- verify canonical source, provenance, publisher, checksums or signatures where
  supported, maintenance, advisory sources, and end-of-life state
- inspect enabled features, build scripts, native code, downloaded artifacts,
  runtime endpoints, permissions, and data flows
- verify every license, copyright, attribution, notice, patent, and
  redistribution obligation from authoritative component sources
- determine required repository and distributed-product notices
- reconcile the release artifact with Apple and Android privacy, permission,
  signature, SDK Index, and store-disclosure requirements where applicable
- generate and review a machine-readable release SBOM
- obtain explicit owner approval for each retained component and its scope

Do not infer approval from a prior informal note, a package metadata label, a
successful build, or this pending table.

## Proposed Remote Deployment Tool — Not Approved

### Wrangler 4.119.0

- **Status:** Proposed; blocked from installation and use pending a patched
  dependency graph and explicit owner approval.
- **Category and risk:** Elevated development, deployment, credential, remote-
  configuration, build-execution, and native-binary tool.
- **Purpose and alternatives:** Build and locally emulate the first-party Worker
  and Durable Object, validate `wrangler.jsonc`, authenticate a human operator,
  and deploy reviewed versions to Cloudflare. Cloudflare recommends a locally
  installed, project-pinned Wrangler. An unpinned `npx wrangler`, a global
  install, manual dashboard drift, and handwritten REST deployment are rejected
  for reproducibility and authority reasons. A future patched Wrangler release
  or an explicitly reviewed dependency override remains possible.
- **Canonical source and publisher:** npm package `wrangler`, published by
  Cloudflare from
  [cloudflare/workers-sdk](https://github.com/cloudflare/workers-sdk). Official
  installation and configuration guidance is in the
  [Cloudflare Wrangler documentation](https://developers.cloudflare.com/workers/wrangler/install-and-update/).
- **Package coordinates and exact proposed version:** `wrangler@4.119.0`,
  published 2026-08-05, requiring Node.js 22 or later. It is **not present** in
  `package.json` or `package-lock.json`.
- **Provenance and integrity evidence:** npm registry integrity
  `sha512-ookClf+zly4DTc8pBMNrwGQzZKH8IpIYTXkjDw3XS7ZvBQ5mLYH6eOvfD5BEpk3U63zTbv91WRlo1UeRSKXa0g==`;
  registry tarball `wrangler-4.119.0.tgz`; canonical repository is the public
  Cloudflare Workers SDK repository. Release-tag and package-signature evidence
  still requires reconciliation before approval.
- **Direct and material transitive components:** The registry declares
  `unenv@2.0.0-rc.24`, `esbuild@0.28.1`, `workerd@1.20260801.1`,
  `miniflare@5.20260801.0-alpha`, `blake3-wasm@2.1.5`,
  `path-to-regexp@6.3.0`, `@cloudflare/unenv-preset@2.16.1`, and
  `@cloudflare/kv-asset-handler@0.5.0` as direct dependencies, plus
  `fsevents@2.3.3` as optional. An isolated lock resolution contained 91 total
  development dependencies including optional platform packages; the complete
  graph and notices remain unapproved.
- **Build scripts, native code, and downloads:** `esbuild@0.28.1` and
  `workerd@1.20260801.1` declare postinstall scripts and platform-specific
  optional native packages. This means the project's ordinary
  `npm ci --ignore-scripts` rule cannot simply be applied while retaining a
  working tool. The scripts, selected macOS and CI binaries, registry sources,
  checksums, and absence of an unverified fallback download require inspection
  before approval.
- **License evidence:** Wrangler, Cloudflare's preset, and asset handler declare
  `MIT OR Apache-2.0`; `workerd` declares Apache-2.0; the other listed direct
  dependencies declare MIT. Exact copyright, patent, attribution, dual-license
  selection, native-package, and full transitive notice obligations remain to
  be reconciled. These labels do not yet approve proprietary use or
  redistribution.
- **Data and remote endpoints:** Wrangler can authenticate to and mutate a
  Cloudflare account, deploy source and configuration, manage bindings and
  secrets, and run a local emulator. Its usage metrics default to enabled and
  package dependency instrumentation defaults to enabled. The committed
  development configuration explicitly sets `send_metrics: false`, disables
  dependency instrumentation, and disables persisted Worker observability.
  Authentication material must remain in Wrangler's approved credential store
  or environment-specific CI secret store, never source control or logs.
- **Current security gate:** An isolated exact lock resolution on 2026-08-06
  resolved `miniflare@5.20260801.0-alpha` to `undici@7.28.0`. `npm audit`
  reported three affected dependency records—two moderate and one high—covering
  response desynchronization, cache-related information disclosure and crash,
  CRLF injection, and cookie attribute injection advisories for versions before
  `7.29.0`. The registry's suggested downgrade is not accepted as a safe fix.
  Wrangler 4.119.0 must not enter the repository until Cloudflare publishes a
  suitable patched graph or a separately reviewed exact override passes source,
  compatibility, local-runtime, deployment, and rollback tests.
- **Privacy and store impact:** Development/CI only; it must not be bundled into
  the Worker, browser, webOS, iOS, Android, or other product artifact. No
  gameplay, participant, private scenario, or production database content may
  be used in local-tool tests. Mobile privacy-manifest, SDK Index, and store
  declaration impact is therefore not applicable unless the tool is later
  bundled, which is outside the proposed scope.
- **Test, rollback, and removal:** Approval requires a lockfile-only graph and
  audit review, install-script and binary provenance inspection, Wrangler
  configuration validation, offline unit tests, local Durable Object SQLite and
  hibernating-WebSocket tests, a dry-run artifact inspection, a synthetic
  development deployment, rollback and export rehearsal, and confirmation that
  no dependency enters the Worker bundle. Removal deletes the package and
  lockfile graph, scripts, local caches and credentials, CI token, deployment
  workflow, and Wrangler-specific configuration after exporting or migrating
  provider state.
- **Required notices and SBOM:** Pending full graph reconciliation. Include the
  tool graph in the development/CI SBOM and prove it absent from the product
  runtime SBOM.
- **Reviewer and explicit owner decision:** Technical intake prepared by Codex
  on 2026-08-06. The owner approved only the documented local, time-bounded
  `undici@7.29.0` override spike on 2026-08-06. Repository adoption,
  authentication, deployment, CI use, and redistribution remain unapproved; no
  broader approval is inferred from the spike or accepted Cloudflare
  architecture.
- **Review triggers and exception:** Any release, transitive, native package,
  install script, advisory, telemetry, credential, endpoint, config-schema, or
  deployment-authority change requires renewed review. No exception is
  requested.

## Intake Record Template

Copy this section for each approved component or coherent SDK/provider bundle:

```markdown
### Component name

- Status: Proposed | Approved | Rejected | Removal planned | Removed
- Category and risk: Standard | Elevated
- Purpose and alternatives:
- Canonical source and publisher:
- Package coordinates and exact version:
- Platforms and artifacts:
- Provenance, signing, and integrity evidence:
- Direct and material transitive components:
- Enabled features, build scripts, native code, and endpoints:
- License, copyright, patent, attribution, and redistribution evidence:
- Data, purpose, recipients, retention, deletion, and consent:
- Permissions, entitlements, sensitive APIs, and background behavior:
- Apple privacy manifest, signature, required-reason, and label impact:
- Android manifest, SDK Index, Data Safety, and policy impact:
- Security advisories, update source, and support status:
- Test, rollback, and complete-removal plan:
- Required notices and SBOM evidence:
- Reviewer and explicit owner decision:
- Approval date, scope, review triggers, and exception expiry:
```

## Distribution Rule

Required third-party notices accompany the applicable artifact without
replacing or weakening the root proprietary license. This public inventory does
not contain secrets, private registry coordinates, signing material, provider
credentials, private vulnerability details, or confidential commercial terms.
