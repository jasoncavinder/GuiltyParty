# Control-Plane v1 Migration

## Purpose

This document maps the current local prototype to the accepted v1 contract. It
does not claim that v1 is implemented and does not expand the MVP into
production identity, discovery, TLS, or media behavior.

The canonical artifacts are indexed in [contracts/README.md](../../contracts/README.md).

## Current Drift

The prototype currently uses:

- `POST /api/join` with no payload protocol version
- `/ws?token=...` with no negotiated application subprotocol
- flat WebSocket messages with only a `type` discriminator
- plain-text HTTP errors
- projections without envelope identifiers or a server sequence
- state-changing commands without an idempotency identifier or primary-
  authority generation

Those shapes predate ADRs 0005 and 0009. They are an internal prototype
contract, not protocol v1. Native clients must not freeze or generate models
from them.

## Required Migration Slice

The next implementation slice should update the Rust server and both browser
clients together:

1. Add the non-private `GET /api/protocol` compatibility response.
2. Move joining to `POST /api/v1/join`, require protocol `1.0`, return
   credential-bearing responses with `Cache-Control: no-store`, and use safe
   RFC 9457 errors. Issue distinct session, endpoint, room, and optional
   participant identifiers; accept coarse endpoint capability claims without
   treating them as authority or stable device identity.
3. Move realtime control to `/ws/v1` and require the
   `guiltyparty.control.v1` WebSocket subprotocol.
4. Decode and encode the canonical v1 envelopes, including unique message and
   correlation identifiers, session and endpoint context, and journal-derived
   server sequence.
5. Add bounded server-side command idempotency records and primary-authority
   generation checks consistent with ADR 0009. A retry with identical content
   returns the recorded result; identifier reuse with different content fails.
6. Keep credentials out of application envelopes, logs, fixtures, browser
   storage, and URLs where the selected transport-authentication mechanism
   permits. Synthetic fixture token strings are not credentials.
7. Update the Host, Stage, and iOS setup instructions only after the server
   behavior exists.
8. Run schema conformance, negative, privacy, deterministic replay, and browser
   LAN checks before claiming v1 compatibility.

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

The v1 migration is complete only when the implementation passes the committed
fixture manifest with an owner-approved Draft 2020-12 validator, the current
Rust privacy and replay tests still pass, and the browser surfaces demonstrate
the full deterministic loop without private-data leakage.
