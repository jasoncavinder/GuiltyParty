# ADR 0010: Media-Plane Protocol and Provider Boundary

## Status

Accepted

## Date

2026-08-06

---

# Context

Guilty Party needs low-latency audio, video, whispers, captions, and room-aware
routing across browser, iOS, iPadOS, Android, Stage, and possible desktop
surfaces. Sessions may use a remote service or an isolated LAN server. Media
transport must not become a second authority for participant identity,
permissions, scenario truth, consent, or retention.

Peer-to-peer mesh would make audience enforcement, room-aware routing, and
larger sessions increasingly complex. A proprietary hosted-only media service
would conflict with isolated-LAN operation and make the product dependent on
one vendor's runtime and identity model. Building a new media server would add
substantial security and interoperability risk without providing product
differentiation.

The selected approach therefore needs a standards-based transport, a
self-hostable forwarding topology, native and browser support, explicit
privacy boundaries, and a replaceable provider adapter.

---

# Decision

## Protocol and Topology

Guilty Party uses WebRTC for realtime audio and video. The normal multiparty
topology uses a selective forwarding unit (SFU), not a peer-to-peer mesh. TURN
fallback is part of internet-facing deployment; isolated LAN sessions normally
connect directly to the local media service.

Captions and other ephemeral media-timing messages may use an encrypted,
recipient-scoped realtime data channel behind the same media abstraction. They
are media-plane data, are not canonical scenario events, and are not retained
by default. Gameplay commands, permissions, votes, reveals, and other
canonical state remain on the versioned control-plane protocol defined by ADR
0005.

## Deployment Model

The same Guilty Party media interface supports:

- a self-hosted, single-node SFU beside the Guilty Party server for LAN play
- a self-hosted regional deployment for remote play
- an approved managed deployment when operational needs justify it

A local SFU is a bounded media-plane component, not a decomposition of the
application's control plane into general-purpose microservices. A future
desktop host application may supervise both the control-plane server and this
media component, but that packaging remains MC-ARCH-004.

No core session flow may require a third-party cloud media account at runtime
when the session is configured for isolated-LAN operation.

## Guilty Party Provider Boundary

Guilty Party owns a media-provider interface that expresses product concepts
without exposing provider objects as domain authority. It must cover at least:

- media-room lifecycle and health
- short-lived, endpoint-bound connection grants
- publish, unpublish, subscribe, unsubscribe, mute, and revocation operations
- authorized audience and track routing
- pseudonymous mapping among session, room, participant, endpoint, channel, and
  provider identifiers
- capability and failure reporting needed by control-plane policy

The interface should model the primitives Guilty Party actually requires. It
must not become a speculative lowest-common-denominator framework, and only one
provider adapter needs to be implemented initially. Provider-specific tokens,
room identifiers, metadata, webhooks, and SDK objects stay behind the adapter.

## Authorization Boundary

The Guilty Party control plane remains authoritative for:

- account, participant, endpoint, session, and physical-room identity
- admission, membership, roles, and endpoint authority
- who may publish, receive, or target each communication
- active-microphone and private-route policy
- consent for capture, captions, transcription, recording, or AI access
- scenario truth, events, journals, and deterministic replay

The media provider performs transport and server-enforced delivery only after
receiving derived, minimum-authority grants. It must not infer authorization
from display names, provider-room presence, client UI state, or a client's
subscription choices.

Clients receive short-lived provider grants from the authenticated Guilty
Party control plane. Grants use opaque, session-scoped provider identities,
contain no character names, objectives, clues, account identifiers, or other
scenario secrets, and permit only the necessary room, source, publication, and
subscription actions. Provider credentials are not Guilty Party account or
session credentials.

Self-hosted provider grants use a deliberately short lifetime because immediate
token revocation may not be available. Removing an endpoint, changing its
authority, or ending a route stops grant renewal and actively removes or
updates the connected provider participant. Reconnection always returns to the
control plane for current authority; a cached provider grant never restores
Guilty Party membership by itself.

## Private Media and Audience Enforcement

Private audio, video, whisper, and caption routes fail closed. Their authorized
audience must be enforced by the media service, not merely by selective
rendering or hidden controls on clients. An adapter may use provider rooms,
server-enforced track permissions, or another reviewed primitive, but it must
prove through negative tests that an authenticated yet unauthorized endpoint
cannot discover or subscribe to the private track.

