# Control-Plane v1 Migration

## Status

Implemented for the Rust prototype server and browser Host and Stage surfaces.
The native iOS Companion remains unimplemented and must prove conformance
before claiming protocol v1 support.

## Purpose

This document maps the local prototype to the accepted v1 contract. The
implemented server/browser slice does not expand the MVP into production
identity, discovery, TLS, or media behavior.

The canonical artifacts are indexed in [contracts/README.md](../../contracts/README.md).

## Pre-Migration Drift

Before this migration, the prototype used:

- `POST /api/join` with no payload protocol version
- `/ws?token=...` with no negotiated application subprotocol
- flat WebSocket messages with only a `type` discriminator
- plain-text HTTP errors
- projections without envelope identifiers or a server sequence
- state-changing commands without an idempotency identifier or primary-
  authority generation

Those shapes predated ADRs 0005 and 0009. They are no longer served by the Rust
prototype and must not be restored as a compatibility path.

## Implemented Migration Slice

The implemented slice provides:

1. The non-private `GET /api/protocol` compatibility response.
2. Joining at `POST /api/v1/join`, requiring protocol `1.0`, returning
   credential-bearing responses with `Cache-Control: no-store`, and using safe
   RFC 9457 errors. Issue distinct session, endpoint, room, and optional
   participant identifiers; accept coarse endpoint capability claims without
   treating them as authority or stable device identity.
3. Realtime control at `/ws/v1`, requiring the
   `guiltyparty.control.v1` WebSocket subprotocol.
4. Canonical v1 envelope decoding and encoding, including unique message and
   correlation identifiers, session and endpoint context, and journal-derived
   server sequence.
5. Bounded server-side command idempotency records and primary-authority
   generation checks consistent with ADR 0009. A retry with identical content
   returns the recorded result; identifier reuse with different content fails.
6. Credentials kept out of application envelopes, logs, fixtures, browser
   storage, and URLs where the selected transport-authentication mechanism
   permits. Synthetic fixture token strings are not credentials.
7. Host, Stage, and iOS setup instructions describing the
   implemented server behavior.
8. Schema conformance, negative, privacy, deterministic replay, and browser
   checks before claiming server/browser v1 compatibility.

The migration should not add account authentication, production pairing,
HTTPS/WSS certificate trust, service discovery, resumption deltas, Android,
media, analytics, or retained private communication. Those remain separate
approved decisions and later slices.

## Contract Semantics to Preserve

- Unknown optional object members are tolerated within major version 1.
- Unknown message discriminators and security-critical enum values fail safely.
- Required nullable members, such as `active_scene`, `outcome`, and
  `character_name`, remain distinct from optional private members. An
  unauthorized `private_objective` or `has_voted` member is omitted, not null.
- Schema validity never grants authority or broadens a projection.
- `server_sequence` reports canonical journal progress; transport message IDs
  and retries do not become scenario events.
- AI suggestions remain advisory and consume only the existing minimized,
  authorized AI projection.

## Completion Gate

The server/browser v1 migration is complete when the implementation passes the
committed fixture manifest with the owner-approved Draft 2020-12 validator, the
Rust protocol, privacy, idempotency, authorization, and replay tests pass, and
the browser surfaces demonstrate the deterministic loop without private-data
leakage. Native-client conformance remains a later gate.

## Verification Evidence

The server/browser slice was verified on 2026-08-06 with:

- the Draft 2020-12 schema and all 18 fixture expectations
- all Rust protocol, authorization, idempotency, projection-privacy, scenario,
  journal-persistence, and deterministic replay tests
- a live HTTP/WebSocket smoke session covering compatibility, removal of the
  old join route, safe Problem Details, distinct identifiers, required
  subprotocol negotiation, accepted command results, identical retries,
  conflicting idempotency reuse, stale authority, forbidden Stage mutation,
  server sequencing, and replay after restart
- the browser Host and Stage at `localhost`, covering compatibility checks,
  joining, character assignment, scene advancement, public and private clue
  filtering, sequenced realtime refreshes, and graceful local-AI failure with
  no browser console errors

Physical LG webOS, LAN-device, private Companion, and full vote/outcome checks
remain part of later MVP acceptance work and are not implied by this evidence.
