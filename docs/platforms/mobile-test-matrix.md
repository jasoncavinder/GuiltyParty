# Mobile Test Matrix

## Purpose

This living document maps available test equipment and tools to the coverage
roles required by
[ADR 0023](../adr/0023-physical-device-test-matrix.md). It records capability,
not ownership, purchase authorization, CI configuration, or guaranteed
availability. Update it when a device, operating system, SDK, or supported
coverage role changes.

## Available Local Environment

Physical inventory reported on 2026-08-06; Android emulator execution updated
on 2026-08-08:

| Surface | Available environment | Current coverage | Important limitation or follow-up |
| --- | --- | --- | --- |
| iPhone | iPhone 12 Pro Max, iOS 27 developer beta | Physical iPhone and next-version preview behavior | Does not satisfy the minimum-iOS or latest-stable-iOS release cells; confirm compatible beta Xcode before deploying each preview build |
| iPad | None reported | Simulator only | A first-class physical iPad remains required |
| Android phone | No physical device; Medium Phone AVD with Android 17 developer preview/API 37.1, Google APIs Play Store, arm64-v8a | Compact 411dp phone layout and instrumented contract/privacy suite passed | Preview emulation does not satisfy physical API 33, current Google-reference, or current Samsung coverage |
| Android tablet | No physical device; the same isolated preview image exercised at 2560x1600/240dpi (`sw1067dp`) | Expanded tablet-class layout and instrumented contract/privacy suite passed | A representative physical Android tablet and a distinct tablet hardware profile remain required |
| Apple Stage | Apple TV 4K | Physical Apple Stage and AirPlay-target testing | Record hardware generation and tvOS version before using it as release evidence |
| LG webOS Stage | LG `65NANO85UNA`, webOS TV `5.6.2-21` | Physical legacy LG Stage and room integration | Does not replace coverage for newer webOS generations |
| Development host | 2026 MacBook Pro, M5 Max, 64 GB, macOS 26.6 Tahoe | Local server, browser Host Console, simulator host, and isolated-LAN test control | Machine-specific identifiers and configuration remain outside the repository |
| Browser surfaces | Safari and Dia, a Chromium-based browser | Safari and one Chromium-family local smoke path | Does not by itself establish support for every Chromium browser or Firefox |

## Installed Development Tools

Inventory reported on 2026-08-06:

- Xcode 26.6; locally verified as build `17F113`
- Android Studio Quail 3; Medium Phone AVD with Android 17 developer
  preview/API 37.1, Google APIs Play Store, 16KB page size, arm64-v8a
- webOS Studio SDK for Visual Studio Code
- `webOS_TV_6.0_Simulator`
- `webOS_TV_22_Simulator`
- `webOS_TV_23_Simulator`
- `webOS_TV_24_Simulator`
- `webOS_TV_25_Simulator`
- `webOS_TV_26_Simulator`

Developer-beta device support must be checked against the installed Xcode beta
toolchain before a preview-device result is scheduled. A simulator result is
recorded with its exact runtime and does not count as physical-device evidence.

## Current Coverage Gaps

The present local environment does not yet provide:

- a physical iPhone retained on iOS 18
- a physical iPhone on the latest stable iOS
- any physical iPad, including minimum and latest-stable coverage
- an Android 13/API 33 physical phone
- a current Google-reference Android phone
- a current Samsung midrange Android phone
- a representative physical Android tablet
- recorded Apple TV generation and tvOS version
- newer physical LG webOS Stage coverage
- a second physical room and enough personal endpoints for the complete multi-
  room and phone-to-tablet handoff matrix
- representative wired, classic Bluetooth, LE Audio, and accessibility input
  equipment

These are planned coverage gaps, not an instruction to purchase everything at
once. A feature remains unclaimed, disabled, externally supplemented, or
blocked at its release gate until its required physical evidence exists.

## Suggested Acquisition or Access Order

Acquisition follows the next active implementation risk rather than a fixed
shopping schedule. With the current inventory, the default order is:

1. one physical Android phone suitable for the active Android development slice
2. one physical iPad for the first-class tablet experience
3. one representative physical Android tablet
4. stable and minimum-OS Apple coverage distinct from the preview iPhone
5. the missing Google-reference, Samsung, and API 33 Android roles
6. additional audio-route, accessibility, and second-room equipment

Borrowed, rented, beta-tester, or approved device-lab access may satisfy a role
when it can produce the required evidence. Local room, LAN, acoustic, capture,
and AirPlay tests still require locally coordinated physical hardware.

## Run Records

A qualifying record identifies:

- build and contract version
- synthetic scenario fixture version
- coverage role and device model
- OS or simulator runtime version
- network, room, and media-route class when relevant
- test suite or manual runbook version
- result and issue reference

Do not include production credentials, authentication secrets, raw private
media, scenario secrets, participant communications, hardware serial numbers,
Bluetooth addresses, or unrelated machine configuration.

The first Android execution record is
[Android Companion MVP Test Record](android-companion-mvp-test-record.md).
