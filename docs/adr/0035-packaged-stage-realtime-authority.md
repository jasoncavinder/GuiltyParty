# ADR 0035: Packaged Stage Realtime Authority

## Status

Accepted

## Date

2026-08-07

---

# Context

The Remote Friends MVP originally delivered browser Stage authority through a
Secure, HttpOnly, SameSite=Strict cookie. The project owner selected a fully
packaged LG webOS Stage instead of a hosted web app. LG documents that packaged
webOS applications run from a file scheme and do not support cookies. The
standard browser WebSocket constructor also cannot attach an Authorization
header, while Guilty Party forbids credentials in request URLs and gameplay
envelopes.

The Stage still needs to reconnect after network interruption and Durable
Object hibernation without persistently storing a reusable credential. The
transport must not weaken Host origin binding, turn the opaque file-scheme
Origin value into authority, or expose Stage authority to other participants.

# Decision

## Primary Packaged Stage Authority

A packaged Stage joins through the existing invitation operation with:

- `kind: stage`;
- endpoint platform `webos`;
- the short-lived pairing proof in the HTTPS Authorization header; and
- the opaque file-scheme Origin serialization `null`.

The gateway accepts that Origin value only for packaged webOS Stage pairing and
realtime-ticket operations. It is a transport characteristic, not identity or
authority. The pairing proof remains the admission secret.

Successful pairing returns endpoint-scoped bearer authority in a non-cacheable
response. The packaged Stage keeps this primary authority in process memory,
never a file, URL, local storage, IndexedDB, application log, or gameplay
envelope. Browser Host authority remains an exact-HTTPS-origin HttpOnly cookie.
Hosted browser Stage and native iOS transports remain supported independently.

## Realtime Connect Ticket

The packaged Stage cannot place its primary bearer in a WebSocket Authorization
header. Before each connection it therefore calls
`POST /api/v1/websocket-tickets` over HTTPS with its primary bearer and the
opaque `null` Origin.

The gateway:

1. verifies that the bearer is current Stage authority with no browser origin;
2. creates a separately prefixed and signed ticket that carries the session,
   endpoint, audience, authority generation, primary-authority expiry,
   ticket expiry, and a random ticket identifier;
3. limits the ticket lifetime to 30 seconds and never beyond primary authority;
4. registers only the ticket digest with the session Durable Object; and
5. returns the complete ticket as a credential-bearing secondary WebSocket
   subprotocol value in a non-cacheable response.

The Stage opens `/ws/v1` offering both `guiltyparty.control.v1` and the returned
ticket subprotocol. The ticket never appears in the URL or an application
message. The Worker verifies its signature and forwards only authenticated
context plus its digest. The Durable Object atomically revalidates endpoint
authority and consumes the registered digest before accepting the socket.
Replays, expired tickets, tickets for revoked or stale-generation endpoints,
and tickets for any non-Stage audience fail closed. The upgrade response selects
only `guiltyparty.control.v1`, so it does not echo the credential.

A reconnect mints a new ticket from the in-memory primary bearer. Restarting the
packaged app intentionally loses that bearer and requires pairing again for the
friends MVP.

## Bounded Storage

Ticket rows contain a digest, endpoint identifier, generation, expiry, and
consumption timestamp. They contain no raw credential or scenario content.
Expired and consumed rows are removed during registration, and each endpoint is
bounded to its newest 16 registered tickets. Session expiry, endpoint
revocation, or session end makes every remaining ticket unusable through the
ordinary authority check.

# Consequences

- A fully packaged webOS Stage can use the same Cloudflare control plane without
  cookie support or a native networking service.
- The primary bearer is exposed to packaged Stage JavaScript memory, so Stage
  package integrity and physical-device testing remain release gates.
- The `null` Origin can be produced by other opaque-origin documents and cannot
  authenticate the app. Pairing and endpoint bearer authority therefore remain
  mandatory and server-enforced.
- A ticket may be visible in short-lived client or provider network debugging
  surfaces as a request header. Its separate prefix, 30-second lifetime,
  single-use consumption, disabled persisted observability, and logging rules
  bound that exposure.
- Physical webOS testing must confirm the exact Origin serialization, CORS
  preflight behavior, subprotocol length support, reconnect behavior, and
  memory clearing on app termination before named friends join.

# Alternatives Considered

## Keep the Stage hosted

This preserves cookie authority but conflicts with the approved fully packaged
Stage and makes the Stage depend on fetching its application at launch.

## Put the primary bearer in the WebSocket URL

Rejected because URLs are routinely retained in histories, diagnostics,
proxies, and provider logs, and project policy explicitly forbids credential
URLs.

## Offer the long-lived primary bearer directly as a subprotocol

Rejected because each handshake would expose the reusable session-lifetime
credential. A short-lived, registered, single-use derivative has a materially
smaller replay window.

## Authenticate in the first gameplay message

Rejected because it would require accepting and routing an unauthenticated
socket, move credentials into the application envelope, and complicate the
per-session Durable Object boundary.

## Add a packaged native service solely for networking

Deferred because it adds a second webOS runtime and permission surface before
physical evidence shows that the standard packaged web APIs are insufficient.

# References

- [LG webOS Web API and Web Engine](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine)
- [LG webOS CORS guidance](https://webostv.developer.lge.com/faq/how-to-solve-the-problem-if-cors-occurs)
- [Cloudflare Durable Object WebSocket hibernation](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [ADR 0007: Control-Plane Transport Security](0007-control-plane-transport-security.md)
- [ADR 0009: Connection Resumption Policy](0009-connection-resumption-policy.md)
- [ADR 0033: Cloudflare-Native Remote Services](0033-cloudflare-remote-services.md)
