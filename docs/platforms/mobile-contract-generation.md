# Mobile Contract Generation

## Status

The first-party control-plane v1 generator is integrated. Its Swift and Kotlin
outputs are committed under `contracts/generated/control-plane/v1/` and are
attached directly to both native application projects. The Swift output is part
of the iOS/iPadOS target, and the Kotlin output is an Android built-in Kotlin
source directory. Neither application copies or edits the generated file.

## Authority and Scope

`contracts/control-plane/v1/control-plane.schema.json` is the sole model input.
The generated sources are derived transport artifacts, not a source of product,
authorization, privacy, or scenario policy.

The integration uses only the repository's first-party `gp_contract_gen` crate,
Python's standard library, the existing locked Rust graph, and installed native
compilers. It does not install a generator, native runtime, build plugin, or
networking library.

## Commands

Install the repository's already approved development tooling and hydrate the
locked Rust graph before working offline:

```sh
make setup
cargo fetch --locked --manifest-path apps/server/Cargo.toml
```

Regenerate both committed outputs:

```sh
make generate-mobile-contracts
```

Check deterministic generation and fail on drift without changing the
worktree:

```sh
make check-mobile-contracts
```

Both commands first run the canonical structural, privacy, and Draft 2020-12
contract checks. They then build `gp_contract_gen` with
`cargo --locked --offline`, generate each language five times, require
byte-identical output, reject forbidden behavior markers, compile with warnings
as errors, and run all 22 shared and derived compatibility cases. Temporary
source, harness, compiler, and executable artifacts are deleted afterward.

Generation stages both verified files and rollback backups beside their
destinations before using per-file atomic replacement. A validation or compiler
failure leaves the committed outputs untouched. If a later replacement fails,
the command restores any earlier output before returning the error. If that
restoration also fails, the command preserves the original as a hidden backup
beside its destination and reports the recovery path.

## Generated Files

- `contracts/generated/control-plane/v1/swift/ControlPlaneV1.generated.swift`
- `contracts/generated/control-plane/v1/kotlin/ControlPlaneV1.generated.kt`

Each deterministic header records:

- the first-party generator name and crate version;
- protocol major;
- repository-relative canonical source path; and
- canonical source SHA-256 digest.

Headers contain no timestamp, absolute path, machine name, or temporary
directory.

## Local Toolchains

The wrapper discovers:

- `swiftc` from `PATH`, with optional `--swiftc` override;
- Kotlin in Android Studio, standard Homebrew `libexec` locations, or through
  `kotlinc` on `PATH`, with optional `--kotlin-home` override; and
- the Android Studio JBR or `java` on `PATH`, with optional `--java` override.

The current local compatibility evidence is Apple Swift 6.3.3 and Kotlin/JVM
2.3.10. Exact-version assertions are optional locally so a compatible installed
compiler can check unchanged output.

## Continuous Integration

The `mobile-contracts` job runs on GitHub's `macos-26` hosted image and selects
Xcode 26.6. It requires Apple Swift 6.3.3 and Kotlin/JVM 2.4.10 exactly. The
workflow fails visibly when the mutable hosted image changes either compiler,
which forces a reviewed baseline update rather than silently moving it.
GitHub's current installed-software inventory for that image is maintained in
the
[`actions/runner-images` repository](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-arm64-Readme.md).

CI hydrates the existing locked Rust crates before invoking the offline check.
The check itself performs no package installation, schema resolution, or
network request.

## Failure Handling

If drift is reported, inspect the schema, fixtures, generator, and both output
diffs together. Regenerate only through the root command. Do not hand-edit a
generated file, weaken the schema, or bypass compiler and fixture checks.

If a new schema feature falls outside the closed profile, stop and follow ADR
0034's schema-growth decision process before changing the generator.
