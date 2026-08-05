# MVP Prototype Builder Agent Prompt

Use the following prompt to hand the approved MVP planning work to an
implementation agent.

---

You are building the first private MVP prototype of Guilty Party.

Work in `/Users/jasoncavinder/Projects/GuiltyParty` and follow `AGENTS.md` and
`CONTRIBUTING.md` exactly. Guilty Party is publicly visible but proprietary.
Public visibility does not grant open-source rights.

## First Step: Read and Orient

Before proposing or changing anything, read completely:

- `AGENTS.md`
- `README.md`
- `PLANS.md`, especially **Local Multi-Surface MVP Prototype**
- `CONTRIBUTING.md`
- `LICENSE`, `NOTICE.md`, and `COMMERCIAL_LICENSE.md`
- `docs/product/*`
- `docs/architecture/*`
- `docs/security/*`
- `docs/legal/*`
- `docs/adr/*`
- `docs/platforms/*`

Inspect the repository and available local development environment. Preserve
unrelated user changes.

## Git Workflow

- Synchronize with `origin/dev`.
- Branch from `dev` using a descriptive `feature/...` branch.
- Never commit or push directly to `main` or `dev`.
- Use small, intentional commits.
- Open pull requests targeting `dev`.

## Approval Gate

Do not add frameworks, dependencies, generated project scaffolding, or
production code yet.

First, propose the next numbered ADR for the MVP technology stack. It must cover:

- server language, runtime, and modular structure
- deterministic scenario engine and schema representation
- journal persistence and replay
- HTTP, realtime, and contract representation
- browser Host Console
- LG webOS Stage packaging and developer workflow
- native iOS Companion architecture and LAN networking
- local AI model adapter and configuration
- testing and simulation strategy
- repository layout and developer commands
- each dependency, its purpose, source, and verified license

Compare reasonable alternatives and explain prototype tradeoffs. Mark the ADR
`Proposed`, present it to the project owner, and stop. Do not implement until the
owner explicitly accepts the ADR.

## Approved Product Scope

After ADR approval, build one narrow vertical slice:

- one host
- a small group with at least two distinct participant identities and
  Companions in the acceptance run
- one original, synthetic scenario
- LG webOS Stage
- native iOS Companion development app
- browser-based Host Console
- local server and website reachable on the LAN
- user-supplied medium-sized AI model running locally beside the server

The gameplay loop is:

1. Create and join a session.
2. Register endpoint capabilities.
3. Assign characters.
4. Show public and authorized private information.
5. Advance scenes.
6. Reveal public and private clues.
7. Collect authorized votes.
8. Resolve and display a deterministic outcome.
9. Reconstruct the same final state from the immutable scenario version and
   ordered journal.

## Non-Negotiable Architecture

- A user, participant, character, endpoint, and physical room are distinct.
- The server enforces authorization; UI hiding is never sufficient.
- The Stage receives public projections only.
- Each Companion receives only its participant's authorized projection.
- Scenario truth, reveals, voting, and outcomes are deterministic.
- Published scenario versions are immutable.
- The session journal is ordered, replayable, and contains the minimum state
  transitions needed for reconstruction.
- The journal is not a recording or transcript.
- The AI Stage Manager is advisory, host-only, and non-canonical.
- AI receives an authorized, minimized structured projection.
- AI failure cannot block deterministic gameplay.
- Control-plane state must not be coupled to future production media transport.

## Privacy and Licensing Limits

- Use synthetic data only.
- Do not implement accounts, payments, analytics, advertising, recording,
  transcription, voice, video, private messaging, or whispers.
- Do not use remote AI or analytics services.
- Do not commit model weights, credentials, machine-specific settings, or user
  data.
- Use only original placeholder text and CSS-generated visuals unless a
  third-party material's source and compatible license are verified and
  documented before addition.
- Verify every dependency license for compatibility with this proprietary
  project.
- Do not modify legal, ownership, copyright, or trademark language.

## Explicit Exclusions

Exclude accounts, marketplace features, professional hosting, production media,
Android, tvOS, desktop clients, app-store distribution, internet-facing hosting,
commercial deployment, production moderation, production observability, remote
AI providers, and general-purpose scenario authoring tools.

The native iOS Companion development build and LG webOS Stage development app
are the explicit client exceptions.

## Implementation Expectations After Approval

- Work in small, testable vertical slices.
- Establish deterministic engine and authorization boundaries before relying on
  client behavior.
- Prefer clear contracts and the smallest justified dependency set.
- Add automated negative authorization tests for all private data.
- Add deterministic replay and multi-client simulation tests.
- Use a deterministic test double for AI adapter tests.
- Document LAN setup, device prerequisites, operation, reset, replay, and known
  limitations.
- Keep the work runnable from a clean checkout using documented commands.

## Definition of Done

Meet every acceptance criterion in the active MVP plan in `PLANS.md`. Run the
complete session with the Host Console, LG webOS Stage, and at least two distinct
iOS Companion identities. Demonstrate that replay produces the same state and
outcome, private projections do not leak, and AI suggestions cannot change
canonical truth.

At each handoff, report:

- branch and commit status
- what works end to end
- tests and device checks run
- privacy or licensing review performed
- unresolved human decisions
- known prototype limitations

Do not expand scope merely because an adjacent feature seems useful. Record
future ideas separately and keep the MVP focused.
