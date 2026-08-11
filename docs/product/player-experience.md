# Guilty Party Player Experience

## Status

Proposed implementation specification for owner review.

This document turns the accepted Refined Case File visual language and Mobile
Companion product decisions into a bounded player-flow specification for the
owner-tested iOS, iPadOS, Android phone, Android tablet, and browser-fallback
surfaces. It does not authorize external distribution, permanent accounts,
camera joining, private media, live communications, or a new dependency.

The public app name is **Guilty Party**. **Companion** remains an internal
architectural term.

## Outcome

A player should understand, at a glance:

- whether the app is safe to show
- whether the connection and private view are current
- who they are playing and what they privately need to accomplish
- what is happening publicly in the current scene
- which clues have been revealed to them
- whether an action is available, pending, accepted, closed, or resolved
- how to recover without exposing stale private content

The experience should feel like a warm, contemporary case file rather than a
transport console. Privacy and recovery remain explicit, but routine technical
state is visually subordinate while the connection is healthy.

## Constraints

- The server remains authoritative for scenario truth, audience, commands,
  voting eligibility, and recipient projections.
- Private content is never recovered from a UI cache. Reconnection requires a
  fresh server-authorized projection.
- The apps do not persist private gameplay content or put it in diagnostics,
  notifications, pasteboards, search indexes, or backup.
- Phone and tablet experiences are deliberate native adaptations, not scaled
  copies and not pixel-identical across SwiftUI and Jetpack Compose.
- System fonts and project-owned assets are used until another source is
  separately approved.
- Light and dark appearances preserve the same meaning and accessible
  contrast. Color never carries status alone.
- Interface language and gameplay-language metadata remain distinct.

## Current Baseline

Both native applications already implement the important safety machinery:

- one account-free synthetic invitation flow
- recipient-bound private projections
- app/task-switcher protection
- privacy shielding on lifecycle or connection uncertainty
- automatic same-installation resumption
- idempotent vote submission and reconciliation
- terminal clearing after session end or revoked authority
- compact and structurally expanded layouts

The refinement work must preserve those behaviors. The current visible gaps
are development-oriented copy, equal-weight prototype cards, raw vote-target
identifier entry, hard-coded strings, an Android-only development-origin
field, and tablet layouts that prove adaptation structurally without yet
providing a designed information hierarchy.

## Experience State Model

The platform implementations keep their existing state machines. Presentation
maps those states into the following shared product meanings.

| Stable state | Player meaning | Primary presentation | Available action |
| --- | --- | --- | --- |
| `PX-JOIN-READY` | No current private session | Guilty Party identity, session name field, invitation entry, concise privacy note | Join |
| `PX-JOIN-PENDING` | Invitation is being validated | Protected progress state; sensitive invitation field is cleared | Cancel only if cancellation is implemented safely |
| `PX-JOIN-FAILED` | Invitation is malformed, expired, unsupported, or denied | Specific safe explanation without protocol detail | Correct input or request a fresh invitation |
| `PX-RECOVERING` | Saved device authority is being checked | Privacy shield plus calm recovery progress | Rejoin manually after recovery fails or times out |
| `PX-WAITING` | Joined but no character is assigned | Waiting-for-assignment state with public session context only | Hide private view or rejoin manually |
| `PX-ACTIVE` | Fresh private projection is authorized | Character and objective first, then scene, clues, and current action | Contextual player action |
| `PX-RECONNECTING` | Connection is uncertain | Full privacy shield; no stale content or action remains visible | Automatic retry and a secondary manual-rejoin path |
| `PX-REJOINED` | A fresh projection restored the session | Brief nonblocking success acknowledgement over the active view | Continue playing |
| `PX-PROTECTED` | Player manually hid content or capture/lifecycle policy requires shielding | Opaque privacy surface with a reason appropriate to the platform | Request a fresh private view when permitted |
| `PX-ACCESS-ENDED` | Endpoint authority expired or was revoked | Private content cleared; distinguish access loss from normal game completion | Use a fresh invitation |
| `PX-SESSION-ENDED` | The game ended | Private content and resumption authority cleared; concise completion state | Return to join screen |

