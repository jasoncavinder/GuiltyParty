# Android Entry Checkpoint Evidence

## Purpose

This record tracks the observable entry checkpoint in
[ADR 0017](../adr/0017-android-prototype-entry-checkpoint.md). It prevents the
Android Companion from starting early and preserves the evidence needed if a
conversation or task is interrupted.

## Current Status

**Implementation candidate; owner exercise and acceptance pending.**

This status does not authorize Android application scaffolding, dependencies,
UI, transport adapters, or source code. Committed generated Kotlin DTOs are
language-neutral contract output, not an Android application.

## Checkpoint

| ADR 0017 requirement | Current evidence | Status |
| --- | --- | --- |
| Stable control-plane v1 schemas and representative fixtures | Canonical schema, OpenAPI, manifest, and positive, negative, compatibility, and privacy fixtures under `contracts/` and `tests/contracts/v1/` | Met for first baseline |
| Reproducible Swift and Kotlin generation | `make check-mobile-contracts` verifies deterministic first-party output, compilation, fixtures, and worktree drift | Met |
| Deterministic iOS/iPadOS session loop and journal replay | Remote-service, scenario-engine, contract, and native Companion evidence plus the completed physical MVP rehearsal | Met for the current synthetic scenario |
| Temporary disconnect and same-endpoint resumption without duplicate participant or action | Endpoint-bound rotating resume contract, Worker/Durable Object tests, native Keychain boundary, and iOS/iPadOS automated tests | Implementation complete; physical restart exercise pending |
| Owner hands-on acceptance of the full iOS/server baseline | The owner accepted the full gameplay rehearsal; the new restart-resumption slice still requires hands-on acceptance | Pending |
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

## Stop Boundary

Do not create an Android Studio project or modify an Android application until
the physical restart exercise passes and the owner explicitly accepts this
checkpoint. When accepted, begin only the bounded vertical slice described by
ADR 0017; do not expand it into accounts, media, notifications, distribution,
or unrelated parity work.
