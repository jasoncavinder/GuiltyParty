# ADR 0004: MVP Technology Stack

## Status

Accepted

## Date

2026-08-04

---

# Context

The project requires an initial, fully local MVP prototype to validate the core architecture: multi-surface interaction, deterministic scenario engine, strict privacy boundaries, and a local AI Stage Manager. The MVP must run on a Local Area Network (LAN) without internet dependencies, supporting a Host Console, an LG webOS Stage, and native iOS Companions.

In accordance with ADR 0001 and ADR 0003, we must select the specific languages, runtimes, dependencies, and testing strategies that fulfill these requirements while strictly adhering to the project's proprietary constraints, privacy-first principles, and modular monolith architecture.

---

# Decisions

## Server Language, Runtime, and Modular Structure

**Decision:** Rust using `tokio` and `axum`.
**Reasoning:** Rust enforces memory safety and provides excellent concurrency primitives, essential for a real-time event system. `axum` is a lightweight, ergonomic web framework built on `tokio`. We will structure the server as a Cargo workspace with separate crates representing the modules defined in ADR 0003 (e.g., `gp-identity`, `gp-session`, `gp-scenario`).
**Tradeoffs:** Node.js/TypeScript was considered for rapid prototyping, but Rust aligns better with the project's long-term performance and security goals, particularly for the scenario engine and deterministic simulation.

The repository pins the exact Rust toolchain and required formatter/linter components in `rust-toolchain.toml` so local and CI checks remain reproducible.

## Deterministic Scenario Engine and Schema Representation

**Decision:** Pure Rust engine with scenario schemas defined as strict Serde serializable structs (JSON representations).
**Reasoning:** The scenario engine must be completely deterministic. By writing it in Rust without async or side-effecting dependencies, we can ensure reproducibility. The schema will be defined via Rust structs, heavily validating state transitions.
**Tradeoffs:** A scriptable engine (e.g., Lua) was considered, but it introduces security and determinism risks. A pure Rust state machine is safer and easier to test via simulation.

The first published prototype scenario is stored as a versioned JSON fixture and embedded into the local server binary at build time. Startup parses and validates that fixture before replaying any session journal.

## Journal Persistence and Replay

**Decision:** Append-only JSON-lines (`.jsonl`) files on the local filesystem.
**Reasoning:** The MVP requires a deterministic ordered journal of minimum state transitions. An append-only text file is the simplest, most transparent implementation for a local prototype. Replay involves re-ingesting the file line-by-line into the scenario engine.
**Tradeoffs:** SQLite was considered, but for the MVP, direct file I/O avoids database setup overhead while perfectly fulfilling the "ordered journal" requirement. We can migrate to a formal database later.

The prototype journal path is operator-configurable. The server replays an existing journal on startup and persists each accepted transition before publishing the corresponding in-memory state update. Prototype reset remains an explicit operator action.

## HTTP, Realtime, and Contract Representation

**Decision:** HTTP REST for control-plane actions (joining and authority issuance) and WebSockets for realtime control-plane commands and scenario-state projections. The MVP does not implement a media plane. Contracts will be documented as the prototype stabilizes; generating OpenAPI and AsyncAPI descriptions is deferred until the implemented messages are complete enough to justify them.
**Reasoning:** WebSockets provide low-latency bidirectional communication necessary for live events. Formal contract definitions ensure the iOS and webOS clients remain perfectly aligned with the server.
**Tradeoffs:** gRPC was considered but introduces unnecessary complexity for webOS and browser clients at this stage.

Browser origins are an exact operator-configured allowlist, applied to HTTP CORS and WebSocket Origin validation. Native clients may omit an Origin header but still require an authority token. Browser clients receive server addresses and host credentials at runtime; credentials are never compiled into public assets.

## Browser Host Console

**Decision:** Vanilla HTML, CSS, and modern JavaScript (Web Components) without a heavy frontend framework.
**Reasoning:** ADR 0001 states we should avoid introducing frameworks purely because they are popular. A vanilla approach using native Web Components provides encapsulation and progressive enhancement without heavy dependencies.
**Tradeoffs:** React or Vue would accelerate initial UI development but add overhead and dependency licensing complexity. Vanilla JS keeps the prototype lean.

## LG webOS Stage Packaging and Developer Workflow

**Decision:** Vanilla web application packaged using the official LG webOS CLI (`ares-cli`).
**Reasoning:** LG webOS natively supports web applications. Packaging a vanilla HTML/JS app minimizes friction.
**Tradeoffs:** The Enact framework (React-based) is heavily pushed by LG, but introducing React just for the Stage contradicts our minimal framework policy.

## Native iOS Companion Architecture and LAN Networking

