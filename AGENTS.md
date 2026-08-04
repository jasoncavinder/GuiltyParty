# AGENTS.md

# Guilty Party Agent Instructions

## Project Purpose

Guilty Party is a multi-platform interactive entertainment platform for hosted narrative experiences.

The initial focus is live murder-mystery style events, but the architecture should support broader interactive storytelling formats including:

- mystery
- horror
- espionage
- fantasy
- science fiction
- courtroom drama
- immersive roleplaying

The platform connects:

- Players
- Hosts
- Creators
- The AI Stage Manager
- Multiple devices and physical rooms

---

# Core Principles

## Human-first entertainment

AI assists human creativity and performance.

AI must not replace hosts, creators, or player agency.

The AI Stage Manager may:

- analyze structured game state
- suggest actions
- assist hosts
- help creators
- generate permitted flavor content

The AI Stage Manager must not:

- silently alter canonical story truth
- expose private player information
- monitor private communications without explicit authorization

---

## Privacy-first architecture

Guilty Party should collect only information necessary to provide:

- gameplay functionality
- payments
- account continuity
- safety enforcement
- abuse prevention

The platform must not:

- sell user data
- collect unnecessary behavioral data
- store private communications indefinitely
- record gameplay by default

Any retained safety-related data must:

- have a documented purpose
- have a defined retention period
- be automatically deleted afterward

---

## Security boundaries

Never expose private participant information through public endpoints.

Private data includes:

- character secrets
- objectives
- hidden evidence
- private messages
- whispers
- private creator content

All secrecy enforcement must happen server-side.

Never rely only on UI hiding.

---

# Architecture Rules

## Physical rooms are first-class entities

A physical room represents a collection of:

- people
- devices
- audio equipment
- display endpoints

Example:

A couple playing from one living room may have:

- one television Stage
- two phones
- two characters
- two separate private interfaces

Never assume:

one person = one device.

---

## Device capabilities

Devices should advertise capabilities rather than being treated as identical.

Examples:

- public display
- private display
- microphone
- camera
- public audio output
- private audio output
- touch input
- remote control input

---

## Scenario truth is deterministic

Scenario logic must remain deterministic and reproducible.

The scenario engine owns:

- timeline
- clues
- evidence
- objectives
- reveals
- voting rules
- outcomes

AI suggestions must operate within scenario constraints.

---

## Control plane and media plane separation

Control plane:

- authentication
- joining events
- device pairing
- scenario state
- reveals
- objectives
- votes
- permissions

Media plane:

- video
- audio
- whispers
- captions
- Stage streams

Do not tightly couple these systems.

---

# Development Practices

Prefer:

- small vertical slices
- documented architectural decisions
- automated tests
- reproducible simulations
- clear contracts

Avoid:

- unnecessary frameworks
- speculative dependencies
- premature microservices
- platform-specific duplication

When changing architecture:

1. Update relevant documentation.
2. Add an ADR if the decision is significant.
3. Explain tradeoffs.

---

# Technology Constraints

Preferred languages:

- HTML
- CSS
- JavaScript
- Swift
- Rust

Use Rust when it provides meaningful benefits.

Potential Rust/WASM areas:

- scenario engine
- simulation
- security-sensitive components
- performance-critical shared libraries

Do not introduce WASM without a clear benefit.

---

# Legal, Licensing, and Ownership

Agents must treat legal and intellectual property concerns as protected project constraints.

Agents must not, without explicit human approval:

- Remove, rename, or replace license files.
- Modify copyright notices or ownership statements.
- Change licensing terms or intellectual property declarations.
- Add dependencies, assets, datasets, fonts, media, or other third-party materials with incompatible, unclear, or restrictive licensing.
- Introduce code or content that may create ownership ambiguity.
- Alter documentation describing ownership, licensing, trademarks, or commercial rights.

When adding third-party dependencies or external materials, agents should:

- Verify the applicable license.
- Confirm compatibility with the project's proprietary licensing model.
- Document the source and license information where appropriate.

The existence of a public repository does not imply that the project is open source.

Agents should preserve the distinction between:

- Public visibility of source code.
- Permission to use, modify, distribute, or commercially exploit the software.

Any uncertainty involving intellectual property, licensing, attribution, ownership, or commercial rights should be escalated for human review before proceeding.

---

# Before Coding

Read:

- README.md
- PLANS.md
- relevant docs/
- relevant package/app instructions

Do not begin implementation without understanding the architectural intent.
