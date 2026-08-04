# ADR 0001: Initial Technology Stack Direction

## Status

Accepted

## Date

2026-08-04

---

# Context

Guilty Party requires support for:

- Web applications
- Mobile applications
- Smart TVs
- Apple TV
- Future desktop applications
- Real-time communication
- Interactive storytelling
- AI-assisted features

The platform must balance:

- Development efficiency
- Performance
- Long-term maintainability
- Platform compatibility
- Developer familiarity

---

# Decision

Guilty Party will initially follow a standards-focused, multi-platform architecture.

The project will prioritize:

- HTML
- CSS
- JavaScript
- Swift
- Rust

Additional technologies may be introduced only when they provide clear value.

---

# Web

The web platform will prioritize:

- Standards compliance
- Progressive enhancement
- Maintainable client architecture

Framework decisions remain intentionally open.

The project should avoid introducing frameworks purely because they are popular.

---

# Mobile

Initial targets:

- iOS
- Android

Shared logic should be maximized where practical.

Native platform capabilities should be used where they materially improve:

- Performance
- Audio handling
- Notifications
- Device integration

---

# Smart TV

Initial targets:

- LG webOS
- Apple tvOS

Future targets:

- Samsung Tizen
- Android TV
- Fire OS
- Roku
- Additional platforms

TV applications should share:

- Protocols
- Design concepts
- Domain models

They should not be forced into identical implementations.

---

# Rust

Rust may be used when it provides meaningful benefits.

Potential uses:

- Scenario engine
- Shared libraries
- Simulation
- Security-sensitive functionality
- Performance-critical systems

---

# WebAssembly

WASM should be considered when:

- Shared Rust logic is valuable.
- Performance matters.
- Browser execution is beneficial.

WASM should not be introduced without a clear architectural advantage.

---

# Desktop

Desktop applications are deferred.

If implemented:

Preferred direction:

- Native applications
- Shared Rust/domain libraries
- Platform-specific user interfaces

The project should avoid assuming that wrapping a web application is always the correct desktop strategy.

---

# Backend

The backend should initially favor:

- Modular architecture
- Clear boundaries
- Strong contracts

Database:

- PostgreSQL preferred

---

# Consequences

Positive:

- Avoids premature framework lock-in.
- Preserves platform flexibility.
- Enables experimentation.

Negative:

- More architectural decisions remain open.
- More platform-specific work may exist.

---

# Alternatives Considered

## Single cross-platform framework

Rejected because:

- Different platforms have different interaction models.
- Television and desktop experiences are fundamentally different.
- Native capabilities matter.

## Full native implementation immediately

Rejected because:

- Too much duplicated effort.
- Slower validation.

## Large frontend framework commitment

Deferred until actual requirements justify it.
