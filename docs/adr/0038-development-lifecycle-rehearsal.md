# ADR 0038: Development Lifecycle Rehearsal Surface

## Status

Proposed

## Date

2026-08-07

---

# Context

The Remote Friends MVP keeps ordinary sessions active for at most four hours
and retains ended or expired active-session data for no more than seven days.
Those defaults are appropriate for a friends test but make the Durable Object
alarm, expiry, and deletion path impractical to verify before each candidate
deployment. Unit simulation alone does not prove that Cloudflare delivered the
deployed alarm or that the deployed Durable Object removed its session rows.

Changing the ordinary lifetimes globally for a rehearsal would also affect any
concurrent game. Accepting caller-selected lifetimes would create an
unnecessarily broad configuration surface. The verification mechanism must be
operator-only, development-only, fixed, synthetic, and separate from client
gameplay.

# Decision

The friends-development Worker exposes
`POST /api/v1/rehearsals/lifecycle/sessions`. It accepts the canonical session
creation body and applies every ordinary creation boundary: exact Host origin,
operator bootstrap proof, request validation, edge admission limiting, opaque
session identifiers, Host cookie authority, and safe responses.

The route uses code-fixed rehearsal windows:

- pairing invitation: 15 seconds
- active session: 45 seconds
- post-expiry active-storage retention: 30 seconds

Callers cannot choose or extend those values. Ordinary `/api/v1/sessions`
continues to use its 15-minute invitation, four-hour active duration, and
seven-day retention. The route is available only while the exact
`friends-mvp-development` profile is enabled; other profiles already fail
stateful entry points closed. It is documented in OpenAPI for review but is not
advertised as a client capability or added to generated client models.

The first-party `rehearse-remote-lifecycle` tool uses synthetic state and only
Node built-ins. It verifies invitation rotation, closure and expiry; WebSocket
ticket consumption, tamper, expiry and revocation; an idle hibernatable
connection and journal-derived projection after reactivation; a fresh-ticket
reconnect; session expiry; and eventual transition from `410` retained state
to `404` after the deployed alarm deletes session data. The final `404` probe
may reactivate an empty Durable Object and recreate its schema, but no session,
authority, participant, ticket, journal, or idempotency row is recreated.

# Consequences

- Deployed expiry and deletion can be rehearsed in minutes without weakening
  normal gameplay lifetimes or adding a third-party test dependency.
- Possession of the operator bootstrap proof remains required; named guests
  and paired endpoints cannot create rehearsal sessions.
- The development Worker gains one deliberately non-product HTTP operation
  that must remain documented, rate-limited, and fail closed outside the
  friends-development profile.
- A successful probe proves deletion from active session storage. It does not
  alter or shorten Cloudflare's separately documented provider-controlled
  point-in-time recovery history.

# Alternatives Considered

## Temporarily change global duration variables

Rejected because the change would apply to unrelated sessions and make a
deployment's semantics depend on mutable operator timing.

## Accept arbitrary lifecycle values in the public creation request

Rejected because clients do not need this authority and caller-selected
retention would expand both validation and abuse risk.

## Wait four hours and seven days for every candidate

Rejected because it is too slow for repeatable release evidence and would
encourage skipping the alarm path.

## Add Cloudflare's Vitest integration immediately

Deferred because it would require a separately reviewed third-party dependency
and would still complement rather than replace deployed alarm evidence.
