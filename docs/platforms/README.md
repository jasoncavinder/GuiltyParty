# Platform Documentation

- [Cloudflare deployment runbook](cloudflare-deployment.md)
- [Remote Friends MVP test readiness](remote-friends-test-readiness.md)
- [Remote Friends MVP service contract](remote-friends-mvp.md)
- [Remote MVP client delivery preparation](remote-client-delivery.md)
- [webOS packaged Stage transport spike](webos-transport-spike.md)
- [Packaged LG webOS Stage build and test runbook](webos-stage-build-and-test.md)

This directory will hold platform-specific constraints and integration notes.
It does not commit the project to a framework or shared implementation strategy.

## Current Targets

The documented initial targets are:

- standards-focused web experiences
- iOS and Android participation
- LG webOS Stage support
- Apple tvOS Stage support

Browser display, casting, and screen mirroring are fallback paths.

## Prototype Notes

- [Browser Host and Stage runbook](browser-prototype.md)
- [iOS Companion setup status](ios-setup.md)

## Mobile Direction

- [Mobile contract generation runbook](mobile-contract-generation.md)
- [Accepted Mobile Companion product decisions](../product/mobile-companion.md)
- [Native mobile client strategy](../adr/0015-native-mobile-client-strategy.md)
- [Initial mobile OS support baseline](../adr/0019-initial-mobile-os-support-baseline.md)
- [Android LAN discovery and permission UX](../adr/0020-android-lan-discovery-and-permission-ux.md)
- [Mobile screen-capture protection and Stage casting](../adr/0021-mobile-screen-capture-and-stage-casting.md)
- [Mobile audio routes and interruptions](../adr/0022-mobile-audio-route-and-interruption-policy.md)
- [Physical-device test-matrix policy](../adr/0023-physical-device-test-matrix.md)
- [Living mobile test matrix and available environment](mobile-test-matrix.md)
- [Mobile beta-distribution policy](../adr/0024-mobile-beta-distribution.md)
- [Mobile beta-distribution status and checklist](mobile-beta-distribution.md)
- [Third-party dependency and SDK governance](../adr/0025-third-party-dependency-governance.md)
- [Solo-owner and future mobile-team policy](../adr/0026-solo-owner-ai-assisted-mobile-ownership.md)
- [Current mobile ownership and agent roles](mobile-ownership.md)
- [Kotlin Multiplatform reconsideration thresholds](../adr/0027-kotlin-multiplatform-reconsideration-thresholds.md)
- [Kotlin Multiplatform evidence and experiment record](kmp-reconsideration-evidence.md)
- [Mobile release-parity policy](../adr/0028-mobile-release-parity.md)
- [Living mobile release-parity matrix](mobile-release-parity.md)
- [Companion local-data lifecycle](../adr/0029-companion-local-data-lifecycle.md)
- [Mobile crash-reporting and diagnostics policy](../adr/0030-mobile-crash-reporting-and-diagnostics.md)
- [Mobile diagnostics policy checklist](../security/mobile-diagnostics.md)
- [Mobile notification and Live Session Status policy](../adr/0031-mobile-notifications-and-live-session-status.md)
- [Mobile notification and live-status checklist](../security/mobile-notifications.md)
- [Mobile store privacy and review-readiness policy](../adr/0032-mobile-store-privacy-and-review-readiness.md)
- [Mobile store release evidence checklist](mobile-store-release.md)
- [Completed mobile decision register](mobile-decision-register.md)

The decision register identifies exactly one active discussion while tracked
questions remain and preserves the accepted history across conversations and
handoffs. The initial mobile decision queue is now complete.

## Deferred Targets

Deferred television targets include:

- Samsung Tizen
- Android TV and Google TV
- Amazon Fire OS
- Amazon Vega
- Roku
- Vizio CastOS
- VIDAA and V Home OS

Desktop applications are also deferred.

The accepted product boundary for a future host-oriented desktop application is
recorded in [ADR 0018](../adr/0018-desktop-host-and-managed-local-server.md):
official remote hosting is the default, with an explicit managed local-server
option for authenticated registered hosts. This does not authorize desktop
implementation in the current MVP.

## Documentation Rule

Platform documents should describe capabilities and constraints rather than
assuming that every device behaves identically. Shared protocols and domain
models are preferred where practical, while platform-specific interfaces remain
acceptable when they provide a material benefit.

Implementation-specific choices require evidence and, when significant, an ADR.
