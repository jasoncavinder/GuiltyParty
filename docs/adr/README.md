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

## Adding an ADR

Use the next sequential four-digit number. Include:

- status and date
- context
- decision
- consequences
- alternatives considered

An ADR should record an approved decision, not silently make one. Proposed ADRs
must identify their status as `Proposed` until approved.
