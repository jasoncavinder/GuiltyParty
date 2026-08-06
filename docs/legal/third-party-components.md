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
