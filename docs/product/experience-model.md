# Guilty Party Experience Model

## Overview

A Guilty Party session is a shared interactive experience composed of:

- A Scenario
- An Event
- A Session
- Participants
- Characters
- Physical Rooms
- Connected Devices
- A Host
- The Stage
- Companions

---

# Scenario

A Scenario is the authored interactive story.

A scenario contains:

- Setting
- Characters
- Narrative structure
- Timeline
- Evidence
- Objectives
- Rules
- Resolution conditions

Examples:

- Murder mystery
- Spy thriller
- Horror investigation
- Space station emergency

---

# Event

An Event is a scheduled instance of a scenario.

Example:

```
Death at Blackwood Manor
Saturday, August 8
7:00 PM HST
Language: English
8 Players
Hosted by Cassandra
```


An event references a specific published scenario version.

Every event advertises its gameplay language alongside its scheduled time and
time zone, host, scenario, and participation information. Scenarios may be
authored and offered in any human language. Approved translation and
localization direction is recorded in
[Language and Localization Product Direction](language-and-localization.md).

---

# Session

A Session is the live technical execution of an event.

A session manages:

- Gameplay language
- Connected participants
- Rooms
- Devices
- Scenario state
- Communications
- Reveals
- Votes
- Outcomes

---

# The Stage

The Stage is the shared public experience.

Examples:

- Television
- Browser window
- Large display
- Casting target

The Stage presents:

- Host video
- Public participant video
- Public evidence
- Scene transitions
- Timers
- Announcements
- Shared media

The Stage represents the shared fictional world.

---

# The Companion

The Companion is the player's private interface.

Examples:

- Mobile app
- Browser
- Tablet

The Companion provides:

- Character information
- Private objectives
- Inventory
- Evidence
- Notes
- Voting
- Private communication

The Companion represents the individual player's perspective.

The installed mobile Companion is a player-only surface. Host controls remain
in the Host Console and may later be provided by desktop applications. Mobile
phone and tablet layouts are both first-class product targets.

---

# Host Console

The Host Console provides control over the experience.

The host may:

- Start scenes
- Reveal information
- Manage pacing
- Support players
- Trigger events
- Receive AI Stage Manager suggestions

The host remains responsible for directing the experience.

---

# Physical Room

A physical room represents a real-world location containing participants and devices.

Example:

A couple playing together:

```
Room:
  Living Room
Participants:
  Alice
  Bob
Devices:
  Apple TV Stage
  Alice Phone Companion
  Bob Phone Companion
```


A physical room is not equivalent to a player.

Multiple players may share a room.

A player may use multiple devices.

---

# Participation Modes

## Individual Remote

One player uses:

- Computer
- Camera
- Microphone
- Companion interface

---

## Shared Room

Multiple players share:

- Television
- Camera
- Audio system

Each player retains:

- Individual identity
- Private information
- Companion device

---

## Hybrid

Some participants are physically together while others join remotely.

Example:

```
Room A:
  3 players
  Television
  Phones
Room B:
  1 player
  Laptop
Room C:
  Host
```


The system treats all participants consistently.

---

# Core Experience Principle

The Stage shows the shared world.

The Companion manages the individual experience.

The Host guides the story.

The Creator provides the world.

The AI Stage Manager supports everyone.