State priority is terminal authority loss or session end, then mandatory
privacy protection, then connection recovery, then active gameplay. A healthy
connection message does not compete visually with character, clue, or action
content.

## Joining and Recovery

### Ordinary join

- Show **Guilty Party**, not an internal target or development-build name.
- Label the alias field **Name for this session**. The current friends MVP may
  explain in supporting text that this is an alias and not an account profile.
- Label the secure invitation field **Invitation**. `GP1` belongs in help or
  support copy rather than the primary label.
- Keep paste/manual entry as the accessible fallback. Camera/QR joining remains
  a later, separately tested capability.
- Clear the invitation from visible and retained input state before network
  admission begins.
- Put the account-free, synthetic-test limitation in a concise disclosure below
  the primary action rather than presenting an architectural feature list.

### Development transport

The Android development-origin control remains debug-build-only and moves into
a clearly separated developer panel. It is absent from ordinary screenshots,
release presentation, accessibility traversal, and player instructions unless
that panel is explicitly opened. iOS and Android use the same product copy for
the normal remote join path.

### Recovery

Automatic recovery begins without revealing cached private content. A short
recovery status may name the action—**Restoring your private session**—but does
not expose identifiers or previous content. If recovery fails, the app explains
whether the player needs a fresh invitation, the Host's help, or a network
connection. **Rejoin manually** is a recovery action, not a routine destructive
control beside normal gameplay.

## Active Private Experience

### Information hierarchy

1. **Character identity and private objective** are the primary private
   experience.
2. **Current scene** supplies shared public context.
3. **Clues revealed to you** form a readable case-file history for the current
   in-memory projection.
4. **Current action** becomes prominent only while the player can act.
5. **Outcome** replaces action emphasis after resolution.
6. **Connection, language, and support detail** remain available but secondary
   while healthy.

The interface never relies on a generic stack of equally weighted cards.
Section treatment communicates the hierarchy while preserving semantic
headings and a linear accessibility order.

### Character and objective

Before assignment, the character area presents a deliberate waiting state and
does not show an empty private-objective card. After assignment, the character
name is the dominant title and the objective is explicitly marked private.
Privacy indicators are textual and semantic as well as visual.

### Scene and clues

The current scene remains public context even on the private surface. Clues are
shown only from the authorized projection. During one uninterrupted process,
the app may remember clue identifiers in memory to give a newly arrived clue a
brief emphasis and accessibility announcement. That memory is discarded on
privacy interruption, reconnection, termination, or session end; it never
becomes a persistent clue history or a source of truth.

An empty clue state says that no clues have been revealed **to you**. It does
not imply that the scenario contains no other clues.

## Voting and Other Actions

Raw scenario identifiers are never player input.

The next control-contract slice adds a bounded, optional, server-created
`vote_targets` collection to a participant's authorized projection when voting
is open and that participant may vote. Each item contains only:

- `character_id`: the existing stable command value, retained internally
- `character_name`: the player-visible scenario label

The server derives the collection from the pinned scenario version and current
canonical state. It contains no private objective, individual vote, or inferred
client policy and is not journaled as separate truth. The client:

- displays only the supplied choices
- never constructs, edits, or guesses a target identifier
- submits the selected `character_id` through the existing idempotent command
- treats an absent or empty collection as no safe action rather than restoring
  a raw-entry fallback
- disables additional submission while a vote is pending
- presents distinct **Submitting**, **Recorded**, **Closed**, and **Resolved**
  states

The server still revalidates the command against canonical rules. Supplying a
choice is not authority to make an otherwise invalid command succeed.

This is an additive protocol feature governed by ADR 0005. Its implementation:

- increments the advertised protocol minor version rather than silently
  redefining protocol `1.0`
- advertises the feature identifier `participant_vote_targets_v1` through the
  compatibility response
- sends the field only to a participant endpoint that claimed that feature
  after compatibility discovery
