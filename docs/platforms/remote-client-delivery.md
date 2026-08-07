# Remote MVP client delivery preparation

No static client is deployed by this document.

## Intended test surfaces

| Surface | Address | Authority boundary |
| --- | --- | --- |
| Browser Host | `host.test.guiltyparty.app` | Cloudflare Pages; exact-origin HttpOnly session authority |
| Browser Companion fallback | `play.test.guiltyparty.app` | Cloudflare Pages; participant-only projection and commands |
| Control plane | `api.test.guiltyparty.app` | Worker and Durable Objects; canonical authority and secrecy |
| Packaged LG Stage | No website | Sideloaded local assets; public Stage projection only |

Before enabling either Pages origin, add only its exact HTTPS origin to the
Worker allowlist, verify credentialed preflight behavior, and run negative
cross-origin tests. Keep deployment manual until source, preview/production
separation, rollback, and least-privilege automation are reviewed.

Client builds send `application_id`, `application_version`, and `build_number`.
Set `CLIENT_BUILD_POLICY_JSON` before external testing. Example synthetic policy:

```json
{
  "host_web": { "minimum_build_number": 1 },
  "companion_ios": { "minimum_build_number": 1 },
  "stage_webos": { "minimum_build_number": 1 }
}
```

An absent policy is a temporary migration state, not an external-test setting.
Application version is display metadata; build number controls ordering.
