# Step: Remove Legacy Template and Target Imports

## Goal

Clean up leftover imports and files so template rendering and workflow target planning are visibly owned by their Deep Modules, not by `src/shared` compatibility paths.

## Scope

- Delete `src/shared/templates.ts` after all imports use Template Catalog and Rendering.
- Delete `src/shared/workflow-targets.ts` after all imports use Workflow Target Planning.
- Confirm no imports reference `./templates.js`, `../../shared/templates.js`, `./workflow-targets.js`, or `../../shared/workflow-targets.js` from current source files.
- Confirm no workflow target catalog imports remain from `src/shared/catalog.ts`.
- Do not delete `src/shared/catalog.ts` in this story because Version Advisory and Workflow State Registry concerns are handled by other stories.
- Do not modify runtime package configuration in this story.

## Files

- `src/shared/templates.ts`
- `src/shared/workflow-targets.ts`
- `src/shared/catalog.ts`
- `src/modules/template-catalog-rendering/index.ts`
- `src/modules/workflow-target-planning/index.ts`
- Source files importing template or target-planning APIs

## Done when

- Template behavior imports come from `src/modules/template-catalog-rendering`.
- Workflow target planning imports come from `src/modules/workflow-target-planning`.
- Legacy shared template and workflow target files are removed.
- `pnpm build` passes.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T17:50:40-06:00