- omits the field for Host, Stage, and older participant endpoints
- defines field absence as **feature unavailable**, never as permission for the
  client to derive choices from another projection field

The refined client does not enable ordinary voting until compatibility
discovery and its endpoint registration establish support. During a staged
migration, older clients remain compatible through field omission; the
owner-rehearsal build policy may require the new feature once every tested
surface can consume it.

## Phone Composition

The phone uses one primary scroll context:

- compact product/title bar with a privacy action
- connection or recovery banner only when it requires attention
- character identity and objective
- current scene
- clues
- one contextual action region
- outcome or terminal state

The main action remains reachable at supported text sizes without obscuring
private content. A sticky action region may be proposed during platform
implementation, but it must not cover content, trap keyboard or assistive
navigation, or imply that a stale action remains available.

## Tablet Composition

Tablet layout responds to available width rather than a device-name check.

At expanded width:

- a restrained context rail contains scene, connection/recovery, session
  language, privacy, and support actions
- the primary pane contains character, objective, clues, voting, and outcome
- private content does not appear redundantly in both panes
- consequential actions remain in the primary pane

At compact width, including narrow split-screen, the layout becomes the phone
reading order without losing content or controls. Portrait and landscape are
both first-class. A tablet is not required to preserve the rail when text size
or multitasking width would make it harmful.

## Refined Case File Mapping

The first platform PRs define matching semantic role names in native code; they
do not add a shared UI runtime or a new serialized token format.

| Shared role | Player use |
| --- | --- |
| `caseBackground` | Warm application canvas in light and dark appearances |
| `caseSurface` | Primary readable content surface |
| `caseSurfaceRaised` | Current action or newly arrived authorized content |
| `caseText` / `caseTextMuted` | Primary and supporting text |
| `caseBorder` | Structural separation without paper imitation |
| `caseAccent` | Wine/plum brand and selected state |
| `caseMetal` | Restrained warm emphasis; never body text or status alone |
| `casePrivacy` | Private/protected state paired with text or iconography |
| `caseSuccess` / `caseCaution` / `caseDanger` | Functional state with non-color cues |
| `storyDisplay` | Scenario and character emphasis using an approved system serif role |
| `interfaceBody` | Native highly legible system interface typography |

iOS maps these roles through SwiftUI environment-aware values. Android maps
them through a light and dark Material color scheme plus named application
roles where Material does not express privacy or story emphasis. Exact values
are reviewed in representative native previews before broad application.

## Appearance, Motion, and Privacy

- Follow the operating-system appearance by default and provide the accepted
  persistent light/dark/system override using only the permitted non-secret
  preference-storage boundary.
- Preserve slightly stronger text-to-surface contrast than the early design
  studies. Normal text targets at least 4.5:1 and large text and meaningful
  non-text boundaries at least 3:1.
- Use motion for hierarchy and arrival, never for meaning. Reduced-motion mode
  replaces movement with immediate state change and optional nonanimated
  emphasis.
- App/task-switcher, recording, mirroring, background, and connection shields
  cover the whole private surface before any decorative transition.
- Screenshot warnings and platform capture limitations remain honest and do
  not imply that Guilty Party deleted or universally prevented a capture.

## Accessibility and Localization Readiness

- Move every new or changed player-visible interface string into an Apple
  string catalog and Android string resources. Existing hard-coded strings are
  migrated as part of each platform refinement PR.
- Server-authored scenario text remains server content and is not copied into
  interface resources.
- Display a localized language name when platform APIs can resolve the BCP 47
  gameplay-language tag; retain the raw tag only as a safe fallback or support
  detail.
- Use semantic headings, grouped clue announcements, explicit control labels,
  and status announcements appropriate to VoiceOver and TalkBack.
- Preserve at least 44-by-44-point Apple and 48-by-48-dp Android interactive
  targets.
- Support platform text scaling without clipping, hidden actions, horizontal
  scrolling of ordinary prose, or a tablet-only escape hatch.
- Validate logical reading/focus order, keyboard or switch navigation where
  supported, portrait, landscape, narrow multitasking widths, and
  representative right-to-left mirroring with synthetic interface text.

