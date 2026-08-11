# Local Product Refinement Roadmap

## Status

Approved direction as of 2026-08-09. The owner accepted the shared
[visual language](../product/visual-language.md) under LPR-DESIGN-001 on
2026-08-10. This roadmap sequences owner-only product refinement before
TestFlight, Google Play, or named-friend distribution. It does not set a
delivery date or authorize a store submission, dependency, provider, or
external tester.

Implementation details remain in [PLANS.md](../../PLANS.md). Long-lived
architecture remains governed by the accepted ADRs.

## Outcome

The owner should be able to run the complete original test scenario across the
Browser Host, packaged LG webOS Stage, and native phone and tablet apps and
judge the experience as a product—not merely as a control-plane demonstration.

The refinement should make Guilty Party feel clever, theatrical, social, warm,
and accessible without becoming grim, gore-oriented, or so dark that usability
suffers. Native surfaces should feel related rather than pixel-identical.

## Constraints That Remain In Force

- Canonical scenario truth remains deterministic and server-authoritative.
- Secrecy is enforced by recipient-specific server projections, never by UI
  hiding alone.
- A participant, endpoint, character, physical room, and Stage remain separate
  concepts.
- The control plane and media plane remain separate.
- AI does not silently change story truth or receive unauthorized private data.
- Only synthetic identities and original placeholder content are used.
- Public repository visibility does not grant rights to project code, assets,
  scenarios, branding, or media.
- **Guilty Party** is the public app name. **Companion** is an internal term for
  the private player surface.

## Current Interface Inventory

| Surface | Current working experience | Principal refinement gaps |
| --- | --- | --- |
| Browser Host | Creates and ends sessions; manages invitations and Stage pairing; assigns characters; advances scenes and clues; controls voting; shows participants and endpoint status. | Prototype/operator terminology remains prominent; story flow, urgency, confirmations, and recovery need stronger hierarchy; controls are fixture-specific; no presentation-media controls or shared component specification. |
| LG webOS Stage | Packages and pairs on the physical television; renders public cast, scene, clues, voting status, outcome, reconnect overlay, terminal clearing, and the bounded bundled Cinematic Gallery image and Cinematic Vault atmosphere proof. | Presentation media is still limited to one public proof; visual tokens differ from web; representative overscan, focus, reduced-motion, long-content, and future media-delivery evidence remain. |
| iOS/iPadOS | Joins remotely; protects private content; resumes endpoint authority; shows assignment, objective, scene, clues, voting, and outcome; provides compact and split tablet layouts. | Primarily system styling; invitation paste and raw vote-target entry are development UX; no final icon/launch identity, camera join, authored media, or complete localization structure; tablet hierarchy needs product design rather than only structural adaptation. |
| Android phone/tablet | Matches the native control-plane, resumption, privacy, voting, and adaptive-layout baseline; Android secure-window protection is active during private sessions. | Light Material prototype is visually disconnected from other surfaces; development origin and raw vote-target controls remain visible in debug UX; no final identity, camera join, authored media, or complete localization structure; physical-device evidence is unavailable. |
| Browser player fallback | Joins, receives private projections, votes from valid choices, hides private content, reconnects, and clears at session end without persistent browser storage. | It is visually closer to Host than native apps but lacks a documented shared component/token source; browser capability limitations and fallback messaging need clearer product treatment. |

## Shared Experience Foundation

The first implementation deliverable should be a small, documented semantic
foundation rather than a framework or a pixel-identical component library.

The approved direction is **Refined Case File**, using editorial clarity for
Host tools and more cinematic atmosphere for the Stage. The decision governs
look and feel, not final layouts, navigation, media controls, or full-game UX.

It should define:

- brand, surface, background, panel, text, muted text, border, focus, success,
  caution, danger, and privacy-protected color roles
- display, title, body, label, and code/input typography roles using only
  system fonts until another font is separately approved
- spacing, corner, border, elevation, focus, touch-target, television-safe-area,
  and readable-line-length rules
- public Stage, private player, and Host-control emphasis rules
- loading, empty, disconnected, stale, protected, destructive, success, and
  terminal state treatments
- motion roles and reduced-motion fallbacks that never carry information alone
- reusable original logo/icon direction without implying that a temporary
  lettermark is final brand artwork

