# ADR 0039: Server Application Directory

## Status

Accepted

## Date

2026-08-08

---

# Context

Guilty Party groups first-party application implementations under `apps/` by
surface and platform. The native Rust server workspace nevertheless remained
at the repository root under `server/`, while the Cloudflare Worker and Durable
Object implementation lived under `services/remote/`. The empty `apps/server/`
directory was described as a future local-server reservation.

Those three locations obscured ownership of the backend application and made
the server the only implemented surface outside the application taxonomy. The
native workspace and Cloudflare adapter have distinct runtimes, but both are
implementations of the same server-side control-plane and deterministic-engine
boundary.

# Decision

`apps/server/` is the canonical repository home for Guilty Party backend code.

- The Rust Cargo workspace, its first-party crates, and committed scenario
  fixtures live directly under `apps/server/`.
- The Cloudflare Worker, Durable Objects, tests, and Wrangler configuration live
  under `apps/server/cloudflare/`.
- Cross-application contracts remain under repository-level `contracts/`.
- Cross-application build and rehearsal scripts remain under repository-level
  `tooling/`.
- CI, developer commands, dependency records, and deployment documentation use
  the canonical application paths.

The relocation does not combine the native Axum process with the Cloudflare
runtime. It does not change the control-plane/media-plane split, deterministic
scenario ownership, server-side secrecy enforcement, Cloudflare resource
names, custom domains, bindings, secrets, storage, or deployment authority.

# Consequences

- All backend implementation can be found through one application boundary.
- The Rust engine remains directly reusable by the native server and the
  Cloudflare WebAssembly adapter without creating a second scenario engine.
- Relative imports, Cargo commands, Wrangler configuration paths, CI path
  filters, and documentation must include the additional `apps/` directory.
- Deployment artifacts can differ in source-map paths after the move even when
  runtime behavior is unchanged, so the next promotion must reproduce and
  record its bundle digest normally.
- Future backend adapters belong beneath `apps/server/` unless a separate ADR
  establishes a genuinely cross-application package or service boundary.

# Alternatives Considered

## Keep `server/` and `services/remote/`

Rejected because it preserves two competing backend homes and leaves the
implemented server outside the repository's application taxonomy.

## Move only the Cloudflare adapter into `apps/server/`

Rejected because the native workspace would remain a second server application
location and the `apps/server/` name would no longer describe the complete
backend boundary.

## Put the native workspace and Cloudflare adapter in sibling subdirectories

Rejected for now because an extra native directory adds path depth without a
second Cargo workspace. The Cargo workspace is the application root, while
`cloudflare/` is a provider-specific deployment adapter.

## Move the deterministic engine into a new packages directory

Rejected because the repository has no accepted packages taxonomy and the
engine currently belongs to the server application boundary. A future reuse
need can justify that separate change without blocking this correction.
