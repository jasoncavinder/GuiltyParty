# Guilty Party Visual Language

## Status

Accepted product direction as of 2026-08-10 under **LPR-DESIGN-001**.

This document defines the shared look and feel for Guilty Party surfaces. It
does not approve the representative mockup layouts as final screen designs,
freeze navigation or information architecture, or constrain later audio,
video, accessibility, localization, and full-game UX work.

## Direction

The visual language is **Refined Case File**: a warm, theatrical foundation
with contemporary editorial clarity and selectively cinematic presentation.
It should make Guilty Party feel clever, social, inviting, and dramatic without
becoming grim, gore-oriented, visually noisy, or so dark that usability
suffers.

The family combines:

- tactile case-file warmth rather than literal paper simulation
- restrained serif display typography with highly readable interface text
- wine, plum, parchment, charcoal, and warm metallic accent roles
- editorial structure for dense or consequential information
- cinematic light, depth, and motion for authored public story moments
- clear privacy, connection, readiness, warning, and terminal states

The surfaces should feel related, not pixel-identical. Native platform
behavior and accessibility take precedence over visual sameness.

## Surface Emphasis

### Private Player Surfaces

Phone, tablet, and browser-player surfaces use Refined Case File most directly.
Character identity, private objectives, and newly received clues receive the
strongest hierarchy. Decorative treatment must never obscure whether content
is private, stale, disconnected, or no longer authorized.

Phone and tablet layouts remain separate design problems. The representative
player composition demonstrates the visual language only; it does not require
a portrait rail, a particular card arrangement, or the same composition at
every size.

### Host Surfaces

The Host Console borrows the same typography, color roles, and material warmth
while emphasizing Editorial Case File clarity. Run-of-show state,
consequential actions, participant support, media controls, and recovery must
remain quickly scannable under live-session pressure.

Cinematic decoration is subordinate to operational clarity. The representative
Host composition does not freeze its navigation, column structure, or future
audio and video controls.

### Public Stage

The Stage uses the same family with more of Cinematic Case File's atmosphere:
larger story typography, authored imagery, light, depth, and restrained motion.
It remains readable at television distance and keeps connection detail
subordinate to the shared story.

The Stage is a public surface. Cinematic treatment must not imply, derive, or
reveal private scenario information. Motion, sound, and imagery enhance a
server-authorized public projection; they do not become canonical scenario
truth.

## Appearance

Guilty Party supports coordinated dark and light appearances.

- Player and Host surfaces follow the operating-system appearance by default
  and provide a persistent user override where the platform permits it.
- The Stage defaults to a controlled cinematic dark appearance. A Host may
  select a light or bright-room appearance when room conditions require it.
- Appearance changes do not alter audience, authorization, scenario state, or
  the meaning of status indicators.
- Both appearances preserve a slightly stronger text-to-surface contrast than
  the initial Refined and Cinematic studies. The increase should improve
  legibility without turning the palette stark or losing its warmth.

Body text, controls, focus, functional status, and privacy indicators must be
validated for accessible contrast. Color is never their only differentiator.

## Semantic Foundation

Implementations should map their native design systems to shared semantic
roles rather than copying literal values between platforms.

### Color Roles

- brand accent and restrained metallic emphasis
- application background and elevated surface
- primary, secondary, and subdued text
- border, divider, focus, and selected state
- success, caution, danger, and destructive action
- privacy-protected, reconnecting, stale, and terminal state
- public Stage atmosphere and authored-media scrim

### Typography Roles

- story display
- surface title
- section title
- body and supporting body
- interface label and compact status
- identifiers or diagnostic text shown only in development and support contexts

Only system or otherwise separately approved fonts may be used. A serif display
role and a highly legible native interface role are the intended relationship;
no external font dependency is approved by this decision.

### Shape, Depth, and Motion

- warm, moderately rounded player surfaces
- tighter, more editorial geometry for operational Host controls
- cinematic depth and restrained light effects for the Stage
- obvious focus and touch targets that follow each platform's conventions
- motion that supports scene hierarchy and pacing but never carries meaning by
  itself
- equivalent reduced-motion states for every animated transition

## Continuity Rules

The cross-surface relationship is maintained through semantic roles, copy
voice, status meaning, and story emphasis—not through a shared UI runtime or
identical layouts.

- SwiftUI, Jetpack Compose, browser HTML/CSS, and packaged webOS remain native
  implementations.
- Public and private surfaces may present the same canonical moment differently
  only from their server-authorized projections.
- Presentation media follows scenario-owned references and the separate media
  boundary; UI decoration does not infer unrevealed content.
- Original project-owned placeholder work is used until any font, icon, image,
  audio, video, or asset source is separately reviewed and approved.
- Product-facing language uses **Guilty Party**. **Companion** remains an
  internal architectural term.

## What Remains Open

This decision intentionally leaves the following to representative UX studies
and implementation-specific review:

- navigation and information architecture for each surface
- phone and tablet composition across orientation and text-size changes
- Host density, command grouping, confirmation, and recovery behavior
- Stage composition for different scenarios, scenes, media, and room conditions
- audio, video, microphone, camera, caption, routing, and interruption controls
- detailed component metrics, animation timing, and final brand artwork
- exact native token values and their automated or manual validation method

Those studies may substantially change the mockup layouts while preserving the
visual language recorded here.

## Related Documents

- [Local Product Refinement Roadmap](../roadmap/local-product-refinement.md)
- [Player Experience Specification](player-experience.md)
- [Experience Model](experience-model.md)
- [Mobile Companion Product Decisions](mobile-companion.md)
- [Media-Plane Protocol and Provider](../adr/0010-media-plane-protocol-and-provider.md)
- [Capture Indicators and Consent](../adr/0012-capture-indicators-and-consent.md)
- [Mobile Release Parity](../adr/0028-mobile-release-parity.md)
