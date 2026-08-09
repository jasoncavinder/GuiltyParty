# Applications

First-party applications and deployable service implementations live under
this directory, grouped by surface and platform:

- `web/` contains the browser Host Console, browser Companion fallback, and
  their shared browser control-plane client.
- `mobile/iOS/` contains the native iOS/iPadOS player Companion application.
- `mobile/android/` is reserved for the native Android player Companion
  application.
- `tv/` contains Stage applications grouped by television platform.
- `desktop/` is reserved for the future desktop Host application.
- `server/` is the canonical backend application boundary. It contains the
  native Rust workspace and deterministic engine, with the official Cloudflare
  adapter under `server/cloudflare/`.
