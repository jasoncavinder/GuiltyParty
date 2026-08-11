# webOS packaged Stage transport spike

## Status

Partially verified on 2026-08-07 HST. The product package installs, launches,
creates a 120-second transaction, displays its non-secret pairing code, and
polls context-free pending state on the physical webOS TV 5.6 target. The
protected deployed-service rehearsal verifies Host-approved bearer,
single-use ticket, and WebSocket upgrade boundaries; physical-TV projection and
lifecycle verification remains pending interactive Host approval. webOS TV 6.0
simulator transport also reaches pending. webOS TV 22–24 and 26 simulators fail
closed because their request transport does not serialize the packaged origin
as required by the deployed gateway. The webOS TV 25 simulator launched but
became unresponsive before a trustworthy transport result was visible.

This record does not represent simulator output as physical-device evidence.
No credential, polling secret, bearer, WebSocket ticket, pairing proof, private
projection, hardware identifier, or unpublished scenario content was recorded.

## Baseline

This section records the original transport-evidence build and is intentionally
historical. The current presentation-media candidate is `0.2.1` / build `4`;
it preserves this transport boundary but requires the separate simulator and
physical gates in the [current build runbook](webos-stage-build-and-test.md).

- Source branch: `feature/webos-stage-mvp`
- Stage application: `com.guiltyparty.stage`, version `0.1.1`
- Client build: `stage_webos` / `0.1.1` / build `2`
- webOS CLI: `@webos-tools/cli` / `ares` `3.2.5`
- API: `https://api.test.guiltyparty.app`
- Realtime endpoint: `wss://api.test.guiltyparty.app/ws/v1`
- Physical target supplied by the owner: LG `65NANO85UNA`, webOS TV
  `5.6.2-21`
- Installed simulators:
  - `webOS_TV_6.0_Simulator_1.4.1`
  - `webOS_TV_22_Simulator_1.4.1`
  - `webOS_TV_23_Simulator_1.4.1`
  - `webOS_TV_24_Simulator_1.4.1`
  - `webOS_TV_25_Simulator_1.4.4`
  - `webOS_TV_26_Simulator_1.5.0`

The ignored bounded probe packaged successfully as
`com.guiltyparty.stage.spike_0.0.1_all.ipk`. The product packages successfully
as `.tmp/webos-packages/com.guiltyparty.stage_0.1.1_all.ipk`; the physically
installed build has SHA-256
`bcb51e9620cb844497378d71c999c49ecd68369c18bdbc8a6d23ff327addd842`.

## Origin and CORS result

The physical webOS TV 5.6 runtime reports both shell and child DOM origins as
`file://com.guiltyparty.stage-webos`, even though the child iframe omits
`allow-same-origin`. Its network stack nevertheless serializes the sandboxed
child's HTTP Origin as `null`. A redacted inspector trace limited to transaction
creation verified:

- `POST /api/v1/stage-pairings` carried `Origin: null` and returned `201`;
- the response used HTTP/2 and TLS 1.3;
- the displayed transaction had 117 seconds remaining when first inspected,
  consistent with the required 120-second creation lifetime;
- the redemption poll carried `Origin: null` and the `StagePairing` scheme;
- the pending poll returned `202`; and
- its only response fields were `protocol_version`, `status`,
  `expires_at_unix_ms`, and `retry_after_ms`.

The first physical package attempt also exposed an older-runtime packaging
constraint: local external stylesheets and scripts are rejected inside the
sandbox, and the app-scoped `file://` shell makes CSP `'self'` unreliable for
those files. The package build therefore inlines only the repository's
first-party CSS and JavaScript into the two packaged documents. Source remains
split under `apps/tv/lg-webos` for review and tests; the earlier browser-only
Stage scaffold has been superseded. The networking child remains sandboxed
without `allow-same-origin`; its generated CSP has `default-src 'none'`, permits inline
first-party style/script required by the runtime, and limits connections to the
exact HTTPS API and WSS endpoint. No credential or private data is embedded.

On webOS TV 6.0, the same local iframe sandboxed with only `allow-scripts`
creates the opaque networking boundary required by ADR 0035:

- `POST /api/v1/stage-pairings` returned `201`;
- the observed transaction lifetime was 119 seconds at first render;
- the custom `Authorization: StagePairing` poll returned `202`;
- the pending response contained only `protocol_version`, `status`,
  `expires_at_unix_ms`, and `retry_after_ms`; and
- the document cookie API rejected the operation.

