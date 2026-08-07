# Generated Mobile Contracts

This directory contains committed, derived Swift and Kotlin control-plane
transport models. The canonical source remains the versioned JSON Schema under
`contracts/control-plane/`; generated files are never edited by hand.

From the repository root:

```sh
make generate-mobile-contracts
make check-mobile-contracts
```

Generation is deterministic and offline after the repository's locked tools
have been hydrated. Both language outputs are generated and verified in a
temporary directory before the generation command replaces either committed
file. The check command compares temporary output without modifying the
worktree.

The outputs contain transport representation and schema-derived validation
only. They do not contain networking, credentials, authorization, secrecy
policy, logging, persistence, scenario logic, or application models.

See the [generation runbook](../../docs/platforms/mobile-contract-generation.md)
and [ADR 0034](../../docs/adr/0034-first-party-mobile-contract-generator.md).
