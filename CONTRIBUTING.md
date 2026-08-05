# Contributing to Guilty Party

## Repository Status

Guilty Party is publicly visible for portfolio review, technical discussion,
and evaluation, but it is proprietary software and is not an open-source
project.

The project is not currently operating a general external contribution
program. Opening an issue or pull request does not create a license to use the
project and does not establish ownership, compensation, or contribution terms.

## Branching Strategy

We follow a modified feature-branch workflow. 

### Core Branches
* **`main`**: The source of truth for production-ready state. This branch is protected and cannot be pushed to directly.
* **`dev`**: The primary integration branch. All new features, bug fixes, and updates are merged here first. This branch is protected and cannot be pushed to directly.

### Supporting Branches
* **Feature Branches** (`feature/<short-desc>`): For new capabilities. Branched from `dev`.
* **Bugfix Branches** (`bugfix/<short-desc>`): For resolving issues. Branched from `dev`.
* **Hotfix Branches** (`hotfix/<short-desc>`): For critical fixes needed in production immediately. Branched from `main`, merged to both `main` and `dev`.

## Workflow Rules

1. **Never commit directly to `main` or `dev`.** Both branches require a Pull Request (PR).
2. **Branch from `dev`.** When starting new work, ensure your local `dev` is up to date:
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```
3. **Draft your changes.** Make your commits locally. Keep commits atomic and messages descriptive.
4. **Push and PR to `dev`.** Push your feature branch and open a PR targeting the `dev` branch.
   ```bash
   git push -u origin feature/your-feature-name
   ```
5. **Release to `main`.** When `dev` reaches a stable milestone, a PR is opened from `dev` to `main`.

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
- Keep PRs small and focused on a single logical change.
- Describe *why* the change is being made, not just *what* changed.
- Ensure all tests pass before requesting review.

## AI Agent / Automated Contributions
AI Stage Managers and development agents operating on this repository must strictly adhere to this workflow. 
- Agents must create feature or bugfix branches off `dev`.
- Agents must open Pull Requests for review rather than force-merging, to maintain security boundaries and intellectual property protections.

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
