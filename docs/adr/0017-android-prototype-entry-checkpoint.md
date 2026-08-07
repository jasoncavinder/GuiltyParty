# ADR 0017: Android Prototype Entry Checkpoint

## Status

Accepted

## Date

2026-08-06

---

# Context

ADR 0015 selects separate native Swift/SwiftUI and Kotlin/Jetpack Compose
Companions. ADR 0016 selects generated mobile transport models behind
handwritten application boundaries. The approved local MVP remains iOS-only,
and the project is currently operated by a very small team.

Starting Android before the server contract and first Companion gameplay loop
are stable would duplicate churn. Waiting until the iOS product is broadly
complete would create a different risk: Apple-specific assumptions could become
embedded in contracts and Android could remain indefinitely deferred. The
project needs an observable entry checkpoint and a deliberately narrow first
Android slice.

# Decision

## Current MVP Scope

Android remains outside the current MVP. ADR 0004 and PLANS.md continue to
authorize only the native iOS Companion for that prototype. This ADR defines
when later Android prototype work begins; it does not authorize Android
scaffolding or dependencies now.

## Entry Checkpoint

The first Android implementation begins after all of the following are true:

1. The version 1 control-plane schemas and representative positive, negative,
   compatibility, and privacy fixtures are committed and stable enough for a
   first native-client baseline.
2. The selected generation pipeline has proven that the same schemas produce
   usable Swift and Kotlin transport DTOs reproducibly.
3. The server and native iOS/iPadOS Companion can complete one deterministic
   session end to end, including joining, receiving an authorized private
   projection, taking participant actions, voting, receiving the outcome, and
   replaying the journal to the same result.
4. Temporary disconnection and resumption have automated contract coverage and
   have been exercised through the iOS Companion without duplicating a
   participant or action.
5. The owner has completed at least one hands-on playtest of that full
   iOS/server loop and accepted it as a sufficiently stable baseline rather than
   a final mobile design.
6. The minimum supported Android version and corresponding device-capability
   baseline have been accepted under MC-DEL-001.

The iOS checkpoint includes a deliberate iPad layout and device check; iPad is
not treated as an enlarged compatibility-mode phone interface.

Once the checkpoint is met, the Android baseline begins before substantial new
iOS-only product features are added. Necessary fixes, accessibility work, and
Apple-specific integration may continue, but they must not become a pretext for
indefinitely postponing the cross-platform contract proof.

## First Android Vertical Slice

The first Android slice contains only enough behavior to validate the shared
boundary:

- generated Kotlin transport DTOs
- an adaptive Jetpack Compose shell for phone and tablet window sizes
- development-LAN server connection and session joining
- display of an authorized private participant projection
- submission and safe outcome resolution of at least one idempotent participant
  action
- temporary-disconnection recovery using the accepted resumption contract
- physical checks on at least one representative Android phone and one
  tablet-class Android device

The slice uses the same deterministic scenario and contract fixtures as the iOS
baseline. Server-side authorization remains authoritative, and the Android
client does not acquire scenario truth or secrecy policy.

## First-Slice Exclusions

The first Android slice does not include production accounts or identity
providers, payments, production media, notifications, app-store distribution,
analytics, or unrelated feature parity. Those capabilities proceed only under
their own accepted requirements and dependencies.

# Consequences

Positive:

- Android begins from a tested, language-neutral contract instead of duplicating
  an unstable iOS experiment.
- A concrete checkpoint prevents open-ended Android deferral.
- Implementing the Android baseline before further broad iOS expansion exposes
  accidental Apple-specific assumptions early.
- The first slice remains small enough for a limited team to review and test.

Negative:

- Android work cannot begin until contract generation, the iOS gameplay loop,
  resumption tests, owner playtesting, and minimum OS support are resolved.
- Some iOS feature work may pause while the Android baseline catches up.
- Maintaining physical phone and tablet checks adds device and testing cost.

# Alternatives Considered

## Add Android to the Current MVP

Rejected. It would expand the approved prototype before its deterministic,
privacy, and client/server boundaries have been validated on the first native
Companion.

## Wait Until the iOS Product Is Feature-Complete

Rejected. It would delay cross-platform feedback too long and increase the cost
of correcting Apple-specific contract or workflow assumptions.

## Start Android on a Calendar Date

Rejected. Team capacity and implementation progress are uncertain; observable
technical and product evidence is a safer trigger than a date detached from
readiness.

## Require Production Authentication and Media First

Rejected. Those larger systems are not needed to prove the generated contract,
adaptive Compose UI, authorized projection, idempotent action, and reconnection
boundaries.