The semantic definitions may be represented in a neutral project-owned data
file only after the consuming mappings and validation approach are agreed.
SwiftUI, Jetpack Compose, HTML/CSS, and webOS remain native implementations;
the foundation does not introduce a shared UI runtime.

## Product Refinement Workstreams

### 1. Vocabulary and Information Hierarchy

- remove development and internal architectural terminology from ordinary
  player-visible flows
- preserve plain-language privacy and safety explanations
- give the Host a clear run-of-show hierarchy and consequential-action review
- make the Stage readable at television distance and visibly subordinate
  technical connection detail to the story
- distinguish private character truth, public scene information, actions, and
  system status without relying on color alone

### 2. Joining and Recovery

- retain manual GP1 entry as an accessible and development fallback
- design camera/QR joining for native phones and tablets under the accepted
  permission, privacy, and physical-device testing boundaries
- hide development server controls from ordinary release presentation
- make joining, waiting for assignment, resuming, reconnecting, revoked access,
  ended sessions, and manual recovery visually and behaviorally distinct

### 3. Core Play

- present character identity and private objectives as the primary private
  experience
- make new clues discoverable without turning private content into ambient
  notifications or public previews
- replace raw vote-target identifier entry with server-authorized character
  choices
- provide explicit submitted, reconciled, closed, and resolved voting states
- make scene and outcome transitions understandable with motion disabled

### 4. Accessibility and Localization Readiness

- exercise VoiceOver, TalkBack, keyboard/focus navigation, Dynamic Type/font
  scaling, contrast, reduced motion, orientation, and large-screen layouts
- move player-visible native strings into normal platform localization
  resources before translations are added
- keep interface language distinct from BCP 47 gameplay-language metadata
- verify long synthetic text and representative right-to-left layout behavior
  without claiming translated scenario support

### 5. Presentation Media

Presentation media means authored scene images, evidence images, ambient music,
sound effects, and pre-recorded public or private narration. It is distinct
from live participant communications.

The owner accepted the first slice under **LPR-MEDIA-001** on 2026-08-10. It is
Stage-only, public, and bundled:

- one original scene image
- one short original transition or atmosphere sound
- visible playback/mute state and a reduced-motion/sound-off-safe presentation
- a deterministic scenario-owned media reference rather than fixture-specific
  UI inference

This is the safest first proof because it exercises story atmosphere and
cross-surface design without microphone permission, private-output routing,
remote media delivery, retention, or a third-party media provider. Exact
scenario versioning, cue timing, packaging, and replay behavior are accepted in
[ADR 0040](../adr/0040-bundled-stage-presentation-media.md). The owner selected
the cleaned Cinematic Gallery image and Cinematic Vault atmosphere on
2026-08-10; their exact digests and creation processes are recorded in the
[provenance record](../legal/bundled-stage-media-provenance.md).

Private playback follows only after audience authorization, lifecycle clearing,
route validation, and physical-device behavior are specified and testable.
Private audio never falls back to a public speaker.

### 6. Live Communications Media

Live microphone, voice, whisper, caption, and video behavior remains a separate
media-plane workstream under ADRs 0010–0014 and 0022. Before implementation,
the project must decide whether it is required for the first named-friend test
and approve:

- the exact self-hostable provider adapter and dependency versions
- control-plane media grants, audience, consent, room, and capability state
- end-to-end encryption and provider enforcement expectations
- push-to-talk, room-microphone arbitration, Stage ducking, echo behavior, and
  private-route failure handling
- lifecycle, interruption, accessibility, diagnostic, retention, rollback,
  and physical-device evidence

Recording, transcription, passive monitoring, remote AI media access, and
background capture remain excluded.

## Ordered Delivery Checkpoints

1. **Foundation proposal — accepted 2026-08-10:** representative Host, Stage,
   phone, and tablet states plus semantic roles and copy principles; the owner
   approved the Refined Case File visual language while keeping layouts and UX
   open for later full-game and media studies.
2. **Player-flow refinement — specification proposed 2026-08-11:** joining,
   assignment, character, clues, explicit voting state, direct vote choices,
   recovery, privacy, and terminal states on iOS/iPadOS and Android, followed
   by browser-fallback reconciliation. The bounded cross-platform state,
   hierarchy, contract, and acceptance proposal is in the
   [Player Experience Specification](../product/player-experience.md) and
   remains subject to owner review before implementation.
