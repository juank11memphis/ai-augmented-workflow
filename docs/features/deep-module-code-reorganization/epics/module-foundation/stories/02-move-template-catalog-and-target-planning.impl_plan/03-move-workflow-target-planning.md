# Step: Move Workflow Target Planning

## Goal

Move workflow target resolution, selected-skill-from-state helpers, missing-file rendering, and Sibu state writing into Workflow Target Planning while preserving generated paths and selected-skill behavior.

## Scope

- Move `src/shared/workflow-targets.ts` into `src/modules/workflow-target-planning/workflow-targets.ts`.
- Update `src/modules/workflow-target-planning/index.ts` to export the moved workflow target planning API.
- Move `src/shared/workflow-targets.test.ts` into `src/modules/workflow-target-planning/workflow-targets.test.ts` with equivalent assertions.
- Update all production and test imports that use workflow target planning functions to the module path.
- Preserve generated workflow target paths, selected skill handling, missing file rendering, and `writeSibuState` behavior.
- Do not change `.sibu/state.json` schema, template manifest semantics, or generated file contents.

## Files

- `src/shared/workflow-targets.ts`
- `src/shared/workflow-targets.test.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/workflow-target-planning/workflow-targets.ts`
- `src/modules/workflow-target-planning/workflow-targets.test.ts`
- `src/features/init-project/handler.ts`
- `src/features/doctor-project/handler.ts`
- `src/features/stop-managing-file/handler.ts`
- `src/features/use-skill/handler.ts`
- `src/shared/sync-preview.ts`

## Done when

- Workflow Target Planning owns target resolution and related state-selection helpers.
- Moved workflow target tests pass with equivalent assertions.
- Generated target paths remain unchanged for existing agent and skill selections.
- `pnpm build` passes.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T17:43:44-06:00
