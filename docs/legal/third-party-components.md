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

- `apps/server/Cargo.toml`
- `apps/server/Cargo.lock`
- `apps/server/crates/gp_contract_gen/Cargo.toml`
- `apps/server/crates/gp_scenario/Cargo.toml`
- `apps/server/crates/gp_scenario_wasm/Cargo.toml`
- `apps/server/crates/gp_session/Cargo.toml`
- `apps/server/crates/gp_server/Cargo.toml`
- browser application HTML, CSS, and JavaScript under `apps/web/`

The browser Host and Companion fallback under `apps/web/`, and the packaged LG
Stage source under `apps/tv/lg-webos/`, currently have no package-manager
manifest and load no third-party script, stylesheet, font, or media asset from
an external origin. Their application visuals are first-party HTML and CSS.
This statement must be rechecked from the built artifacts before external
distribution.

## Direct Prototype Components Awaiting Retrospective Review

The Rust workspace currently declares these direct third-party crates. Version
constraints are shown from the manifests; actual resolved versions and
transitives are in `apps/server/Cargo.lock` and must be reconciled during
review.

| Component | Declared constraint | Current purpose | Review status |
| --- | --- | --- | --- |
| `async-trait` | `0.1` | Async trait support for server adapters | Pending |
| `axum` | `0.7` | Prototype HTTP and WebSocket server | Pending |
| `reqwest` | `0.12` | Local AI-adapter HTTP client | Pending |
| `serde` | `1.0` | Structured serialization and deserialization | Pending |
| `serde_json` | `1.0` | JSON contracts, scenarios, projections, journal data, and first-party contract generation | Pending except the generator scope approved below |
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

## First-Party WebAssembly Adapter

`gp_scenario_wasm` is first-party Guilty Party source, not a third-party
component. It depends only on the already inventoried workspace `serde` and
`serde_json` crates plus the first-party `gp_scenario` crate. It adds no bindgen,
Cloudflare Rust SDK, allocator, JavaScript package, or runtime network service.

The owner approved installation of Rust's official
`wasm32-unknown-unknown` standard-library target on 2026-08-06 for this
development and CI build. The resulting module is built from repository source,
parity-checked against the native engine, and bundled into the Worker. Any new
crate, bindgen tool, optimizer, component model, target, prebuilt binary, or
distribution purpose requires renewed ADR 0025 review.

### Focused Scope Approval: `serde_json` for `gp_contract_gen`

- **Status and owner decision:** On 2026-08-06 the project owner approved the
  first-party generator under ADR 0034. That approval includes the exact locked
  `serde_json@1.0.151` graph for local and CI contract generation only. It does
  not complete the broader retrospective review or approve a version update,
  native-app inclusion, private or production data, external-beta use, or
  commercial distribution.
- **Purpose and necessity:** Parse the committed control-plane v1 JSON Schema
  and synthetic fixture manifest into the first-party generator's closed
  intermediate representation. Reusing the existing workspace JSON component
  avoids a new parser or third-party generator. Handwritten parsing was
  rejected because JSON syntax handling is not the project's differentiating
  compiler behavior.
- **Version, source, features, and integrity:** crates.io
  `serde_json@1.0.151`, locked checksum
  `c841b55ecdae098c80dcae9cf767f6f8a0c2cdb3416bbef72181df4d0fe73f14`,
  default `std` feature only. The generator adds no new resolved package or
  version. Its normal dependencies are the already present locked
  `itoa@1.0.18` (`MIT OR Apache-2.0`), `memchr@2.8.3` (`Unlicense OR MIT`),
  `serde_core@1.0.229` (`MIT OR Apache-2.0`), and `zmij@1.0.23` (`MIT`) graph.
- **Execution and data behavior:** Elevated build-tool scope because the crate
  and its build script execute on developer and CI machines. The reviewed build
  script reads Cargo target environment values and emits compiler
  configuration; it performs no network access or artifact download. The
  generator accepts committed contract files and synthetic fixtures, writes
  deterministic source, and has no telemetry, remote endpoint, permission,
  credential, or user-data behavior.
- **License and provenance evidence:** The exact package manifest identifies
  the canonical `serde-rs/json` repository and declares `MIT OR Apache-2.0`;
  both license texts are present in the resolved crate source. The package is
  resolved through the crates.io index and pinned by
  `apps/server/Cargo.lock`.
- **Platform and distribution impact:** Developer and CI generation only. The
  crate and generator are not linked into Swift or Kotlin applications and are
  not required by ordinary Xcode or Gradle builds. Committed generated output
  contains first-party templates and contract-derived declarations, not copied
  `serde_json` source.
