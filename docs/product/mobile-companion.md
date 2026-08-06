# Mobile Companion Product Decisions

## Status

Accepted product direction as of 2026-08-05.

This document records product decisions for the intended mobile Companion. It
does not expand the approved local MVP, select a cross-platform framework,
define production networking, or authorize implementation. Open technical and
product questions are tracked in the
[mobile decision register](../platforms/mobile-decision-register.md).

## Role and Surfaces

### MC-PROD-001: Player-Only Mobile App

The installed mobile Companion is a player surface. Host tools belong in the
browser-based Host Console and may later be provided by desktop applications.
The mobile app does not become a Host Console.

### MC-PROD-002: First-Class Phone and Tablet Experiences

Phones and tablets are first-class Companion form factors. In particular, iPad
must have a deliberate tablet layout rather than merely running an enlarged or
compatibility-mode iPhone interface. Android tablet support is part of the
long-term mobile target; its delivery timing and implementation strategy remain
open.

## Identity and Continuity

### MC-PROD-003: Minimal Account Required

A player must establish at least a minimal Guilty Party account before using a
Companion in a session. Account creation should be low friction and may use
federated sign-in such as Apple or Google.

This requirement does not settle the identity provider, recovery model, data
fields, or behavior on an isolated LAN. It also does not add accounts to the
account-free local MVP.

### MC-PROD-004: Move Between Personal Devices

A participant must be able to recover an in-progress session on another
supported personal device after signing in. For example, a player whose phone
battery dies may continue on a tablet without becoming a new participant or
receiving another character.

The product should attempt reconnection and recovery automatically. It may ask
the player to rejoin the in-progress session when automatic recovery cannot be
completed safely.

## Participants, Rooms, and Endpoints

### MC-PROD-005: Shared Stage, Private Companion

Multiple participants may share a Stage and other public room equipment. Each
participant needs an individually authorized private endpoint for
player-specific information and actions. A public or shared Stage must not
become a substitute private display.

This preserves the existing separation among a person, participant, endpoint,
and physical room.

### MC-PROD-011: Browser Companion Fallback

When a participant cannot use the installed mobile app, the product provides a
browser-based Companion fallback. The browser Companion is still an
individually authorized private endpoint and must enforce the same server-side
secrecy boundaries as the installed app. A shared public Stage is not a
Companion fallback.

## Availability and Networking

### MC-PROD-006: Connected Experience with Reconnection

Offline gameplay is not an expected mode. Temporary disconnection is expected
and must be recoverable. The minimum operating environment is a network that
can reach a Guilty Party server; that may be an isolated LAN used for a private
event, prototype, or convention demonstration.

## Privacy and Capture Protection

### MC-PROD-007: Protect App-Switcher Snapshots

Private session content must be obscured in operating-system app-switcher and
task-switcher snapshots.

### MC-PROD-008: Discourage Session Capture

During a session, the Companion should detect screen capture where the platform
provides a reliable signal, warn the player, and prevent or obscure capture
where the platform permits it. The product must not promise universal
prevention on platforms that do not provide that control.

This protects participant privacy and creator intellectual property. The exact
response, user messaging, and treatment of screenshots versus screen recording
remain implementation and policy decisions.

## Audio Input

### MC-PROD-009: Room-Aware Microphone Selection

The current speaker's Companion is normally the microphone endpoint. A shared
room device, including a capable Stage device, may instead provide the room
microphone when explicitly selected and authorized. Device capability alone
does not grant capture permission.

### MC-PROD-010: Conditional Push-to-Talk

Push-to-talk is required when microphone capture and Guilty Party audio output
are on different endpoints and coordinated ducking is required. It may be
optional in configurations that do not need ducking, subject to visible capture
indicators and the no-passive-monitoring privacy rule.

## Authority and Scope

These decisions are product requirements. Significant implementation choices
still require an accepted ADR. In particular, this document does not select:

- separate native apps, Kotlin Multiplatform, Flutter, React Native, or another
  sharing strategy
- an authentication provider or account recovery design
- a media protocol, provider, or mixing topology
- production transport security or local certificate handling
- minimum operating-system versions or release cadence

The accepted MVP technology decision remains
[ADR 0004](../adr/0004-mvp-technology-stack.md): the first Companion slice is a
native Swift and SwiftUI iOS development app, while Android and production
accounts remain outside that prototype.
