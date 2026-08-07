# webOS packaged Stage transport spike

Status: approved, not yet run. This is evidence gathering, not Stage product
implementation.

Test a minimal packaged application against `api.test.guiltyparty.app` on the
physical LG `65NANO85UNA` (webOS TV `5.6.2-21`) first, then the installed webOS
6 and 22–26 simulators. Record:

- the exact `Origin` emitted by packaged-app HTTPS and WSS requests;
- whether custom authorization headers are supported for HTTPS and WebSocket
  establishment;
- cookie creation, persistence, SameSite behavior, and clearing;
- TLS/certificate behavior against the Cloudflare test endpoint;
- foreground, suspend, resume, network-loss, and reconnect behavior;
- WebSocket subprotocol support and close-code visibility.

Use synthetic data and a disposable test authority. Do not put pairing proofs in
URLs, logs, local storage, screenshots, or source. The result must verify ADR
0035's memory-only bearer and single-use ticket-subprotocol transport on the
oldest physical target; a failed or incomplete verification blocks Stage
application implementation.
