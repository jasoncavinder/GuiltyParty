# Architectural Decision Records

Architectural decision records document significant, long-lived choices and
their tradeoffs. Accepted ADRs remain historical records; changes should be
captured in a new ADR that supersedes the earlier decision.

## Index

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](0001-technology-stack.md) | Accepted | Use a standards-focused multi-platform direction and defer framework choices until justified. |
| [0002](0002-scenario-versioning.md) | Accepted | Published scenario versions are immutable and events reference one version. |
| [0003](0003-modular-monolith.md) | Accepted | Begin with a modular monolith with explicit internal boundaries. |
| [0004](0004-mvp-technology-stack.md) | Accepted | Use a lean Rust/vanilla-web/Swift local prototype stack with deterministic replay and explicit authorization boundaries. |
| [0005](0005-versioned-control-plane-contract.md) | Accepted | Version the HTTP and WebSocket control plane around shared schemas, explicit compatibility, and safe evolution rules. |
| [0006](0006-link-local-service-discovery.md) | Accepted | Discover LAN control-plane servers using a privacy-minimized, untrusted DNS-SD advertisement. |
| [0007](0007-control-plane-transport-security.md) | Accepted | Require HTTPS/WSS before real authentication, private data, external distribution, or production use. |
| [0008](0008-lan-server-certificate-trust.md) | Accepted | Pair native clients to an installation-specific LAN server authority and fail closed on unauthenticated identity change. |
| [0009](0009-connection-resumption-policy.md) | Accepted | Use application heartbeats, bounded retry, idempotent commands, and authorized projection resumption across disconnects. |
| [0010](0010-media-plane-protocol-and-provider.md) | Accepted | Use WebRTC through an SFU and a control-plane-authorized, self-hostable media-provider boundary. |
| [0011](0011-room-audio-processing-ownership.md) | Accepted | Keep acoustic processing at capture endpoints, logical mix-minus at the SFU boundary, and room-audio authority in the control plane. |
| [0012](0012-capture-indicators-and-consent.md) | Accepted | Separate device permission from scoped consent and require persistent, audience-appropriate indicators for capture and processing. |
| [0013](0013-private-audio-route-failure.md) | Accepted | Stop private audio on any audience, encryption, authority, or output uncertainty and recover without replay or public fallback. |
| [0014](0014-room-microphone-arbitration.md) | Accepted | Grant one short-lived room-audible capture lease with explicit speaker intent and break-before-make transfer. |
| [0015](0015-native-mobile-client-strategy.md) | Accepted | Build separate native SwiftUI and Jetpack Compose Companions that share contracts and behavioral evidence rather than a mobile runtime. |
| [0016](0016-generated-mobile-contract-models.md) | Accepted | Generate committed Swift and Kotlin transport DTOs from canonical schemas behind handwritten application boundaries. |
| [0017](0017-android-prototype-entry-checkpoint.md) | Accepted | Begin the first narrow Android slice after the generated contract and complete iOS gameplay baseline are proven. |
| [0018](0018-desktop-host-and-managed-local-server.md) | Accepted | Default desktop Host mode to official remote services while offering a separately bounded managed LAN server to registered hosts. |
| [0019](0019-initial-mobile-os-support-baseline.md) | Accepted | Initially support iOS/iPadOS 18 and Android 13 while building against current stable store-required SDKs. |
| [0020](0020-android-lan-discovery-and-permission-ux.md) | Accepted | Prefer foreground Android NSD and the API 37 system picker, reserving broad LAN access for optional user-chosen conveniences. |
| [0021](0021-mobile-screen-capture-and-stage-casting.md) | Accepted | Block or shield active Companion capture where supported while allowing a separately authorized public Stage casting route. |
| [0022](0022-mobile-audio-route-and-interruption-policy.md) | Accepted | Revalidate mobile input and output after route or lifecycle changes, stopping private media and microphones until safe resumption is confirmed. |
| [0023](0023-physical-device-test-matrix.md) | Accepted | Use tiered virtual, targeted physical, core-lab, and release coverage with real hardware required for privacy-, media-, LAN-, and room-sensitive claims. |
| [0024](0024-mobile-beta-distribution.md) | Accepted | Progress from local and internal testing to named external cohorts, using synthetic data, minimized feedback, explicit gates, and short project-controlled build lifetimes. |
| [0025](0025-third-party-dependency-governance.md) | Accepted | Require owner-approved evidence for third-party necessity, rights, privacy, security, provenance, pinning, inventory, updates, SBOMs, exceptions, and removal. |
| [0026](0026-solo-owner-ai-assisted-mobile-ownership.md) | Accepted | Keep one human owner accountable during solo, AI-assisted operation and grow into one shared mobile team with native platform specialization. |
| [0027](0027-kotlin-multiplatform-reconsideration-thresholds.md) | Accepted | Keep separate native clients unless sustained duplication or divergence triggers a bounded, reversible KMP experiment that passes explicit benefit and quality gates. |
| [0028](0028-mobile-release-parity.md) | Accepted | Require equivalent core product guarantees across supported native clients while permitting disclosed native adaptations and evidence-governed sequential delivery. |
| [0029](0029-companion-local-data-lifecycle.md) | Accepted | Keep private gameplay content memory-only while permitting narrowly scoped, device-bound continuity data with explicit backup exclusions and deletion backstops. |
| [0030](0030-mobile-crash-reporting-and-diagnostics.md) | Accepted | Begin with platform crash evidence and voluntary allowlisted diagnostic bundles, without automatic collection or a third-party SDK. |
| [0031](0031-mobile-notifications-and-live-session-status.md) | Accepted | Use fixed public-safe notifications and an optional per-device live session status that starts after intentional joins. |
| [0032](0032-mobile-store-privacy-and-review-readiness.md) | Accepted | Tie mobile store disclosures, account deletion, review access, ratings, and release approval to evidence from the exact distributed build. |
| [0033](0033-cloudflare-remote-services.md) | Accepted | Use a Worker gateway and one Durable Object per live session, with the shared Rust engine compiled to WebAssembly and separate global data, content, and media adapters. |
| [0034](0034-first-party-mobile-contract-generator.md) | Accepted | Adopt the bounded first-party Rust generator for committed Swift and Kotlin control-plane models with offline regeneration and CI drift checks. |
| [0035](0035-packaged-stage-realtime-authority.md) | Accepted | Give the packaged webOS Stage memory-only bearer authority and short-lived, single-use WebSocket connect tickets without cookie or URL credentials. |
| [0036](0036-packaged-webos-stage-pairing.md) | Accepted | Verify the packaged webOS transport and pair the Stage through a Host-approved 120-second device-code flow. |
| [0037](0037-remote-mvp-client-readiness.md) | Accepted | Separate remote client delivery surfaces and standardize session language, coarse build admission, non-URL invitations, and bounded beta preparation. |
| [0038](0038-development-lifecycle-rehearsal.md) | Accepted | Add a fixed, operator-authenticated development route for deployed hibernation, expiry, and deletion rehearsals without changing ordinary session lifetimes. |
| [0039](0039-server-application-directory.md) | Accepted | Place the native server workspace and Cloudflare adapter under the canonical `apps/server/` application boundary. |
| [0040](0040-bundled-stage-presentation-media.md) | Proposed | Bind one original image and atmosphere loop to a new immutable scenario version through a public presentation manifest and closed packaged-Stage asset registry. |

## Adding an ADR

Use the next sequential four-digit number. Include:

- status and date
- context
- decision
- consequences
- alternatives considered

An ADR should record an approved decision, not silently make one. Proposed ADRs
must identify their status as `Proposed` until approved.
