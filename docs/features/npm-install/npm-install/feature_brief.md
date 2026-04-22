# npm Install Feature Brief

## Summary
Provide a single, official installation and update path for Sibu using npm global install (`npm install -g sibu`). This makes Sibu easy to adopt without repo cloning, linking, custom scripts, or a bespoke updater, and it includes the maintainer-facing release documentation needed to publish and communicate new versions cleanly.

## Product Vision Fit
Sibu aims to make AI‑augmented development feel reliable, guided, and low-friction. A single, familiar npm install/update path lowers adoption friction, keeps behavior predictable, and avoids inventing custom package management behavior that would make the workflow feel strange or opaque. A clear, standard release process also protects trust: users should understand how to install and update Sibu, and maintainers should have one obvious way to package, publish, and explain each new version.

## User / Customer Problem
Current installation methods require cloning the repo and using `pnpm link`, which is unfamiliar and error‑prone for many developers. This slows adoption and creates inconsistency across teams. Once users have Sibu installed, there is also no standard way for the CLI to tell them that a newer npm version exists and that they should update before checking for template drift. On the maintainer side, there is no documented, end-to-end release path covering npm registry setup, version publishing, and release communication.

## Business Goal
Reduce install friction, standardize updates, and increase first-time adoption without adding maintenance burden through custom distribution logic.

## Target User / Scenario
- Solo engineers and small/medium teams who want to get Sibu running quickly.
- A developer hears about Sibu and wants a one‑line install they already trust.
- A developer starts a new session, runs `sibu doctor` as instructed by `AGENTS.md`, and is told when a newer npm version is available.
- A maintainer is ready to publish a new Sibu version and needs one documented release path that covers npm publishing, release notes, and user-facing install/update docs.

## Proposed Experience
- User runs `npm install -g sibu`.
- `sibu` CLI becomes available immediately on PATH.
- `sibu doctor` can advisory-check whether a newer npm-published version exists.
- If a newer version exists, `sibu doctor` tells the user to update with `npm install -g sibu`.
- After updating, the user reruns `sibu doctor` to see whether the newer installed version introduces template drift that requires `sibu sync`.
- All user-facing documentation points to npm as the only supported install and update method.
- Maintainer-facing documentation explains how to prepare, package, publish, and announce a new npm release using standard npm workflows.

## MVP Scope
- Publish Sibu to npm under the official package name.
- Provide one canonical install/update command in user-facing docs.
- Ensure `sibu` runs correctly after npm global install.
- Add an advisory npm-version check to `sibu doctor`.
- Keep `sibu sync` as the explicit review/apply step for template drift after upgrading.
- Document the maintainer release path, including npm registry prerequisites, version publishing steps, and the rule that every release updates both `CHANGELOG.md` and the matching GitHub Release.
- Ensure README and release documentation clearly separate end-user install/update guidance from maintainer release steps.

## Out of Scope
- Homebrew, winget, Chocolatey, curl|sh, or GitHub binaries.
- Repo clone + link instructions for end users.
- Automatic updates, background services, or self-updating binaries.
- AGENTS.md performing any network/version checks directly.
- Inventing a custom release or update mechanism outside standard npm workflows.

## Success Signals
- New users can install Sibu in < 5 minutes without assistance.
- Reduced support questions about installation and updating.
- Increased completion rate of first‑time `sibu init`.
- Users can update to a newer npm version and then immediately understand whether `sibu sync` is needed.
- A maintainer can publish a new Sibu version without tribal knowledge, using documented steps in the repo.

## Business-Level Acceptance Criteria
- The official user docs show only npm install/update as the supported method.
- A user can run `npm install -g sibu` and immediately execute `sibu --help` successfully.
- A user running `sibu doctor` on an older installed version sees an advisory message telling them how to update with npm.
- After updating, rerunning `sibu doctor` reports any resulting workflow/template drift without mutating files.
- Maintainer docs explain how to release a new npm version, including npm registry setup/prerequisites, version publishing, and the requirement to update both `CHANGELOG.md` and the matching GitHub Release.
- The npm install path works consistently on macOS, Windows, and Linux.

## Risks / Tradeoffs
- Requires Node and npm, which may exclude some users.
- Over‑reliance on npm could slow adoption in non‑Node teams.
- Version checking introduces a network-dependent advisory path that should not block normal local workflow checks.
- A poorly documented release flow could still leave maintainers relying on memory or ad hoc steps even if npm distribution exists.

## Open Questions
- Which npm org/package name should be used (e.g., `sibu` vs `@sibu/cli`)?
- Minimum supported Node version is 20+.
- How often should `sibu doctor` refresh the npm version advisory to avoid noisy repeated checks?
- Release notes should use `CHANGELOG.md` as the canonical source and GitHub Releases as the public release surface; every release updates both.
