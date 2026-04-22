# Document the canonical npm install and update flow for users

## Epic
[Docs and Release Workflow](../epic_brief.md)

## User Story
As a new Sibu user, I want the README to show one official npm install and update path, so that I can start and maintain the CLI without guessing.

## Context
The feature brief requires npm to be the only supported install/update method. The technical design requires README to focus on end-user guidance and explain the doctor → update → doctor → sync flow.

## Scope
- Update README install guidance to use npm as the only official path.
- Document the standard update path and the role of `sibu doctor` and `sibu sync`.
- Keep contributor setup separate from end-user onboarding.

## Out of Scope
- Maintainer publish steps.
- Runtime version-advisory implementation.

## Acceptance Criteria
- README shows only npm as the supported user install/update method.
- README explains what users should do when `sibu doctor` reports a newer version.
- README keeps contributor-only link/build flows separate from user install guidance.

## Validation
- Review README for a single clear install/update story.
- Confirm the documented flow matches the technical design.
