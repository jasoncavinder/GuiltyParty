# Language and Localization Product Direction

## Status

Accepted product direction as of 2026-08-06. This document preserves the
multilingual requirements without selecting a localization schema, translation
provider, or implementation.

## LANG-PROD-001: Session Language Is Advertised

Every scheduled event and live session identifies its gameplay language in
structured metadata. Event discovery and invitations present that language
alongside scheduling information, time zone, host, scenario, participation
requirements, and other information a player needs before joining.

The gameplay language is distinct from a participant's interface language and
from the language of private communications. The exact identifier format,
matching rules, fallback behavior, and support for multilingual sessions remain
open decisions.

## LANG-PROD-002: Scenarios Are Language-Independent Products

A scenario may be originally authored in any human language and may have
approved translations into any other human language. Scenario catalog and event
metadata must let hosts and players distinguish the original language from the
approved languages available for play.

A translation must preserve canonical scenario rules, secrecy and audience
boundaries, character and clue meaning, accessibility requirements, creator
rights, and deterministic outcomes. Localization may adapt phrasing and
cultural context only through an approved authoring and publication process;
runtime AI does not silently reinterpret canonical story truth.

## LANG-PROD-003: AI Translation Requires Human Approval

AI may propose a scenario translation, but its output is draft creator content.
A human with appropriate publication authority must review and explicitly
approve it before it becomes an available scenario language. Publication makes
the approved translation immutable under the applicable scenario-versioning
rules; later corrections require a new approved publication artifact.

AI translation does not imply authorization to send creator content, player
information, private communications, or unpublished material to an external
provider. Provider use, data handling, content rights, attribution, and model
licensing still require their normal approvals.

## Preserved Follow-Up Decisions

These questions are intentionally recorded for a later localization-focused
discussion:

- **LANG-ARCH-001:** language and locale identifiers, matching, fallback, and
  multilingual-session behavior
- **LANG-ARCH-002:** how source text and approved translations relate to an
  immutable scenario version without allowing translated rules to diverge
- **LANG-CONTENT-001:** translator and reviewer roles, approval evidence,
  quality standards, correction workflow, and creator control
- **LANG-CONTENT-002:** localization of media, wordplay, culturally dependent
  clues, accessibility content, typography, and bidirectional text
- **LANG-AI-001:** approved translation providers or local models, minimized
  inputs, retention, confidentiality, licensing, and human-review tooling
- **LANG-PROD-004:** event discovery filters, mixed-language participant needs,
  and the relationship between gameplay, UI, caption, and communication
  languages

Nothing in this document authorizes automatic live translation, transcription,
or processing of participant communications or media.