If a provider cannot enforce the required audience for a route, the route is
unavailable and the safe capability-degradation policy applies. It is never
routed through a public Stage, shared speaker, unauthorized participant, AI
process, or recording service as a fallback.

## Encryption and Capture

Authenticated WebRTC transport encryption is mandatory. Private media and
recipient-scoped realtime data also use application-level end-to-end encryption
when the provider does not need authorized access to the content. Key material
is distributed through the Guilty Party trust and control boundary, not through
public provider metadata.

Server-side media processing is a separate, explicit route. Captions,
transcription, recording, moderation, or mixing that requires plaintext access
must be visibly authorized for its stated audience and purpose and must follow
the applicable consent and retention policy. End-to-end encryption is never
silently disabled to admit a processor. Recording, egress, transcription,
passive microphone monitoring, and AI media access are off by default.

The media provider receives no scenario truth or private player content beyond
the media an explicitly authorized route requires. Operational metrics are
limited to what is necessary for quality and reliability and do not become
behavioral analytics.

## Reference Provider

The initial reference adapter targets the self-hostable LiveKit SFU. The choice
is based on its WebRTC SFU topology, local and self-hosted deployment options,
browser, Swift, Android, and Rust support, selective subscription and track
permission primitives, end-to-end encryption support, and Apache-2.0-licensed
open-source server.

This ADR does not approve adding a dependency by itself. Before implementation,
the exact server release, client SDKs, transitive dependencies, notices,
privacy behavior, and update process require the normal licensing and security
review. Before any real private media is carried, a focused integration proof
must verify:

- application-controlled trust of the ADR 0008 installation authority on
  supported native clients
- LAN discovery and connection without a cloud runtime dependency
- server-enforced private-audience denial on Swift, Android, and browser test
  clients
- short-lived grant expiry, removal, reconnection, and fail-closed behavior
- end-to-end encryption and key removal for the required private routes

Failure of one of these proofs requires revisiting the adapter or deployment
choice; it does not relax the security boundary.

---

# Consequences

## Positive

- WebRTC supplies a mature, encrypted, cross-platform transport standard.
- An SFU supports selective routing without peer-to-peer mesh growth.
- Self-hosting preserves isolated-LAN operation and deployment control.
- The control plane remains the sole authority for identity, permissions, and
  deterministic game state.
- A narrow provider boundary limits lock-in while avoiding speculative
  multi-provider work.
- Private-route and capture requirements are explicit before implementation.

## Negative

- Operating an SFU and TURN service adds networking and deployment complexity.
- Native LAN certificate handling requires an early compatibility proof.
- Self-hosted token invalidation needs short grant lifetimes plus active
  removal and renewal denial.
- End-to-end encryption complicates key lifecycle, recovery, diagnostics, and
  any consented server-side processing.
- A provider adapter and contract-level privacy tests add maintenance work.

---

# Alternatives Considered

## Peer-to-Peer Mesh

Rejected as the normal topology because bandwidth, route control, and audience
management become harder as rooms and endpoints grow. A direct WebRTC path may
still be used by a provider as an optimization only if authorization and
behavior remain equivalent.

## Hosted-Only Media Provider

Rejected because isolated-LAN play must not require an external media service
at runtime.

## Build a Guilty Party Media Server

Rejected because implementing NAT traversal, congestion control, codec
interoperability, encryption, and platform integration is high-risk work with
little initial product differentiation.

## Put Gameplay State on WebRTC Data Channels

Rejected because it would blur the control/media boundary and create a second
path for canonical commands, authorization, sequencing, and replay.

## Expose Provider Models Throughout the Product

Rejected because provider identity and room semantics would become product
authority and make replacement, LAN deployment, and privacy review harder.

---

# References

- [W3C WebRTC Recommendation](https://www.w3.org/TR/webrtc/)
- [LiveKit self-hosting overview](https://docs.livekit.io/transport/self-hosting/)
- [LiveKit tokens and grants](https://docs.livekit.io/home/server/generating-tokens)
- [LiveKit track subscription](https://docs.livekit.io/transport/media/subscribe/)
- [LiveKit encryption overview](https://docs.livekit.io/transport/encryption/)
- [LiveKit server repository and license](https://github.com/livekit/livekit)
