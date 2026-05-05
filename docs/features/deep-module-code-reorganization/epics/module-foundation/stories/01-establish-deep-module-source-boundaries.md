# Establish Deep Module Source Boundaries

## Epic
[Module Foundation](../epic_brief.md)

## User Story
As a Sibu maintainer, I want the source tree to expose Deep Module boundaries, so that future code moves have stable destinations and reviewers can see the intended organization.

## Context
The technical design defines `src/modules/<deep-module-slug>/` as the primary source boundary while keeping only universal primitives in `src/shared`.

## Scope
- Create the initial `src/modules/` folder structure needed by the refactor.
- Keep `src/entrypoints/cli` as the driving adapter.
- Preserve `src/shared` only for universal primitives identified in the technical design.
- Avoid introducing path aliases or new behavior.

## Out of Scope
- Moving every module's behavior in this story.
- Renaming public command contracts.
- Changing build or package outputs unless required by the initial structure.

## Acceptance Criteria
- Module folders exist for the approved Deep Modules that will receive moved code.
- The source layout communicates the target organization from the technical design.
- The project still builds after the structural setup.

## Validation
- `pnpm build`
