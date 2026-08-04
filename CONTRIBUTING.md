# Contributing to Guilty Party

## Repository Status

Guilty Party is publicly visible for portfolio review, technical discussion,
and evaluation, but it is proprietary software and is not an open-source
project.

The project is not currently operating a general external contribution
program. Opening an issue or pull request does not create a license to use the
project and does not establish ownership, compensation, or contribution terms.

## Issues and Discussions

Reports about documentation defects, reproducible bugs, privacy concerns, and
security boundaries are welcome.

Before posting, remove:

- credentials and access tokens
- personal or payment information
- private participant communications
- character secrets and hidden evidence
- unpublished creator content
- third-party material that cannot be shared publicly

Security vulnerabilities should follow [SECURITY.md](SECURITY.md) instead of
being reported in a public issue.

## Pull Requests

Coordinate with the project owner before preparing a substantial pull request.
Until written contribution terms are established, substantial external code,
content, artwork, scenarios, datasets, or other intellectual property should
not be submitted or merged.

Small corrections may be considered at the project owner's discretion. A pull
request should:

- have a narrow, explained scope
- preserve the documented architecture and privacy boundaries
- identify all third-party material and its license
- avoid changing legal, ownership, copyright, or trademark language
- include relevant tests or validation when applicable

## Architecture Changes

Significant architecture changes require:

1. Updated architecture documentation.
2. An ADR when the decision is long-lived or affects multiple systems.
3. An explanation of alternatives and tradeoffs.

The principles in [AGENTS.md](AGENTS.md) are project constraints, including
deterministic scenario truth, server-side secrecy enforcement, privacy-first
defaults, and separation of the control and media planes.

## Licensing

Review [LICENSE](LICENSE), [NOTICE.md](NOTICE.md),
[COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and
[docs/legal/licensing.md](docs/legal/licensing.md) before participating.

Questions about contribution rights or commercial licensing require direct
coordination with the project owner.