3. **Host and Stage refinement:** run-of-show and support hierarchy, public
   storytelling presentation, television focus and safe-area behavior.
4. **Accessibility/localization pass:** automated and manual virtual coverage,
   followed by available physical-device checks.
5. **Presentation-media proof — physical candidate validated:** the bounded
   technical proposal and exact original assets were approved on 2026-08-10.
   Automated/package checks and physical webOS artwork, seamless single-loop,
   mute, re-enable, and session-end evidence were recorded on 2026-08-11. Exact
   merged deployment, newly feature-negotiated Host status, and immediate
   admitted-Stage roster propagation were also physically confirmed on
   2026-08-11.
6. **Local acceptance rehearsal:** complete deterministic session across all
   available surfaces, orientations, and form factors.
7. **Live-media decision:** approve, defer, or narrow communications media for
   the named-friend test.
8. **Distribution decision:** only after the owner reviews evidence should
   TestFlight or Google Play preparation resume.

## Decision Queue

These decisions are intentionally ordered so they can be discussed one at a
time without losing later questions:

1. **LPR-DESIGN-001 — accepted 2026-08-10:** Refined Case File is the shared
   visual foundation, with Editorial clarity for Host and Cinematic atmosphere
   for Stage. This approves look and feel, not final layouts or UX.
2. **LPR-MEDIA-001 — accepted 2026-08-10:** the first presentation-media proof
   is Stage-only, public, locally bundled, and limited to one original scene
   image and one short original atmosphere sound with visible mute/playback
   state and sound-off/reduced-motion equivalence.
3. **LPR-MEDIA-002:** decide whether private pre-recorded audio belongs before
   named-friend testing.
4. **LPR-MEDIA-003:** decide whether live voice communications are required
   before named-friend testing.
5. **LPR-DIST-001:** decide when local evidence is sufficient to resume mobile
   beta-distribution preparation.
6. **LPR-MEDIA-004 — accepted; evaluation completed 2026-08-11:** a
   disposable optimization spike derived AAC-LC/M4A and MPEG-1 Layer III MP3
   candidates from the owned WAV master. Native embedded playback failed; the
   opaque-origin sandbox correctly blocked relative packaged-file playback;
   and sandbox-compatible `blob:` playback reached the physical LG webOS 5.6
   media engine but returned media error code 4, `Format error`, despite
   optimistic `canPlayType()` results. A separate standalone-shell test
   confirmed that packaged-file MP3 was rejected by the webOS URL-safety layer
   before decoding. Finally, the 128-kbps, 44.1-kHz stereo MP3 was embedded and
   decoded through the existing Web Audio architecture. On the physical TV it
   started almost immediately, looped seamlessly, and stopped/reset reliably
   while reducing encoded audio size by roughly 90 percent. The owner approved
   adoption on 2026-08-11 HST. Stage build 0.2.1 (4) packages the exact MP3
   digest through the existing Web Audio path and retains the WAV as its
   non-packaged source master. LAME 4.0 is documented as a local encoder only;
   no encoder or new runtime dependency enters the product. The exact adopted
   package subsequently passed physical pairing, presentation, more than 50
   seconds of seamless single-source looping, mute, re-enable, Host status,
   session-end, and relaunch checks on the LG webOS 5.6 television. Do not
   relax the sandbox or use relative, network, or `blob:` media sources.

New questions receive stable IDs and are appended rather than replacing or
silently reordering this queue.

## Local Acceptance Evidence

The owner-only gate records:

- exact application builds, contract version, scenario version, API deployment,
  and original asset revisions
- physical iPhone and LG webOS television behavior
- iPhone and iPad simulator coverage across compact/regular layouts,
  orientation, text size, appearance, and reduced motion
- Android phone and tablet emulator coverage across the supported range that is
  practically installed
- Browser Host behavior in Safari and a Chromium-based browser
- complete join, assignment, scenes, public/private clues, direct voting,
  outcome, reconnect, privacy shield, and session-end behavior
- presentation-media behavior when enabled, disabled, interrupted, muted, or
  unsupported

Simulator and emulator evidence does not claim physical Android, physical iPad,
acoustic-room, Bluetooth, microphone, secure-hardware, camera, or compositor
behavior that it cannot prove.
