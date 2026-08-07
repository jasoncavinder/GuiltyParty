# ADR 0036: Packaged webOS Stage pairing

- Status: Accepted
- Date: 2026-08-07

## Context

The MVP needs a real LG webOS Stage. The television browser is too constrained
to be the product surface, and a public invitation proof must not be typed into
or embedded in a URL. The available physical baseline is an LG
`65NANO85UNA` on webOS TV `5.6.2-21`, supplemented by webOS 6 and 22–26
simulators. ADR 0035 defines the packaged Stage's memory-only bearer and
single-use realtime-ticket transport, but its current direct invitation join is
not the desired user-facing admission flow.

## Decision

Build the Stage later as a packaged, sideloadable webOS application whose assets
run locally on the television. Before product implementation, run a bounded
transport spike against the physical television and simulators to verify ADR
0035's HTTPS, WSS, Origin, subprotocol, lifecycle, and certificate assumptions.

Stage admission will use a 120-second device-code flow:

1. The Stage obtains a temporary pairing transaction and displays a short code.
2. An authenticated Host enters or confirms that code and explicitly approves
   the Stage for the current session.
3. The Stage polls using a separate high-entropy transaction secret held only in
   memory.
4. On approval, the server issues one Stage authority and consumes the
   transaction.

The displayed code locates a pending transaction; it never grants authority by
itself. Transactions are one-time, rate-limited, expire automatically, reveal no
session secret, and are deleted after consumption or expiry. The coordinator is
an ephemeral service boundary separate from a live session Durable Object.

## Consequences

- The television browser is not an MVP Stage fallback.
- Physical-device evidence must validate ADR 0035 before the packaged app is
  treated as ready for friends testing.
- Implementing the pairing coordinator is a separate reviewed service slice
  because it changes Durable Object topology.
- The packaged app remains a public-display endpoint and receives only
  server-authorized Stage projections.

## Alternatives considered

- **Use the television browser:** rejected because it is feature-limited and is
  not the intended MVP surface.
- **Put a session invitation in a URL:** rejected because URLs leak through
  history, logs, referrers, and screenshots.
- **Let the short code grant access:** rejected because observation or guessing
  would become authority.

## References

- [ADR 0035: Packaged Stage realtime authority](0035-packaged-stage-realtime-authority.md)
