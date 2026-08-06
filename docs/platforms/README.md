# Platform Documentation

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
- [Open and deliberately deferred mobile decision register](mobile-decision-register.md)

The decision register identifies exactly one active discussion at a time and
preserves the remaining queue across conversations and handoffs.

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
