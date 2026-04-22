# Define the release notes and changelog expectation

## Epic
[Docs and Release Workflow](../epic_brief.md)

## User Story
As a maintainer, I want one explicit expectation for release notes and changelog updates, so that every published Sibu version communicates user-visible changes consistently.

## Context
The feature brief and technical design call out release communication as part of the release workflow, but the repo still needs one clear decision about where release notes live.

## Scope
- Document the agreed release-notes model: `CHANGELOG.md` is the canonical source and GitHub Releases are the public release surface.
- Explain when maintainers are expected to update that record during a release.
- Align the chosen approach with the maintainer release document.

## Out of Scope
- Automating changelog generation.
- Writing a backlog of historical release notes.

## Acceptance Criteria
- The repo states that Sibu releases require both a `CHANGELOG.md` entry and a matching GitHub Release.
- The maintainer release workflow references both required release-note locations.
- The expectation is clear enough that future releases follow a consistent communication pattern.

## Validation
- Review the chosen location and release documentation together for consistency.
- Confirm the approach matches the feature brief and technical design.