**Decision:** Swift and SwiftUI. The first device slice uses explicit LAN addressing and `URLSessionWebSocketTask`. Bonjour/mDNS discovery through Apple's `Network` framework remains the intended follow-up after the server advertises a service.
**Reasoning:** Native capabilities are required per ADR 0001. Explicit addressing makes the initial transport test honest and debuggable; discovery must not be documented as working before both sides implement it.
**Tradeoffs:** React Native or Flutter would allow code sharing with Android, but we are prioritizing native performance, platform feel, and Swift as a core language.

## Local AI Model Adapter and Configuration

**Decision:** A lightweight Rust HTTP client wrapper targeting an OpenAI-compatible endpoint on loopback or an explicit private LAN IP address (for example, LM Studio, Ollama, or llama.cpp). The model and endpoint are operator configuration, never repository defaults. The AI receives a purpose-specific projection that excludes participant names, objectives, private clues, and authorization policy.
**Reasoning:** The MVP requires a user-supplied local model. Relying on the ubiquitous OpenAI REST API standard allows users to plug in Ollama, LM Studio, or llama.cpp effortlessly.
**Tradeoffs:** Native bindings (e.g., `llama-rs`) were considered but would complicate the build process and restrict the user's ability to run the model on a separate dedicated GPU machine on the same LAN.

## Testing and Simulation Strategy

**Decision:** 
1. **Rust Unit Tests:** For the deterministic scenario engine and authorization rules.
2. **Deterministic Test Doubles:** A mock AI adapter that returns hardcoded responses to ensure tests don't require an active LLM.
3. **End-to-End Simulation:** A Rust-based simulation runner that boots the server and connects multiple mock WebSocket clients to simulate a full game loop and verify replayability.
**Reasoning:** We must verify that private projections do not leak and replay produces the same state. Automated headless clients are the most reliable way to test multi-surface interactions.

## Repository Layout and Developer Commands

**Decision:**
```
/
├── server/           # Rust Cargo workspace (backend & engine)
├── clients/
│   ├── host/         # Vanilla JS Host Console
│   ├── stage/        # Vanilla JS LG webOS app
│   └── companion/    # iOS SwiftUI Xcode project
├── docs/             # Documentation
└── Makefile          # Root developer commands
```
**Developer Commands (Makefile):**
- `make setup`: Check the dependencies required by the current slice and report optional platform tooling.
- `make run-server`: Boot the Rust backend.
- `make run-host`: Serve the Host Console locally.
- `make run-stage`: Serve the Stage in a desktop browser for pre-device testing.
- `make build-stage`: Package the webOS app using `ares-cli`.
- `make test`: Run all backend and integration tests.
**Reasoning:** A mono-repo approach with a central `Makefile` provides a unified developer experience.

## Dependencies, Purpose, Source, and Verified License

The following dependencies are approved for the MVP. All have permissive licenses compatible with proprietary commercial development.

| Dependency | Purpose | Source | License |
|---|---|---|---|
| **Rust: `tokio`** | Async runtime for server | crates.io | MIT / Apache 2.0 |
| **Rust: `axum`** | HTTP/WebSocket framework | crates.io | MIT / Apache 2.0 |
| **Rust: `serde`** | JSON serialization/schema | crates.io | MIT / Apache 2.0 |
| **Rust: `serde_json`** | JSON control messages and JSONL journals | crates.io | MIT / Apache 2.0 |
| **Rust: `tracing`** | Structured logging without private payloads | crates.io | MIT |
| **Rust: `tracing-subscriber`** | Local log formatting | crates.io | MIT |
| **Rust: `reqwest`** | Bounded local AI HTTP adapter | crates.io | MIT / Apache 2.0 |
| **Rust: `async-trait`** | Object-safe asynchronous AI adapter boundary | crates.io | MIT / Apache 2.0 |
| **Rust: `uuid`** | Unpredictable prototype authority tokens and synthetic IDs | crates.io | MIT / Apache 2.0 |
| **Rust: `tower-http`** | Exact-origin CORS enforcement for local browser clients | crates.io | MIT |
| **JS: `ares-cli`** | LG webOS packaging | npm | Apache 2.0 |
| **iOS: Foundation**| Networking & WebSockets | Apple | Proprietary (Allowed for iOS targets) |
| **GitHub: `actions/checkout`** | Read-only CI checkout | GitHub Marketplace | MIT |

*Note: Transitive Rust dependencies remain locked in `server/Cargo.lock`. Model weights and local-model runtimes are operator-supplied and must be license-reviewed separately before distribution or commercial use. No model artifact is committed. No third-party AI orchestration or frontend framework is included.*

---

# Consequences

**Positive:**
- Extremely lean dependency tree minimizes licensing risks.
- Pure Rust engine guarantees determinism.
- Local-only configuration and server-authorized projections establish the prototype privacy boundary.
- Native iOS usage aligns with the long-term vision.

**Negative:**
- Writing vanilla Web Components for the Host Console will be more verbose.
- Manual discovery and pairing over LAN (mDNS) can be finicky depending on local network configurations.

---

# Alternatives Considered

*Discussed inline within each decision block to explain prototype tradeoffs.*
