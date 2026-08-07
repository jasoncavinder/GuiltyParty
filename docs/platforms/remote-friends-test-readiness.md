# Remote Friends MVP Test Readiness

## Status

Draft operational record. Completing this document does not authorize an
invitation until the project owner records the final decision below.

## Candidate Deployment

- Reviewed source commit: `5eb8a196b09f82f9524ebce2e9a4e2cd8395c393`
- Worker version: `01485ec2-a2b5-4472-8b3b-97de104d0b72`
- Provider script ETag:
  `643efbfa0220039ace67fe9f1738cd97df6368073f70f41cb3b1a33fb2c01b29`
- Wrangler 4.119.0 dry-run runtime artifact manifest:

  - `worker.js` SHA-256:
    `3aba82e6f3ae69ac2311f0f042e362c27d3a8b7c62ed342add9043e21c0085d5`
  - `85b31fdbd5ef4c5f690c397f89cbbb70b9af79d5-gp_scenario_wasm.wasm`
    SHA-256:
    `3d01663fb738ceaf31f830705f427bfa7d7735bae5f1de17d0edeee230bba9b7`

- API hostname: `api.test.guiltyparty.app`
- Browser Host origin: `https://host.test.guiltyparty.app`
- Browser Companion fallback origin: `https://play.test.guiltyparty.app`
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
- [x] Host and join edge limits return safe `429` responses under rehearsal.
- [x] Invalid or unavailable rate-limit bindings fail admission closed.
- [x] Invalid Host bootstrap and invalid, expired, rotated, and closed pairing
      proofs fail before unauthorized state is created.
- [x] A packaged Stage obtains bearer authority without a cookie, mints a
      30-second connect ticket, and connects without a URL credential.
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

The lifecycle rehearsal was executed against the Custom Domain after promoting
the reviewed commit. It observed the expected invitation and ticket failures,
an authorized Stage projection before and after the documented idle
hibernation window, a fresh-ticket reconnect with the same journal-derived
projection, retained `410` state, and empty `404` state after both expiry-driven
and explicit-end alarms deleted active session data. The direct Worker hostname
and Custom Domain both returned `test-gated` afterward, and only the two
intended Worker secrets remained.

## Physical Client Evidence

- [ ] Browser Host completes session creation and every Host control.
- [ ] Fully packaged LG webOS Stage confirms its actual Origin header, CORS
      behavior, subprotocol support, memory clearing, and reconnect behavior.
- [ ] Stage receives no private objective, private clue, individual vote, bearer
      credential belonging to another endpoint, or participant-only state.
- [ ] Two physical iOS Companions join as distinct participants and reconnect.
- [ ] The four surfaces complete the full original scenario and deterministic
      outcome.

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