The physical inspector trace directly confirms `Origin: null`. The `201` and
authenticated `202` also confirm that the deployed CORS/gateway policy accepts
that narrow transport; the route otherwise returns
`packaged_stage_transport_required`. The application does not read or use CORS
headers as authority.

webOS TV 22, 23, 24, and 26 simulator requests returned safe HTTP `403`
responses at transaction creation. A bounded webOS 26 comparison tried:

- sandboxed local-file fetch;
- sandboxed `data:`-document fetch; and
- sandboxed `data:`-document `XMLHttpRequest`.

The data document reported a DOM origin of `null` and rejected cookies, but
both standard networking APIs received
`packaged_stage_transport_required`. The simulator therefore applies a
different request Origin or another disallowed packaged-transport header at
its network layer. Authentication was not weakened, no origin was added to the
gateway allowlist, and no native service was introduced. The physical webOS
5.6 result is the release-relevant decision point.

## TLS, authorization, and cookie result

- Physical HTTPS completed over HTTP/2 and TLS 1.3 without a warning or
  plaintext fallback. HTTPS certificate validation against the Cloudflare test
  hostname also completed without a warning on every simulator that returned
  an HTTP response.
- The physical runtime accepted the custom Stage-pairing Authorization scheme
  and returned the expected context-free `202` pending state.
- webOS 6 accepted the custom Stage-pairing Authorization header and exposed
  the expected `202` status.
- Packaged cookie creation was unavailable or rejected in the verified opaque
  contexts. The Stage does not request, create, inspect, or persist a gameplay
  cookie.
- The app uses only HTTPS/WSS and presents an honest terminal state on the
  simulator `403`; it does not retry with a different origin or downgrade.

## WebSocket and lifecycle result

The protected deployed-service rehearsal completed successfully after the
owner supplied the raw bootstrap proof only through a local process
environment. It observed Host approval `200`, idempotent redemption, the first
WebSocket upgrade `101`, replay rejection `401`, tamper rejection `401`, and
session cleanup `200`. No proof, bearer, ticket, pairing secret, or private
projection was included in the result. This is deployed command-line evidence,
not physical-TV or simulator evidence.

Automated first-party tests verify that the Stage:

- validates the memory-only bearer response before retaining it;
- obtains a new ticket before every connection attempt;
- offers `guiltyparty.control.v1` followed by the short-lived ticket;
- requires the server to select only `guiltyparty.control.v1`;
- closes and resynchronizes on a sequence regression;
- clears polling, bearer, ticket, projection, and sequence state on lifecycle
  reset; and
- caps full-jitter reconnect delay at 30 seconds;
- requests a fresh authorized public projection every 15 seconds until a
  dedicated application heartbeat exists, reports uncertainty after 30 seconds
  without authenticated activity, and reconnects after 45 seconds;
- treats every projection as a complete snapshot, accepting monotonic journal
  sequence advances while rejecting regressions.

webOS 6 simulator UI evidence confirms the 120-second expiry state, a focused
retry action, a 1080p layout, and Back opening the exit confirmation that
truthfully states app exit loses authority. The physical TV confirms launch,
initial pairing display, API transport, pending privacy, the code-expired state
with retry focused, and that an unapproved close/relaunch starts at a fresh
pairing transaction. Paired
suspend/resume, network-loss, fresh-ticket reconnect, close-code visibility,
bearer revocation, session end, and restart-after-authority evidence remain
blocked on Host-approved end-to-end access.

## Physical attempt

The configured physical target was attempted before simulator evidence was
treated as sufficient. Its initial Developer Mode authentication failure was
resolved by the owner through the standard local `ares-novacom --getkey`
interaction; no passphrase, key, serial number, or other device credential was
recorded. `ares-device` then reported webOS SDK version `5.6.2`, and both
`ares-install` and `ares-launch` completed successfully for
`com.guiltyparty.stage` version `0.1.1`.

The remaining owner interaction is an optional interactive Host approval of the
physical television for projection, suspend/resume, network-loss, reconnect,
revocation, and session-end evidence. The proof must remain in the operator's
process environment or protected Host input and must not be shared in chat or
captured in evidence.

## Decision

The standard packaged-web transport is accepted for continued MVP review on
the supplied physical webOS generation: the physical TV proves the required
network `Origin: null`, TLS, transaction creation, StagePairing authorization,
and pending privacy without a native service or weaker gateway policy. The
implementation is not ready for named-friend use until the physical
ticket/WebSocket/public-projection and lifecycle checks pass. The deployed
rehearsal proves the server boundaries but is not physical-client evidence.
Newer simulator transport remains incompatible and fails closed; it does not
justify changing authentication.
