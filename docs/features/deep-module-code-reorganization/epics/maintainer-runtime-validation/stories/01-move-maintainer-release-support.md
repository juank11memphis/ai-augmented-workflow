# Move Maintainer Release Support Behavior

## Epic
[Maintainer Runtime Validation](../epic_brief.md)

## User Story
As a Sibu maintainer, I want changelog and release workflow behavior to live in Maintainer Release Support, so that admin-only behavior is separated from user-facing workflow commands.

## Context
The Deep Module Map assigns changelog generation, release planning, package version updates, git release interaction, and related tests to Maintainer Release Support.

## Scope
- Move admin changelog and release workflow internals into `src/modules/maintainer-release-support/`.
- Preserve current admin command behavior.
- Keep tiny `src/admin` compatibility entry files or update scripts deliberately.
- Move admin tests with equivalent assertions.

## Out of Scope
- Publishing a release.
- Changing release plan semantics.
- Changing changelog formatting behavior.

## Acceptance Criteria
- Maintainer Release Support owns admin-only behavior.
- Existing admin tests pass.
- `pnpm` admin scripts still resolve to runnable compiled files.

## Validation
- `pnpm build`
- Moved admin tests.
