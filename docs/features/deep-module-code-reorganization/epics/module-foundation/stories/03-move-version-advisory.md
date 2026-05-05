# Move Version Advisory Behavior

## Epic
[Module Foundation](../epic_brief.md)

## User Story
As a Sibu maintainer, I want npm version advisory behavior to live in the Version Advisory module, so that update checks are isolated from workflow state and target planning concerns.

## Context
The technical design assigns npm lookup, cache, package-name/version constants, lookup overrides, and advisory classification to Version Advisory.

## Scope
- Move npm version check behavior into `src/modules/version-advisory/`.
- Move package/version and npm lookup constants out of generic catalog code.
- Preserve cache location, TTL behavior, unavailable-result behavior, and override environment variables.
- Move npm version tests with equivalent assertions.

## Out of Scope
- Changing update advisory copy.
- Changing npm package metadata.
- Changing release publishing behavior.

## Acceptance Criteria
- Doctor can still ask Version Advisory for update information.
- Live, cache, unavailable, and override outcomes remain equivalent.
- Version advisory tests pass after the move.

## Validation
- `pnpm build`
- Moved npm version tests.
- `pnpm run validate:doctor-version-advisory`
