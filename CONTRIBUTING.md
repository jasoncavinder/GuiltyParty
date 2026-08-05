# Contributing to Guilty Party

This document outlines the Git branching and editing policies for the Guilty Party repository.

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

## Pull Request Guidelines
* Keep PRs small and focused on a single logical change.
* Describe *why* the change is being made, not just *what* changed.
* Ensure all tests pass before requesting review.
* Do not expose any private participant information, character secrets, or proprietary scenarios in public commit messages or PR descriptions.

## AI Agent / Automated Contributions
AI Stage Managers and development agents operating on this repository must strictly adhere to this workflow. 
- Agents must create feature or bugfix branches off `dev`.
- Agents must open Pull Requests for review rather than force-merging, to maintain security boundaries and intellectual property protections.
