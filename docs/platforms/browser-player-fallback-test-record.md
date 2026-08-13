# Browser Player Fallback Test Record

## Status

Deployed owner acceptance completed on 2026-08-12 HST from exact reviewed
`dev` commit `ad93c74e5863987c5d5a8aec4a11247a08da4a0a`. Automated,
artifact, live two-profile, privacy/recovery, voting, terminal-state, and manual
layout checks pass within the bounded browser-fallback scope below.

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

An additional representative long-content fixture was rendered with
right-to-left document direction at 320 by 760 CSS pixels. The document and
body scroll widths remained 320 pixels, every card remained within the
viewport, and no element reported horizontal overflow. The fixture was
disposable and was not committed.

## Deployment Evidence

- Pages project: `guilty-party-play-test`
- production deployment: `1ae763fa-a494-4558-a98d-9d8732f6c8de`
- verification alias: `https://1ae763fa.guilty-party-play-test.pages.dev`
- approved custom origin: `https://play.test.guiltyparty.app`
- source commit: `ad93c74e5863987c5d5a8aec4a11247a08da4a0a`
- matching Worker version: `391645d1-4e6f-41f0-b7e7-7881d35e8612`
- matching Worker deployment: `c896f98a-918c-42ba-9d72-0b493a641638`

The custom-domain HTML, JavaScript, CSS, shared control client, private-view
module, and player-state module matched the exact reviewed build output. The
responses retained the committed `no-store`, CSP, permissions, referrer,
framing, content-type, and indexing protections.

The first reload attempt correctly failed closed because the refined Pages
client had initially been promoted without the same commit's Worker recovery
change. The prior Worker returned protocol `1.0` for recovered browser endpoint
context while the client required the endpoint's retained negotiated protocol
`1.1`. Promoting the exact merged Worker restored the same participant and
private projection on reload without a duplicate roster entry. This establishes
that a browser-player promotion containing a recovery-contract change must
promote and verify both Pages and Worker artifacts as one compatibility unit.

## Acceptance Results

- [x] merge the reviewed implementation to `dev`
- [x] rebuild from the exact clean reviewed commit and manually promote only
      `.tmp/remote-clients/play`
- [x] verify custom-domain asset digests and committed response headers
- [x] complete a live protocol `1.1` session with two isolated browser profiles
- [x] confirm each player receives only its own private objective and clues
- [x] exercise direct voting through resolved outcome without raw identifiers
- [x] background, manually protect, reload, and reconnect a player; verify no
      stale private content appears before a fresh projection
- [x] verify session end clears the view and recovered cookie context cannot
      reopen it
- [x] manually review keyboard order, focus visibility, 200-percent zoom,
      representative long content, and right-to-left interface layout behavior
- [x] record the Pages deployment identifier and owner result here

The live rehearsal used Safari and Dia as isolated browser profiles with
synthetic aliases. Both participants joined, received distinct assignments,
kept objectives and recipient-only clues isolated, and saw only player-facing
vote choices. One-vote and two-vote counts, vote lockout, voting closure, and a
unique deterministic outcome all propagated correctly. Manual protection,
fresh-projection reveal, reload recovery, explicit session end, private-view
clearing, and post-end recovery rejection passed. At 200-percent browser zoom,
keyboard order, visible focus, control reachability, and reflow passed.

## Follow-up Finding: Tied Votes

A deliberately split two-player vote closes deterministically with no selected
outcome. This matches the current engine rule, which returns no outcome for a
tie, but the player experience does not yet explain or resolve the tie. A
separate product and engine slice should define a Host-mediated, journaled
tie-break restricted to the tied choices, or approve another deterministic
scenario rule. The successful same-target rehearsal proves the existing unique
outcome path; it does not close this tie-handling gap.
