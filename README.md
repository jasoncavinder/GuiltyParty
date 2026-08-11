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

The active prototype is now the invitation-only **Remote Friends MVP**. It uses
the existing deterministic scenario engine and canonical control-plane v1
contracts while moving session authority to the accepted Cloudflare Worker and
per-session Durable Object architecture. The earlier local-only prototype
remains useful development evidence but is no longer the primary MVP target.

The repository is not yet ready for named-friend traffic, a production service,
or commercial deployment. Until the Remote Friends MVP acceptance and explicit
external-test gates in [PLANS.md](PLANS.md) pass, use only synthetic identities
and the original test scenario.

Run the current checks with:

```sh
make setup
make test
```

When Swift and Kotlin compilers are available, verify the committed native
control-plane models with `make check-mobile-contracts`. Regenerate them only
through `make generate-mobile-contracts`; generated sources are never edited by
hand.

The legacy LAN server requires a process-local Host credential and does not
load `.env` files automatically:

```sh
GP_HOST_TOKEN='replace-with-a-random-value-at-least-24-characters' make run-server
```

Copy the variable names from `.env.example` into your own ignored local configuration if desired; never commit real tokens. The AI adapter is disabled unless both `GP_AI_ENDPOINT` and `GP_AI_MODEL` are set, and it rejects public/remote endpoints.

The active Remote Friends MVP uses an exact-origin Cloudflare API, a static
Browser Host, and a static Browser Companion fallback. Neither browser client
stores credentials, invitations, or private content in browser-readable
persistent storage. See the
[remote client delivery runbook](docs/platforms/remote-client-delivery.md) for
the review and manual deployment procedure. The earlier local browser
prototype is archived as implementation history and deterministic-engine
evidence.

The dependency-free LG webOS Stage now packages locally for sideload review
with original project-owned icon artwork. Physical webOS 5.6 transport,
authorized public projection, fresh-ticket reconnect, and session-end clearing
are verified; narrower forced-network-loss and revocation checks remain open,
while newer simulator Origin behavior currently fails closed. See the
[webOS build and test runbook](docs/platforms/webos-stage-build-and-test.md) and
[transport spike](docs/platforms/webos-transport-spike.md).

The native iOS/iPadOS Companion project is committed under `apps/mobile/iOS`, with
simulator and physical-iPhone evidence recorded in the
[iOS Companion MVP test record](docs/platforms/ios-companion-mvp-test-record.md).
The live authorized multi-client rehearsal passed with a physical iPhone and
iPad simulator; physical-iPad validation remains incomplete.

## Documentation

- [Documentation index](docs/)
- [Product vision](docs/product/vision.md)
- [Experience model](docs/product/experience-model.md)
- [Mobile Companion product decisions](docs/product/mobile-companion.md)
- [Visual language](docs/product/visual-language.md)
- [Architecture notes](docs/architecture/README.md)
- [Security and privacy](docs/security/)
- [Architectural decision records](docs/adr/)
- [Platform documentation](docs/platforms/)
- [Mobile decision register](docs/platforms/mobile-decision-register.md)
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
- participate through a low-friction or full account

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
