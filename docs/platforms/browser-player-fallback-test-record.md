# Browser Player Fallback Test Record

## Status

Source implementation candidate as of 2026-08-11. Automated and local rendering
checks pass. Merge, reviewed Cloudflare Pages promotion, and a complete live
remote rehearsal are still required before this record can claim deployed
acceptance.

This record covers the dependency-free browser fallback at
`play.test.guiltyparty.app`. It does not expand the browser's accepted
capabilities or claim parity with native screen-capture protection, isolated-LAN
trust, camera joining, local notifications, Live Activities, or Live Updates.

## Candidate Scope

- public product name **Guilty Party**, with player-facing rather than internal
  Companion terminology
- Refined Case File system, light, and dark appearances using system fonts and
  first-party HTML/CSS only
- deliberate phone, tablet, and desktop hierarchy with 48-pixel primary targets
- protocol `1.1` and `participant_vote_targets_v1` negotiation after
  compatibility discovery
- direct voting from recipient-authorized character names, never hard-coded
  fixture choices or displayed scenario identifiers
- explicit not-open, open, submitting, recorded, closed, resolved, and
  unavailable voting presentation
- fresh-projection privacy shielding after backgrounding, manual protection,
  connection uncertainty, reload, and bfcache recovery
- no script-readable persistent storage, URL credentials, third-party assets,
  analytics, media capture, or new dependencies

## Automated Evidence

On 2026-08-11, `npm run test:remote` passed 108 tests. New focused checks cover:

- build and participant feature metadata
- recipient-boundary rejection and server-authorized vote-target normalization
- the complete bounded voting presentation lifecycle
- stale-projection privacy-cover behavior
- absence of hard-coded scenario vote identifiers
- accessible radiogroups and explicit reveal controls
- narrow and expanded layout breakpoints, light/dark support, and reduced-motion
  treatment
- isolated Pages output containing every required first-party module
- recovery of the endpoint's actual negotiated protocol version without
  exposing cookie authority

`node --check` passes for the player application and its pure state module, and
`git diff --check` reports no whitespace errors.

## Local Rendering Evidence

The candidate Pages artifact was built and served from
`.tmp/remote-clients/play` on localhost. The join experience rendered with the
accepted visual hierarchy in the default desktop viewport and at 320 by 760
CSS pixels. At 320 pixels, the document and body scroll widths both remained
320 pixels and the join card remained within the viewport. The semantic DOM
exposed the labeled nickname and invitation fields, join action, status region,
and privacy explanation.

The expected localhost API failure was shown because no local Worker was
started. No invitation, credential, or private content was used for this visual
check.

## Remaining Acceptance Gates

- [ ] merge the reviewed implementation to `dev`
- [ ] rebuild from the exact clean reviewed commit and manually promote only
      `.tmp/remote-clients/play`
- [ ] verify custom-domain asset digests and committed response headers
- [ ] complete a live protocol `1.1` session with two isolated browser profiles
- [ ] confirm each player receives only its own private objective and clues
- [ ] exercise direct voting through resolved outcome without raw identifiers
- [ ] background, manually protect, reload, and reconnect a player; verify no
      stale private content appears before a fresh projection
- [ ] verify session end clears the view and recovered cookie context cannot
      reopen it
- [ ] manually review keyboard order, focus visibility, 200-percent zoom,
      representative long content, and right-to-left interface layout behavior
- [ ] record the Pages deployment identifier and owner result here

No unchecked item is implied by the automated or local rendering evidence.
