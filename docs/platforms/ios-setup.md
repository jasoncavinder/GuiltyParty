# Guilty Party iOS Companion MVP Setup

This document covers the manually created SwiftUI development project for the first LAN transport slice. It does not claim that the Companion experience or Bonjour discovery is implemented.

This iOS-only prototype scope is unchanged by
[ADR 0015](../adr/0015-native-mobile-client-strategy.md), which selects
separate native SwiftUI and Jetpack Compose applications for the longer-term
product without authorizing Android implementation in the MVP.

## Current Networking Scope

The Rust server listens on port `3000` on the Mac. A physical iPhone must use the Mac's LAN address, such as `192.168.1.20`; `127.0.0.1` on the phone refers to the phone itself.

The current server does not advertise a Bonjour service. Use an explicit address until server-side mDNS and the matching iOS browser are implemented together. Do not add `_guiltyparty._tcp` to `NSBonjourServices` yet because no such service is advertised.

The prototype uses unencrypted `http` and `ws` only on a trusted development LAN. It is not suitable for internet-facing or commercial deployment.

## 1. Create the Xcode Project

1. In Xcode, choose **File > New > Project**, then **iOS > App**.
2. Use product name `GuiltyPartyCompanion`, organization identifier `com.guiltyparty`, SwiftUI, Swift, and no storage layer.
3. Save the generated project under `clients/companion/`.
4. Do not add third-party packages.

## 2. Configure Local Network Access

In the Companion target's **Info** settings, add:

- `NSLocalNetworkUsageDescription` (`Privacy - Local Network Usage Description`): `Guilty Party connects to a host server on your local network.`
- `NSAppTransportSecurity` (Dictionary) containing `NSAllowsLocalNetworking` (Boolean): `YES`.

When Bonjour is actually implemented, also add the exact advertised service type to `NSBonjourServices`. Local-network permission and App Transport Security are separate controls; both must match the networking behavior.

## 3. Use the Authority-Bearing Protocol

The Companion must first join over HTTP:

```http
POST http://MAC_LAN_ADDRESS:3000/api/v1/join
Content-Type: application/json

{"protocol_version":"1.0","kind":"participant","display_name":"Synthetic Player","endpoint":{"platform":"ios_companion","capabilities":["private_display","touch_input"]}}
```

Use `/api/v1/join`, not the removed unversioned route shown in older prototype
notes. The response contains distinct `session_id`, `endpoint_id`, `room_id`, a
synthetic `participant_id`, and an unpredictable process-local `token`. Keep
the token in memory only for this prototype. Connect the retained WebSocket
task to:

```text
ws://MAC_LAN_ADDRESS:3000/ws/v1?token=URL_ENCODED_TOKEN
```

The WebSocket request must offer the `guiltyparty.control.v1` subprotocol. The
server sends an authorized projection envelope immediately. The client may
request a refresh with the issued context:

```json
{"protocol_version":"1.0","type":"get_projection","message_id":"UNIQUE_MESSAGE_ID","session_id":"ISSUED_SESSION_ID","endpoint_id":"ISSUED_ENDPOINT_ID","payload":{}}
```

The WebSocket task must be owned by a long-lived observable model rather than a local function variable, and it must continuously call `receive` after connecting. Do not log tokens, projection payloads, private objectives, or private clues.

State-changing commands also require a unique `idempotency_id` and the current
`primary_authority_generation`. The prototype issues generation `0`; the
server, not the client, remains authoritative for that value.

## 4. Run a Device Check

1. Set a host token and start the server from the repository root:

   ```sh
   GP_HOST_TOKEN='replace-with-a-random-value-at-least-24-characters' make run-server
   ```

2. Find the Mac's active LAN IPv4 address in **System Settings > Network > Details**.
3. Confirm the Mac and iPhone are on the same trusted network and that client isolation is disabled.
4. Join using the HTTP request above, then connect using the returned token.
5. Verify that an invalid token receives HTTP `401` and that one participant cannot receive another participant's private projection.

## Known Limitations

- The Xcode project has not yet been committed.
- Bonjour/mDNS discovery is not implemented.
- Pairing UX and token transfer are not implemented.
- Authority tokens remain process-local and are invalid after a server restart.
- Canonical scenario state is replayed from the configured local JSONL journal; reconnecting a previously joined participant still requires future pairing/recovery work.
- Plain LAN transport is development-only.
