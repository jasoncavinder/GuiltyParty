# Android Entry Checkpoint Evidence

## Purpose

This record tracks the observable entry checkpoint in
[ADR 0017](../adr/0017-android-prototype-entry-checkpoint.md). It prevents the
Android Companion from starting early and preserves the evidence needed if a
conversation or task is interrupted.

## Current Status

**Accepted for the bounded Android vertical slice.**

The owner accepted this checkpoint on 2026-08-08 HST after PR #38 merged. This
authorizes only the first Android vertical slice in ADR 0017. Every new
third-party component still requires its separate ADR 0025 intake and explicit
owner approval before it enters the repository. Committed generated Kotlin DTOs
remain language-neutral contract output rather than an Android application.

## Checkpoint

| ADR 0017 requirement | Current evidence | Status |
| --- | --- | --- |
| Stable control-plane v1 schemas and representative fixtures | Canonical schema, OpenAPI, manifest, and positive, negative, compatibility, and privacy fixtures under `contracts/` and `tests/contracts/v1/` | Met for first baseline |
| Reproducible Swift and Kotlin generation | `make check-mobile-contracts` verifies deterministic first-party output, compilation, fixtures, and worktree drift | Met |
| Deterministic iOS/iPadOS session loop and journal replay | Remote-service, scenario-engine, contract, and native Companion evidence plus the completed physical MVP rehearsal | Met for the current synthetic scenario |
| Temporary disconnect and same-endpoint resumption without duplicate participant or action | Endpoint-bound rotating resume contract, Worker/Durable Object tests, native Keychain boundary, automated tests, and the deployed physical-iPhone restart exercise recorded below | Met |
| Owner hands-on acceptance of the full iOS/server baseline | The owner completed and reported every required resumption exercise condition as passing, merged the evidence in PR #38, and explicitly confirmed readiness to begin the Android app on 2026-08-08 HST | Met |
| Accepted Android minimum and capability baseline | Android 13/API 33 minimum and the capability policy are recorded in MC-DEL-001 and ADR 0019 | Met |

## Required Hands-On Exercise

After the resumption change is reviewed, merged, and deployed:

1. Create a fresh synthetic session and join one physical iPhone and one iPad
   simulator as distinct participants.
2. Record the Host roster's participant and endpoint identifiers without
   placing them in committed logs or screenshots.
3. Assign characters and obtain a current private projection on both devices.
4. Cast no pending action on the device under test, terminate its app process,
   and relaunch it without rescanning or pasting the invitation.
5. Verify that the Companion reports recovery, receives a fresh private
   projection, and retains the same participant and endpoint in the Host roster
   with no extra roster entry.
6. Repeat with one vote deliberately interrupted around transport loss. Verify
   the outcome is resolved once and the Host journal contains no duplicate
   action.
7. End the session. Relaunch the Companion and verify that it cannot restore
   private content or reuse the ended session.
8. Record only pass/fail outcomes and non-secret build identifiers in the
   existing MVP test record.

## 2026-08-08 HST Exercise Evidence

- Reviewed and deployed source:
  `af43fa47ac956e967d361698d41b4144ae01eae4`.
- Cloudflare Worker version:
  `1aecea5a-e07b-4f61-97ad-b9da1da6ece1`.
- Native product: `GuiltyPartyCompanion` 0.2.0 (3).
- Destinations: physical iPhone 12 Pro Max on iOS 27 developer beta and iPad
  (A16), iOS 26.5 simulator.

The two Companions joined a fresh synthetic session as distinct participants,
received separate character assignments and current private projections, and
remained exactly two entries in the Host roster. The physical iPhone was then
terminated and relaunched without rescanning or pasting the invitation. It
recovered the same participant, endpoint, assignment, and fresh authorized
private projection without creating a duplicate roster entry.

During an open vote, the physical iPhone submitted one vote and was immediately
terminated. After automatic recovery, the Host still reported exactly one vote
and the Companion reconciled the pending action without resubmission. The iPad
then submitted the second vote. The two opposing votes produced the scenario's
deterministic tie behavior—no public outcome—and no duplicate action.

After explicit session end, both Companions reported the ended state and
cleared private content. Terminating and relaunching both applications did not
restore private content or reuse the ended session; each required a fresh
invitation and join. The owner reported every exercise condition as passing.
This operational evidence contains no invitation, authority, participant or
endpoint identifier, private scenario text, or signing identifier.

The exercise satisfies the technical and hands-on evidence requirements.

## Owner Decision

On 2026-08-08 HST, after PR #38 merged, the project owner explicitly stated
that they were ready to work on the Android app. That decision accepts the ADR
0017 checkpoint as a sufficiently stable cross-platform baseline. It does not
approve a public or named-friend Android release, expand the slice into
production accounts, media, notifications, analytics, or distribution, or
pre-approve any third-party component.

## Stop Boundary

The Android entry checkpoint is satisfied. Begin only the bounded vertical
slice described by ADR 0017, and keep its dependency approval, privacy,
contract, and test gates explicit. Do not expand it into accounts, media,
notifications, distribution, or unrelated parity work.
