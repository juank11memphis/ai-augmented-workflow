# Move Template Catalog and Target Planning Behavior

## Epic
[Module Foundation](../epic_brief.md)

## User Story
As a Sibu maintainer, I want template rendering and workflow target planning to live in their owning Deep Modules, so that template content concerns and target-selection concerns do not remain tangled in shared utilities.

## Context
The technical design separates Template Catalog and Rendering from Workflow Target Planning. Current code mixes template reads, manifest reads, agent/skill catalogs, target resolution, and selected-skill state helpers across `src/shared/templates.ts`, `src/shared/catalog.ts`, and `src/shared/workflow-targets.ts`.

## Scope
- Move template read/render/manifest behavior into `template-catalog-rendering`.
- Move supported agent, selectable skill, and workflow target planning behavior into `workflow-target-planning`.
- Split the old catalog by ownership instead of creating a new generic catalog module.
- Move target-planning tests and preserve assertions.

## Out of Scope
- Changing template contents or manifest semantics.
- Adding new agents or skills.
- Changing generated file paths or selected-skill behavior.

## Acceptance Criteria
- Template rendering behavior is owned by Template Catalog and Rendering.
- Workflow target and skill catalog behavior is owned by Workflow Target Planning.
- Generated workflow targets remain the same for existing agent/skill selections.
- Template manifest validation and rendered skill routing remain behaviorally unchanged.

## Validation
- `pnpm build`
- Moved workflow target tests.
- Any template rendering tests affected by imports.
