# Module Foundation Epic Brief

## Summary

Establish the Deep Module source layout and move the foundational workflow capabilities currently mixed into `src/shared`. This Epic makes state, templates, target planning, and version advisory code live behind clearer module boundaries while preserving all current behavior.

## Source Context
- Feature brief: ../../feature_brief.md
- Technical design: ../../technical_design.md

## Scope
- Create the `src/modules/` organization for foundational Deep Modules.
- Keep `src/shared` limited to universal primitives.
- Move Workflow State Registry behavior.
- Move Template Catalog and Rendering behavior.
- Move Workflow Target Planning behavior.
- Move Version Advisory behavior.
- Move affected tests without weakening assertions.

## Out of Scope
- Moving user-facing command handlers.
- Moving prompt UI code.
- Moving maintainer/admin release tooling.
- Changing `.sibu/state.json`, template manifest, or npm advisory semantics.

## User Stories
- [Establish Deep Module source boundaries](./stories/01-establish-deep-module-source-boundaries.md)
- [Move workflow state registry behavior](./stories/02-move-workflow-state-registry.md)
- [Move template catalog and target planning behavior](./stories/02-move-template-catalog-and-target-planning.md)
- [Move version advisory behavior](./stories/03-move-version-advisory.md)

## Acceptance Criteria
- Foundational code lives under module folders aligned with the technical design.
- `src/shared` contains only universal primitives needed across modules.
- Existing tests for state, templates, target planning, and npm advisory still pass with equivalent assertions.
- No user-facing workflow behavior changes.

## Dependencies / Risks
- This Epic should happen before moving command handlers so later imports target stable foundational module locations.
- Splitting the old catalog requires care because it currently mixes target planning, version advisory, and state path constants.
