# ADR 0037: Remote MVP client readiness metadata and delivery

- Status: Accepted
- Date: 2026-08-07

## Context

The native Companion and packaged webOS Stage need stable admission metadata,
while the browser Host and browser Companion fallback need public static
delivery. Session language must be visible before and during a game, and early
external builds need a coarse compatibility gate without installation tracking.

## Decision

- Host static assets will be served from Cloudflare Pages at
  `host.test.guiltyparty.app`.
- The browser Companion fallback will be served separately at
  `play.test.guiltyparty.app`.
- The authoritative Worker remains at `api.test.guiltyparty.app`; there is no
  Stage website.
- Every session records a `gameplay_language` BCP 47 tag. During the compatible
  protocol-v1 migration, omission means `en`. It is distinct from UI, caption,
  and participant communication languages.
- First-party endpoints send an application identifier, human-readable version,
  and monotonically increasing build number. This metadata is coarse,
  non-authoritative, and contains no installation or hardware identifier.
- A configured environment policy admits supported build-number ranges and
  returns an upgrade-required response otherwise. Missing metadata remains
  accepted only while no policy is configured for the pre-client migration.
- Participant invitations use a versioned `GP1.` non-URL transfer payload for QR,
  copy, and manual handoff. The payload is short-lived, secret, memory-only, and
  never logged or placed in persistent browser storage.
- Initial iOS testing progresses to a named external TestFlight group only after
  the documented privacy, support, and release gates pass. Until then, the
  browser Companion is the no-native-app fallback. This decision does not create
  App Store Connect records or invite testers.

## Consequences

- Static clients hold no canonical authority or scenario truth.
- Cross-origin policy remains exact and credentialed browser surfaces stay on
  separately controlled origins.
- Build policy can retire unsafe clients without collecting device identifiers,
  but application build numbers must remain monotonic.
- The invitation encoding can evolve through a new prefix without changing
  authority semantics.

## Alternatives considered

- **One shared Pages site:** rejected to keep Host and participant surface
  boundaries explicit.
- **Semantic-version comparison at the edge:** rejected because build-number
  ordering is simpler and less ambiguous.
- **Universal-link invitation containing the proof:** deferred because the MVP
  requires a non-URL transfer path and link leakage controls are not yet proven.
