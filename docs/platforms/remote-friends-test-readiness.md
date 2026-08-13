# Remote Friends MVP Test Readiness

## Status

Draft operational record. Completing this document does not authorize an
invitation until the project owner records the final decision below.

## Candidate Deployment

- Reviewed API source commit:
  `ad93c74e5863987c5d5a8aec4a11247a08da4a0a`
- Worker version: `391645d1-4e6f-41f0-b7e7-7881d35e8612`
- Worker deployment: `c896f98a-918c-42ba-9d72-0b493a641638`
- Provider script ETag:
  `709a4f6cf0a38c7ae03b7a8c6b5a03c680f7c38041ef122ec01b8541ce9c8953`
- Wrangler 4.119.0 dry-run runtime artifact manifest:

  - `worker.js` SHA-256:
    `8868547d16aa1cc09e387bbb84c7f5848c74c27a17d944d3c5963bc9783cd99f`
  - `7560ea7492de1e66444503abcc3cdec40ed29165-gp_scenario_wasm.wasm`
    SHA-256:
    `583e5621af8a326909da8432eeda710c10d7af298e5a1c33ff2db11fb0072cd0`

- API hostname: `api.test.guiltyparty.app`
- Browser Host origin: `https://host.test.guiltyparty.app`; Pages project
  `guilty-party-host-test`; protocol-reconciled source commit
  `4d82f5229addddd9efd4337c42bb7083c54ba4a7`; deployment
  `3f67d939-5ba2-46ce-b8b5-2ff1e1fe5412`
- Browser Companion origin: `https://play.test.guiltyparty.app`; Pages project
  `guilty-party-play-test`; deployment
  `1ae763fa-a494-4558-a98d-9d8732f6c8de`
- Packaged Stage transport: opaque `null` Origin plus realtime connect ticket
- Deployment operator and date: project owner through authenticated Wrangler,
  2026-08-11 HST
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
- [x] Android phone and distinct Pixel Tablet emulators complete the native
      contract, projection-filtering, resumption, and session-end path.
- [ ] Representative physical Android phone and tablet evidence is recorded.
- [x] The four active surfaces complete the full original scenario and
      deterministic outcome.
- [x] Two isolated browser-player profiles complete assignment, recipient-only
      clues, voting, reload recovery, explicit end, and post-end rejection.

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

The 2026-08-11 Stage presentation checkpoint installed exact packaged Stage
0.2.1 (4), SHA-256
`27e87d942c74327befb4c3df240c0c813edd781c8d1ee0f17ab371dbfd0e71c8`,
on the same physical LG television against the candidate deployment above.
The first-party MP3 atmosphere started promptly, looped seamlessly for more
than 50 seconds from one source, muted completely after extended playback,
remained stopped, and re-enabled without overlap. Host coarse status followed
the transitions. Session end stopped audio and cleared the presentation, and
relaunch returned to unpaired state without retained artwork or sound.

The same repeat rehearsal exposed a duplicate WebSocket-ping completion that
froze the iPad simulator Companion under Xcode. After PR #33 merged, Companion
0.1.1 (2) remained responsive for more than 60 seconds of steady connectivity
and all four active surfaces reported explicit session end. Both Companions
cleared private content; the iPad result remains simulator evidence.

The 2026-08-08 resumption checkpoint used reviewed source
`af43fa47ac956e967d361698d41b4144ae01eae4`, Worker version
`1aecea5a-e07b-4f61-97ad-b9da1da6ece1`, Companion 0.2.0 (3), the physical
iPhone, and an iPad (A16) simulator. Application termination restored the same
iPhone participant and endpoint without an invitation or duplicate roster
entry. A vote interrupted by termination reconciled exactly once. Explicit
session end cleared both private views, and relaunch could not restore or reuse
the ended session. This closes the automatic same-installation resumption
exercise but does not satisfy the separate two-physical-Apple-device checkbox.

The Android baseline subsequently passed the full live path on a phone
emulator and a distinct Pixel Tablet AVD. Those results are recorded in the
[Android Companion test record](android-companion-mvp-test-record.md) and do
not claim physical Android coverage. The owner accepted gathering initial
physical Android evidence through the named-friends cohort. A similarly narrow
exception allowing the cohort to gather the second physical Apple result is
proposed, but remains pending in the cohort go/no-go record. Neither exception
qualifies a platform for open beta or release.

The 2026-08-12 browser fallback owner rehearsal used Safari and Dia as isolated
profiles against the exact candidate above. Each player received only its own
objective and authorized clues. Direct voting exposed player-facing names,
locked each recorded vote, propagated closure, and produced a deterministic
public outcome when both votes selected the same character. Manual privacy
protection, fresh reveal, reload recovery without a duplicate participant,
session-end clearing, post-end recovery rejection, 200-percent zoom, keyboard
focus, representative long content, and right-to-left narrow layout checks
passed. A split two-player vote deterministically closes without an outcome;
Host-mediated tie handling remains a documented follow-up and is not claimed
as complete.

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

The expanded proposed notice is revision `RF-NOTICE-001-DRAFT` in
[Remote Friends Cohort 01](remote-friends-cohort-01.md). It covers the active
and provider recovery lifecycles, Apple and Google platform diagnostics,
attachment minimization, proprietary test status, and the excluded MVP
features. The project owner must approve the exact notice and working private
contact method before the first invitation. Binding beta terms remain a
separate human-review item.

## Known Limitations

- Guest authority is temporary and does not provide account recovery.
- Short-lived Companion authority is memory-only. The device-only resume
  credential now restores the same participant and endpoint for the tested
  same-installation restart path. When automatic recovery is unavailable, a
  manual rejoin can still create a new participant and leave the prior
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
- Approved cohort record and physical-evidence exception: `TBD`
- Approved private feedback route: `TBD`
- Approved first-test window and invited cohort: `TBD`
- Owner name/date: `TBD`
