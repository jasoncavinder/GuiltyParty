# Remote Friends MVP Test Readiness

## Status

Draft operational record. Completing this document does not authorize an
invitation until the project owner records the final decision below.

## Candidate Deployment

- Reviewed source commit: `09ee0c09d5af16fd7275312612be5edcf5ecbeec`
- Worker version: `a9a70148-51de-47dc-bc0d-5329c9e480a4`
- Provider script ETag:
  `bbb78395675d19eb187f86753b086c9255cb51cbe6facb3ed63fce2bbea4282d`
- Wrangler 4.119.0 dry-run runtime artifact manifest:

  - `worker.js` SHA-256:
    `2bf963a6532a9b577671a7b2cf8d82340c7bb77b2a5351ec02983d30f8eeda3c`
  - `85b31fdbd5ef4c5f690c397f89cbbb70b9af79d5-gp_scenario_wasm.wasm`
    SHA-256:
    `3d01663fb738ceaf31f830705f427bfa7d7735bae5f1de17d0edeee230bba9b7`

- API hostname: `api.test.guiltyparty.app`
- Browser Host origin: `https://host.test.guiltyparty.app`
- Currently deployed secondary browser origin:
  `https://stage.test.guiltyparty.app`
- Next reviewed browser Companion origin, not yet promoted:
  `https://play.test.guiltyparty.app`
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

## Physical Client Evidence

- [ ] Browser Host completes session creation and every Host control.
- [ ] Fully packaged LG webOS Stage confirms its actual Origin header, CORS
      behavior, subprotocol support, memory clearing, and reconnect behavior.
- [ ] Stage receives no private objective, private clue, individual vote, bearer
      credential belonging to another endpoint, or participant-only state.
- [ ] Two physical iOS Companions join as distinct participants and reconnect.
- [ ] The four surfaces complete the full original scenario and deterministic
      outcome.

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
