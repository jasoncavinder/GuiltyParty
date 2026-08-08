# Remote Friends MVP Test Readiness

## Status

Draft operational record. Completing this document does not authorize an
invitation until the project owner records the final decision below.

## Candidate Deployment

- Reviewed source commit: `e85b486b1928704382329bbd73d4fa0a4ae28539`
- Worker version: `603165d6-001a-4de4-98e6-faad5e78c426`
- Provider script ETag:
  `fb72c47a3ee2bf94bbac88d4925919aac14a1719641fb49a935588c615a2b52c`
- Wrangler 4.119.0 dry-run runtime artifact manifest:

  - `worker.js` SHA-256:
    `814a516a80430c27f22bec38f447af8042f76f58c1f4e1ee15a9063527b9c0a5`
  - `85b31fdbd5ef4c5f690c397f89cbbb70b9af79d5-gp_scenario_wasm.wasm`
    SHA-256:
    `3d01663fb738ceaf31f830705f427bfa7d7735bae5f1de17d0edeee230bba9b7`

- API hostname: `api.test.guiltyparty.app`
- Browser Host origin: `https://host.test.guiltyparty.app`; Pages project
  `guilty-party-host-test`; deployment
  `5bde1db6-ee32-4834-bd30-732950f261e5`
- Browser Companion origin: `https://play.test.guiltyparty.app`; Pages project
  `guilty-party-play-test`; deployment
  `eed998d9-d960-4cab-9c9f-537967ab2798`
- Packaged Stage transport: opaque `null` Origin plus realtime connect ticket
- Deployment operator and date: project owner through authenticated Wrangler,
  2026-08-07 HST
- Proven rollback version: `dddc679c-3ea9-424a-a432-b7c2fea832d7`

Do not record account identifiers, raw secrets, pairing proofs, bearer
authority, connect tickets, player names, or private scenario content here.

## Service Evidence

- [x] Clean checkout passes `make test` and `make check-cloudflare`.
- [x] Custom Domain DNS and certificate are active.
- [x] `/health` reports `friends-mvp-development` and `test-gated`.
- [x] Host and participant-join edge limits return safe `429` responses under
      rehearsal.
- [x] The Stage pairing edge limit returns safe `429` responses under
      rehearsal.
- [x] Invalid or unavailable rate-limit bindings fail admission closed.
- [x] Invalid Host bootstrap and invalid, expired, rotated, and closed pairing
      proofs fail before unauthorized state is created.
- [x] A packaged Stage obtains bearer authority without a cookie, mints a
      30-second connect ticket, and connects without a URL credential.
- [x] A Stage display code alone grants no authority; only the memory-only
      polling secret can observe pending state or redeem after Host approval.
- [x] Pending Stage pairing discloses no session context, expires after 120
      seconds, and cannot create more than one Stage endpoint when retried.
- [x] A Host-approved packaged Stage obtains bearer authority without a cookie,
      mints a 30-second connect ticket, and connects without a URL credential.
- [x] A consumed, expired, tampered, revoked, or stale-generation connect
      ticket fails.
- [x] Durable Object hibernation and reactivation preserve the authorized
      connection and journal-derived projection.
- [x] Disconnect and reconnect issue a new connect ticket and restore only the
      Stage projection.
- [x] Explicit session end revokes all authority and schedules deletion.
- [x] Alarm expiry and active-storage deletion are observed in the deployed
      environment within the approved lifecycle.
- [x] Emergency disable, restoration, rollback, and redeployment succeed.
- [x] The reviewed Browser Host and Browser Companion static outputs are
      deployed as separate Pages projects with the committed security headers.
- [x] Both Pages custom domains report active managed TLS, resolve through
      public Cloudflare DNS, and return the intended surface over HTTPS.

## Physical Client Evidence

- [x] Browser Host completes session creation and every Host control.
- [x] Fully packaged LG webOS Stage confirms its opaque sandbox boundary, CORS
      behavior, subprotocol support, memory clearing, and fresh-ticket reconnect
      behavior on webOS 5.6.2-21.
- [x] Stage receives no private objective, private clue, individual vote, bearer
      credential belonging to another endpoint, or participant-only state.
