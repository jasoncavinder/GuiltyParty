# Guilty Party

## Overview

Guilty Party is a platform for live, hosted interactive entertainment experiences.

The initial concept is a digital murder-mystery platform where participants join as fictional characters, interact with other players, receive private information, investigate clues, and collaborate or compete within a guided story.

The platform combines:

- interactive storytelling
- online social experiences
- tabletop roleplaying concepts
- live performance
- digital game systems

The goal is to create a new category of entertainment:

> A hosted interactive story where every participant becomes part of the performance.

## License

Guilty Party is proprietary software.

The source code is publicly available for educational,
portfolio, and evaluation purposes.

No permission is granted to use this software,
create derivative works, distribute copies,
or operate commercial services based on this code
without explicit authorization.

See the [proprietary license](LICENSE), [project notice](NOTICE.md),
[commercial licensing overview](COMMERCIAL_LICENSE.md), and
[licensing policy](docs/legal/licensing.md) for details.

Public visibility of this repository does not make Guilty Party open source.

## Prototype Development Status

The repository currently contains an early local-only server, deterministic scenario engine, versioned synthetic scenario fixture, and browser proof-of-concept Host and Stage surfaces. It is not yet the complete playable MVP, a production service, or commercially deployable software.

Run the current checks with:

```sh
make setup
make test
```

The server requires a process-local host credential and does not load `.env` files automatically:

```sh
GP_HOST_TOKEN='replace-with-a-random-value-at-least-24-characters' make run-server
```

Copy the variable names from `.env.example` into your own ignored local configuration if desired; never commit real tokens. The AI adapter is disabled unless both `GP_AI_ENDPOINT` and `GP_AI_MODEL` are set, and it rejects public/remote endpoints.

Browser clients receive the server address and Host credential at runtime. The server uses an exact browser-origin allowlist and persists its synthetic session journal under `server/data/` by default. See the [browser prototype runbook](docs/platforms/browser-prototype.md) for setup, replay, and reset instructions.

The Stage has only been exercised as a browser proof of concept. It is not yet packageable because approved original icon assets and `appinfo.json` are not present. The native iOS project and physical-device workflows also remain incomplete; see the [iOS setup status](docs/platforms/ios-setup.md).

## Documentation

- [Documentation index](docs/)
- [Product vision](docs/product/vision.md)
- [Experience model](docs/product/experience-model.md)
- [Architecture notes](docs/architecture/README.md)
- [Security and privacy](docs/security/)
- [Architectural decision records](docs/adr/)
- [Platform documentation](docs/platforms/)
- [Product roadmap](docs/roadmap/)
- [Contributing](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)

---

# Ecosystem

Guilty Party consists of three primary communities.

## Players

Players participate in events.

They may:

- join private groups
- purchase seats in public events
- maintain preferences
- save history
- participate anonymously or with an account

---

## Hosts

Hosts run live experiences.

Hosts may be:

- friends running private events
- professional performers
- community members

Hosts guide pacing, presentation, and player interaction.

---

## Creators

Creators design scenarios.

Creators provide:

- story concepts
- characters
- clues
- evidence
- objectives
- branching logic
- artwork
- audio
- themes

Creators allow Guilty Party to scale beyond a single author's imagination.

---

# Experience Model

## Stage

The Stage is the shared public experience.

Examples:

- television
- browser display
- casting target
- large monitor

The Stage shows:

- host presentation
- public participants
- scenes
- evidence
- announcements
- timers

---

## Companion

The Companion is the player's private interface.

Examples:

- phone
- tablet
- browser

The Companion contains:

- character information
- private objectives
- inventory
- evidence
- notebook
- voting
- private interactions

---

## Host Console

The Host Console manages:

- event flow
- reveals
- pacing
- player support
- safety controls

---

## AI Stage Manager

The AI Stage Manager assists hosts and creators.

It may:

- track structured game state
- identify pacing issues
- suggest interventions
- assist preparation
- generate permitted content

It does not replace human hosts.

---

# Platform Vision

Initial platforms:

- Web
- iOS
- Android
- LG webOS
- Apple tvOS

Future platforms:

- Samsung Tizen
- Android TV / Google TV
- Amazon Fire OS
- Amazon Vega
- Roku
- Vizio CastOS
- VIDAA/V Home OS

Fallback support:

- browser display
- casting
- screen mirroring

---

# Guiding Architectural Principle

The television shows the shared world.

The Companion manages the individual player's experience.

A participant may use multiple devices.

A room may contain multiple participants.

A device is not equivalent to a person.
