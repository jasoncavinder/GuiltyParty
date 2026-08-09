# Server Application

This directory is the canonical repository home for Guilty Party backend code.
It keeps the native Rust workspace, deterministic scenario engine, committed
scenario fixtures, and Cloudflare deployment adapter inside one application
boundary without combining their runtime responsibilities.

## Layout

- `Cargo.toml`, `crates/`, and `scenarios/` contain the native server workspace,
  first-party shared engine, and scenario fixtures.
- `cloudflare/` contains the Worker gateway, Durable Objects, Wrangler
  configuration, and provider-neutral Node tests for the official remote
  control plane.

Canonical cross-application contracts remain under the repository-level
`contracts/` directory. Root `tooling/` scripts orchestrate builds and checks
across the server and client applications.

The directory move recorded by
[ADR 0039](../../docs/adr/0039-server-application-directory.md) changes source
ownership and developer paths only. It does not change Cloudflare resource
names, deployed routes, authorization boundaries, storage, or scenario truth.

Run the supported checks from the repository root:

```sh
make test
make check-cloudflare
```
