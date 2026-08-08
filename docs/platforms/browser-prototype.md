# Legacy local browser prototype

## Status

Archived as implementation history. The local Rust server and browser-tested
Stage remain useful automated evidence, but the old process-token Host Console
has been replaced by the Remote Friends Browser Host. Do not use this document
as the current MVP startup runbook.

Current browser-client build, local review, and manual deployment instructions
are in [remote-client-delivery.md](remote-client-delivery.md). The remote
control-plane behavior is in
[remote-friends-mvp.md](remote-friends-mvp.md).

## Preserved local evidence

The local server persists its synthetic journal under
`server/data/mvp-session.jsonl` by default and replays it against the embedded
scenario version on restart. Its original unit and integration coverage still
proves deterministic scenario behavior, recipient projections, and journal
replay. `make test` remains the supported way to exercise that evidence.

The legacy server uses process-local authority and plain HTTP suitable only for
isolated development. It does not represent the accepted Cloudflare cookie,
native bearer, packaged-Stage ticket, hibernation, or retention architecture.
Do not expose it to named testers or use its old URL-token transport as a design
precedent.