- [ ] Two physical iOS Companions join as distinct participants and reconnect.
- [x] The four active surfaces complete the full original scenario and
      deterministic outcome.

The 2026-08-08 physical rehearsal used a Browser Host, a packaged LG Stage, one
physical iPhone Companion, and one iPad simulator Companion. Both participant
endpoints joined independently, received only their authorized objectives and
clues, voted privately, and recovered after backgrounding. The public Stage
showed only aggregate voting and the deterministic resolution. The remaining
unchecked item deliberately requires a second physical iOS/iPadOS device; a
simulator does not satisfy that claim.

The rehearsal found that the deployed worker did not broadcast admission state
to already-connected endpoints and that an unwritable stale socket could stop
fan-out before later recipients. After the fan-out remediation was reviewed,
merged, and deployed, a repeat physical rehearsal showed the Browser Host
update immediately when a Companion joined and the packaged Stage update
without a manual restart when participant state changed. The Stage liveness
remediation was also reviewed, merged, packaged as 0.1.1 (2), installed on the
physical LG television, and exercised against the deployed service.

The same repeat rehearsal exposed a duplicate WebSocket-ping completion that
froze the iPad simulator Companion under Xcode. After PR #33 merged, Companion
0.1.1 (2) remained responsive for more than 60 seconds of steady connectivity
and all four active surfaces reported explicit session end. Both Companions
cleared private content; the iPad result remains simulator evidence.

## Automated Deployed-Environment Evidence

- [x] A browser Host, two distinct browser fallback participants, and one
      Host-approved packaged Stage completed the full deterministic scenario
      through the deployed API using synthetic aliases.
- [x] The rehearsal covered character assignment, both scenes, public and
      recipient-authorized private clues, voting, deterministic outcome,
      idempotent retry, forbidden participant mutation, reconnect, and
      recipient-projection privacy.
- [x] Stage transaction expiry, pending-response privacy, display-code-only
      rejection, idempotent redemption, and live edge throttling passed.
- [x] Fixed-window invitation, ticket, hibernation, reconnect, explicit-end,
      alarm-expiry, and active-storage-deletion paths passed.
- [x] Deployed Browser Host and Companion fallback custom origins loaded with
      clean unauthenticated recovery states and no browser console warnings.
- [x] A real Browser Host smoke session cleared the one-time operator proof,
      rotated and closed its invitation, recovered its HttpOnly-cookie context
      after reload, refreshed its endpoint roster, and ended cleanly.
- [x] The Companion fallback rendered without horizontal overflow at a
      390-by-844 phone viewport.

These automated checks do not satisfy the unchecked physical-client evidence
or authorize named-friend traffic.

## Draft Named-Tester Notice

> You are invited to a private, early development test of Guilty Party. Please
> use a nickname rather than your real name. The test does not use accounts,
> advertising, analytics, recording, voice/video capture, private messaging, or
> remote AI. The service stores the minimum gameplay state needed to run and
> reconnect the game. Active session storage expires and is scheduled for
> deletion no later than seven days after the session ends or expires.
> Cloudflare separately maintains a provider-controlled SQLite recovery history
> covering up to the preceding 30 days, so seven-day active deletion is not a
> promise of complete provider erasure at day seven. Please contact the Host if
> you want to stop participating or report a problem. This test is not a public
> or commercial release.

The project owner must approve the exact notice delivered to testers, including
the contact method, before the first invitation.

## Known Limitations

- Guest authority is temporary and does not provide account recovery.
- Companion authority is memory-only. When automatic recovery is unavailable,
  a manual rejoin currently creates a new participant and leaves the prior
  participant in the session roster until session end.
- Restarting the packaged Stage requires pairing again.
- Reconnect restores a full authorized projection; delta replay is not yet
  implemented.
- Cloudflare Rate Limiting bindings are coarse, permissive, and local to each
  serving location. Durable Object limits and authorization remain mandatory.
- No remote media plane or AI Stage Manager is enabled.

## Owner Decision

- Decision: `PENDING — DO NOT INVITE NAMED TESTERS`
- Approved source commit and Worker version: `TBD`
- Approved tester notice revision: `TBD`
- Approved first-test window and invited cohort: `TBD`
- Owner name/date: `TBD`