- **Verification and controls:** Generation uses `cargo --locked --offline`,
  rejects unsupported schema vocabulary and nonlocal references, runs only on
  synthetic contract evidence, compiles both language outputs with warnings as
  errors, and checks deterministic output and forbidden behavior markers. A
  RustSec scan refreshed on 2026-08-06 found no advisory or informational
  warning in the locked workspace graph; updates and release reviews must scan
  again rather than treating this result as permanent.
- **Update and removal triggers:** Any `serde_json` version, feature, source,
  checksum, build-script, or resolved-graph change requires the normal ADR 0025
  update review. Removal of the generator also removes this purpose approval;
  broader existing workspace uses remain governed by their retrospective
  review.

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

## Completed Mobile Contract Generator Spike

### quicktype-core

- **Status:** The exact disposable spike was owner-approved and completed on
  2026-08-06. Rejected for repository, CI, build, generated-source, or product
  adoption. The package was never added to this repository or a distributed
  artifact.
- **Category and risk:** Elevated development/build tool. The package executes
  JavaScript that parses canonical schemas and emits source code, includes
  optional file/URL-loading APIs, and may generate language-runtime imports.
  Generated output therefore requires both semantic and supply-chain review.
- **Purpose and alternatives:** Evaluate whether the accepted ADR 0016 workflow
  can generate data-only Swift and Kotlin transport models from the canonical
  JSON Schema without weakening discriminators, absent/null semantics,
  additive-field compatibility, or privacy boundaries. The complete
  `quicktype@26.0.0` CLI was rejected for this spike because a lock-only
  resolution produced 107 packages and included unused GraphQL and TypeScript
  input stacks, `typescript-json-schema`, `ts-node`, and `vm2`. OpenAPI
  Generator's published Kotlin limitations overlap the contract. A narrowly
  scoped first-party generator and manual DTO maintenance remain alternatives
  after this spike's failure.