This work establishes localization structure; it does not claim an approved
scenario translation or settle the preserved language-architecture decisions.

## Representative Review States

Each native implementation PR includes previews or test fixtures for at least:

- join ready, pending, expired invitation, and access revoked
- automatic recovery, connection uncertainty, and successful rejoin
- waiting for assignment
- assigned character with no clues
- several public/private-authorized clues with long text
- voting open, submitting, recorded, closed, and resolved
- manual privacy shield and platform capture/lifecycle shield
- normal session end
- phone and tablet widths in light, dark, large-text, and reduced-motion modes

Previews use only synthetic, original placeholder content and never embed
credentials or captured private test data.

## Implementation Sequence

1. **Vote-choice contract:** add the server-projected `vote_targets` field,
   schema fixtures, generated Swift/Kotlin models, recipient-boundary tests,
   deterministic engine/projection tests, and compatibility gating.
2. **iOS/iPadOS player refinement:** introduce native semantic roles and string
   resources, then implement the accepted flow and phone/tablet hierarchy while
   preserving privacy and resumption behavior.
3. **Android phone/tablet refinement:** implement the equivalent product
   outcomes with Compose adaptation, dark appearance, resource strings, and
   the debug-only developer panel.
4. **Browser fallback reconciliation:** align product copy, state meaning,
   direct vote choices, and visual roles within the browser's documented
   capability limits.
5. **Accessibility and localization evidence:** run automated checks and manual
   simulator/emulator coverage, then use available physical devices for claims
   those environments cannot prove.
6. **Owner-only acceptance rehearsal:** complete the deterministic scenario on
   all available surfaces and update the readiness record before distribution
   work resumes.

Each implementation step is a separate PR to `dev`. The contract slice lands
before either native UI relies on it. Platform work may proceed sequentially,
but neither app is described as refined or supported until its applicable
evidence is recorded.

## Acceptance Criteria

- No ordinary player flow exposes raw scenario identifiers, development origin
  fields, internal target names, credentials, or protocol terminology.
- Both native apps preserve server-authorized projections, fail-closed privacy,
  automatic same-installation resumption, idempotent voting, and terminal
  clearing.
- Character, objective, current scene, clues, action, and outcome follow the
  documented hierarchy on phone and tablet layouts.
- Direct voting presents only server-supplied character choices and reconciles
  pending or accepted commands without duplication.
- Light, dark, large-text, reduced-motion, accessibility, orientation, and
  narrow-tablet states remain usable and meaning-equivalent.
- User-visible interface strings use normal platform localization resources.
- No new dependency, external asset, account system, media plane, analytics,
  notification provider, or distribution channel enters this slice.

## Deferred Work

- permanent accounts, passkeys, Sign in with Apple, and Sign in with Google
- cross-device participant transfer using permanent account authority
- camera/QR joining and LAN discovery permission UX
- private pre-recorded media, live communications, captions, and media routing
- Live Activities, Android Live Updates, and ordinary notifications
- production diagnostics, store submission, or named-friend invitation

Those items remain governed by their accepted product decisions and ADRs; this
specification neither rejects nor authorizes them.

## Related Documents

- [Guilty Party Visual Language](visual-language.md)
- [Mobile Companion Product Decisions](mobile-companion.md)
- [Language and Localization Product Direction](language-and-localization.md)
- [Local Product Refinement Roadmap](../roadmap/local-product-refinement.md)
- [ADR 0005: Versioned Control-Plane Contract](../adr/0005-versioned-control-plane-contract.md)
- [ADR 0015: Native Mobile Client Strategy](../adr/0015-native-mobile-client-strategy.md)
- [ADR 0028: Mobile Release Parity](../adr/0028-mobile-release-parity.md)
- [ADR 0029: Companion Local Data Lifecycle](../adr/0029-companion-local-data-lifecycle.md)
- [ADR 0034: First-Party Mobile Contract Generator](../adr/0034-first-party-mobile-contract-generator.md)
