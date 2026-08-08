# Remote MVP browser-client delivery

## Status

The dependency-free Browser Host and Browser Companion fallback are implemented
as reviewable static assets. They are not deployed by this document. The first
deployment must use a clean, reviewed `dev` commit and the manual procedure
below; branch previews and automatic GitHub deployments remain disabled.

## Intended test surfaces

| Surface | Address | Authority boundary |
| --- | --- | --- |
| Browser Host | `host.test.guiltyparty.app` | Cloudflare Pages; exact-origin HttpOnly Host authority |
| Browser Companion fallback | `play.test.guiltyparty.app` | Cloudflare Pages; participant cookie, projection, and vote only |
| Control plane | `api.test.guiltyparty.app` | Worker and Durable Objects; canonical authority and secrecy |
| Packaged LG Stage | No website | Sideloaded local assets; public Stage projection only |

The browser surfaces share only a small first-party control-plane client. They
use no framework, package dependency, analytics, external asset, persistent
browser storage, media API, or remote AI. The Host bootstrap proof and GP1
invitation are cleared from form controls after use. Gameplay authority remains
in Secure, HttpOnly, SameSite=Strict cookies owned by the API hostname.

## Build and local review

From the repository root:

```sh
make build-remote-clients
```

This creates disposable output in:

- `.tmp/remote-clients/host`
- `.tmp/remote-clients/play`

The source directories deliberately do not contain a copied shared module;
only the build output is directly servable. `make run-host` serves the Host at
`http://localhost:8080`, and `make run-play` serves the Companion fallback at
`http://localhost:8082`. To use a local Worker, append an explicit localhost
API override such as `?api=http://127.0.0.1:8787`. Production output defaults
only to `https://api.test.guiltyparty.app`.

`make test-remote` verifies the source privacy constraints, GP1 compatibility,
build metadata, and isolated Pages output. `make check-cloudflare` verifies the
API bundle and accepted client-build policy.

## Manual Pages promotion

The approved development project names are:

- `guilty-party-host-test`
- `guilty-party-play-test`

After this implementation is merged, update local `dev` to the reviewed remote
commit, require a clean worktree, run the full verification suite, and build the
static output. Create each project only if `wrangler pages project list --json`
confirms it does not already exist:

```sh
./node_modules/.bin/wrangler pages project create guilty-party-host-test --production-branch dev
./node_modules/.bin/wrangler pages project create guilty-party-play-test --production-branch dev
```

Deploy the two distinct output roots with pinned local Wrangler, attaching the
exact reviewed commit and `--commit-dirty=false`:

```sh
./node_modules/.bin/wrangler pages deploy .tmp/remote-clients/host \
  --project-name guilty-party-host-test --branch dev \
  --commit-hash '<reviewed-dev-commit>' --commit-dirty=false

./node_modules/.bin/wrangler pages deploy .tmp/remote-clients/play \
  --project-name guilty-party-play-test --branch dev \
  --commit-hash '<reviewed-dev-commit>' --commit-dirty=false
```

In Cloudflare, attach only `host.test.guiltyparty.app` to the Host project and
only `play.test.guiltyparty.app` to the Companion project. Verify active DNS and
certificates, the committed response headers, absence of directory listing,
and that the default Pages hostname does not become an advertised test entry
point. Do not put a Host bootstrap proof, authority credential, invitation,
account identifier, or player alias into a Pages environment variable.

## Post-deployment rehearsal

Before inviting a named tester:

1. Verify both Pages responses send the committed CSP, `no-store`, referrer,
   permissions, framing, and content-type headers.
2. Create a session through the Browser Host and confirm the operator proof is
   cleared.
3. join two synthetic browser participants through separate browser profiles;
   confirm each receives only its own private objective and authorized clues.
4. Reload all three browser tabs and confirm their HttpOnly-cookie contexts
   recover automatically without a credential in a URL or browser storage.
5. Rotate and close invitations, approve a synthetic Stage code, list and
   revoke an endpoint, complete the deterministic story, and end the session.
6. Repeat negative-origin requests and the automated remote game, Stage
   boundary, lifecycle, hibernation, deletion, and ticket rehearsals.
7. Record the Pages deployment identifiers and physical-client evidence in the
   readiness record without copying private content or credentials.

Client builds send `application_id`, `application_version`, and `build_number`.
The committed external-test policy currently admits build 1 or later for
`host_web`, `companion_web`, `companion_ios`, and `stage_webos`. Application
version is display metadata; build number controls admission. Raising a minimum
is a reviewed compatibility operation, not an identity or authorization
mechanism.
