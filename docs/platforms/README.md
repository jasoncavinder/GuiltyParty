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

## Documentation Rule

Platform documents should describe capabilities and constraints rather than
assuming that every device behaves identically. Shared protocols and domain
models are preferred where practical, while platform-specific interfaces remain
acceptable when they provide a material benefit.

Implementation-specific choices require evidence and, when significant, an ADR.