- **Canonical source and publisher:** npm package `quicktype-core`, described as
  the quicktype engine as a library and maintained by the quicktype project;
  canonical repository
  [glideapps/quicktype](https://github.com/glideapps/quicktype). npm lists David
  Siegel (`dvdsgl`) and Mark Probst (`mark.probst`) as maintainers.
- **Package coordinates and exact version:** Disposable npm development tool
  `quicktype-core@26.0.0`, exact version only. Published 2026-07-20. It was the
  current npm release as of 2026-08-06. The package declares Node.js 20 or later;
  the upstream release notes require Node.js 20.19 or later, which is the
  stricter spike baseline.
- **Platforms and artifacts:** The spike ran only in a disposable local Node
  workspace on the owner's development Mac. It was outside ordinary
  Xcode and Gradle builds. Neither the package nor its transitive graph may
  enter the Rust server, browser clients, native applications, Stage package,
  production service, or distributed product. No generated output was
  committed. CI use or permanent repository adoption requires a new owner
  decision.
- **Provenance, signing, and integrity evidence:** npm registry integrity
  `sha512-tLSe2RkSj7c7ocTc+QMuQDGgEetGhZvKXLv1vNwpAQX2x8oOGYU9KSgJdIP9Qvy5hm47S2k3ZAX1LQAdS75JaA==`;
  SHA-1 `48dc480a67527f3eed8e58e17b2781218dcd0d6d`; independently
  calculated SHA-256
  `7362b32edcfb7817b465839503da6031545904f0c87437fcb3ba6d24dee543ec`
  and SHA-512
  `b4b49ed919128fb73ba1c4dcf9032e4031a011eb46859bca5cbbf5bcdc290105f6c7ca0e19853d2928097483fd42fcb9866e3b4b69376405f52d001d4bbe4968`.
  npm publishes a registry signature with key ID
  `SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U` and SLSA provenance.
  Package git head `408d4ff753d8af809a07edc40cf2a15266e01810` is the
  GitHub-verified `v26.0.0` release commit.
- **Direct and material transitive components:** A scripts-disabled lock-only
  resolution on 2026-08-06 produced 29 packages total, including the direct
  package. Exact Apache-2.0 packages were `quicktype-core@26.0.0` and
  `collection-utils@1.0.1`; BSD-3-Clause was `ieee754@1.2.1`; ISC was
  `yaml@2.9.0`. Exact MIT packages were
  `@glideapps/ts-necessities@2.2.3`, `@types/node@26.1.2`,
  `@types/readable-stream@4.0.10`, `@types/urijs@1.19.26`,
  `abort-controller@3.0.0`, `base64-js@1.5.1`,
  `browser-or-node@3.0.0`, `buffer@6.0.3`,
  `event-target-shim@5.0.1`, `events@3.3.0`, `is-url@1.2.4`,
  `lodash@4.18.1`, `pako@0.2.9`, `pluralize@8.0.0`,
  `process@0.11.10`, `readable-stream@4.5.2`, `safe-buffer@5.1.2`,
  `safe-buffer@5.2.1`, `string_decoder@1.3.0`, `tiny-inflate@1.0.3`,
  `undici-types@8.3.0`, `unicode-properties@1.4.1`,
  `unicode-trie@2.0.0`, `urijs@1.19.11`, and `wordwrap@1.0.0`.
  The published core artifact also retains an adapted Ajv date-time routine's
  MIT notice and a Mersenne Twister BSD-style notice in source comments.
- **Enabled features, build scripts, native code, and endpoints:** Installation
  used an exact lock and `npm ci --ignore-scripts`. The resolved graph
  declared no install scripts, native-platform selectors, deprecated entries,
  or non-registry artifact hosts; every entry had an integrity value. The
  package publishes prebuilt CommonJS and ESM JavaScript and declares only its
  own source-build scripts, which the spike did not invoke. A small first-party
  wrapper imported `quicktype`, `InputData`, and `JSONSchemaInput` only. It did
  not instantiate `FetchingJSONSchemaStore`, use URL inputs, enable debug
  logging, or permit non-fragment `$ref` values. Inputs were supplied as local
  in-memory strings. Swift and Kotlin were the only render targets. Kotlin's
  Jackson default was not approved; plain-types and serializer-bearing outputs
  were compared without adding any generated runtime dependency.
- **License, copyright, patent, attribution, and redistribution evidence:** The
  canonical project and package metadata identify Apache-2.0, including its
  express patent grant and notice obligations. The published
  `quicktype-core@26.0.0` tarball does not contain a standalone `LICENSE` or
  `NOTICE` file, so the canonical tag's license must be retained as review
  evidence rather than inferred from the archive alone. All resolved package
  metadata identifies Apache-2.0, MIT, BSD-3-Clause, or ISC; exact copyright and
  notice texts still require release reconciliation if any tool code is ever
  redistributed. The project's
  [FAQ](https://github.com/glideapps/quicktype/blob/v26.0.0/FAQ.md#am-i-allowed-to-use-the-generated-code-in-my-software)
  states that generated code has no intellectual-property restrictions. The
  spike does not change Guilty Party's proprietary license.
- **Data, purpose, recipients, retention, deletion, and consent:** Input is
  limited to committed Guilty Party schemas and synthetic contract fixtures.
  Processing and temporary generated output remained local on the owner's Mac.
  No account, participant, gameplay, credential, private communication,
  unpublished creator content, or production data is supplied. No content is
  uploaded or shared. Disposable output and package state were deleted after
  evidence was recorded.
- **Permissions, entitlements, sensitive APIs, and background behavior:** None.
  The spike receives no secret, mobile permission, entitlement, persistent
  identifier, background mode, production authority, or network credential.
  Filesystem access is limited to its disposable workspace and committed
  synthetic contract inputs.
- **Apple privacy manifest, signature, required-reason, and label impact:** Not
  applicable to the completed spike because the tool was not linked, bundled, or
  executed in the iOS/iPadOS app. Generated Swift must be reviewed to confirm it
  uses only approved platform APIs before adoption.
- **Android manifest, SDK Index, Data Safety, and policy impact:** Not applicable
  to the completed spike because the tool was not linked, bundled, or executed in
  the Android app. Generated Kotlin must not silently introduce Jackson,
  Klaxon, KotlinX, permissions, or another runtime dependency.
- **Security advisories, update source, and support status:** The repository was
  active and unarchived, and `26.0.0` was current, on 2026-08-06. GitHub's
  repository advisory endpoint reported no published project security
  advisories, and npm audit reported zero known vulnerabilities in the isolated
  29-package lock. These are point-in-time signals, not a warranty. Functional
  risk remains: upstream issue 2310 reports incorrect `oneOf` handling inside
  array items, and issue 2858 reports Swift 6 strict-`Sendable` failures for
  open-value helpers. The release documents selected Draft 2020-12 features but
  does not claim complete Draft 2020-12 conformance. Updates come only from npm
  after renewed intake; no automatic update may merge.
- **Test, rollback, and complete-removal result:** The spike emitted four output
  configurations and regenerated each byte-for-byte identically in five fresh
  processes. Its network and console traps remained untouched. Swift 5 decoded
  all 12 expected-valid fixtures, tolerated the additive field, and rejected an
  unknown message type. It incorrectly accepted 3 of 6 negative fixtures, a
  missing required-nullable value, an incomplete cast vote, and a discriminator
  paired with the wrong payload. Required-nullable and optional-absent values
  collapsed to the same representation, and discriminated unions became merged
  structs with optional members. Ordinary and Sendable output failed the
  installed Swift 6 compiler. Plain Kotlin omitted serialization metadata and
  Jackson Kotlin required an unapproved runtime; an accessible Kotlin compiler
  was unavailable, and no replacement was downloaded. These failures ended the
  spike without adoption. The complete evidence is in the
  [mobile contract generator evaluation](../architecture/mobile-contract-generator-evaluation.md#executable-compatibility-spike).
  Disposable package state, wrapper, generated output, compiler cache, and
  task-specific npm cache were removed after evidence was recorded; canonical
  contracts and fixtures remain unchanged.
- **Required notices and SBOM evidence:** This record retains the registry
  integrity and provenance identifiers, resolved component list, license
  classifications, and bundled-source notice findings. The disposable lock was
  removed with the spike. Any later adoption proposal must resolve and review a
  fresh exact lock, include the development tool in the development SBOM, and
  reconcile committed generated output separately. It must be absent from
  product SBOMs and release artifacts unless a new distribution review expressly
  approves it.
- **Reviewer and explicit owner decision:** Research prepared by an AI agent and
  reviewed by the project owner. On 2026-08-06 the owner explicitly approved
  `quicktype-core@26.0.0` for one disposable, local, synthetic-data Swift/Kotlin
  compatibility spike under this record's controls. The measured failures reject
  the package for adoption; the agent does not convert the limited execution
  approval into broader authority.
- **Approval date, scope, review triggers, and exception expiry:** Approved
  2026-08-06 only for the single completed spike. That scope is exhausted. It
  did not approve permanent repository adoption, CI, committed generated code,
  a Kotlin serialization runtime, the full quicktype CLI, private or production
  data, or distribution. Any further execution, version, transitive, script,
  license, provenance, maintainer, network, input-data, generated-runtime, CI,
  build, distribution, or repository use requires renewed owner review. No
  exception was requested or granted.

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

## Approved CI Runtime Selector

### actions/setup-node 7.0.0

- **Status and scope:** Approved by the owner on 2026-08-06 for GitHub-hosted
  CI only, to select Node.js 22 before contract, remote-service, and
  artifact-only Wrangler checks. It receives no Cloudflare credential or
  deployment authority and is not part of a product artifact.
- **Canonical source and pin:** GitHub's
  [actions/setup-node](https://github.com/actions/setup-node) repository,
  release `v7.0.0`, pinned in the workflow to commit
  `820762786026740c76f36085b0efc47a31fe5020` rather than a movable tag.
- **License and execution:** MIT licensed. The JavaScript action runs on the
  GitHub-hosted runner and selects an exact-major Node.js toolchain from the
  runner cache or the action's documented Node distribution sources. It is not
  copied into the Worker, server, browser, webOS, or mobile artifacts.
- **Data and permissions:** It receives only public repository workflow
  context and the requested Node version. The workflow retains read-only
  repository permission, enables no npm cache through the action, and exposes
  no gameplay, participant, scenario, account, OAuth, API-token, or payment
  data.
- **Review and removal:** A version, commit, source, license, download,
  permission, telemetry, caching, or execution-scope change requires renewed
  review. Removal deletes the setup step and this inventory entry; CI must then
  provide another explicitly verified Node.js 22-or-later runtime.

## Remote Deployment Tool — Temporary Development Exception

### Wrangler 4.119.0

- **Status:** Exact `wrangler@4.119.0` plus exact `undici@7.29.0` override
  approved by the owner on 2026-08-06 for internal development builds and the
  first synthetic development deployment only. Production deployment,
  product bundling, redistribution, and Cloudflare CI credentials are not
  approved.
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
- **Package coordinates and exact approved exception:** `wrangler@4.119.0`,
  published 2026-08-05, requiring Node.js 22 or later, with root npm override
  `undici@7.29.0`. Both are pinned in `package.json` and `package-lock.json`.
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
  optional native packages. Repository adoption proved that
  `npm ci --ignore-scripts` retains a working Wrangler dry run on the evaluated
  macOS host and GitHub-hosted Linux runner by using the applicable locked
  prebuilt packages. Install scripts remain disabled. Any fallback download,
  changed native package, or platform where the locked prebuilt tool does not
  work requires renewed review rather than enabling scripts automatically.
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
  The separately reviewed exact override passed source, audit, bundle, and local
  runtime checks and is temporarily admitted for the narrow development scope.
  It must be removed or re-reviewed when Cloudflare publishes a suitable patched
  graph; production deployment and rollback approval remain closed.
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
  `undici@7.29.0` override spike on 2026-08-06 and subsequently approved the
  exact locked combination for repository adoption, owner browser
  authentication, and the first synthetic development deployment. Production,
  product redistribution, version changes, and CI Cloudflare authority remain
  unapproved.
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
