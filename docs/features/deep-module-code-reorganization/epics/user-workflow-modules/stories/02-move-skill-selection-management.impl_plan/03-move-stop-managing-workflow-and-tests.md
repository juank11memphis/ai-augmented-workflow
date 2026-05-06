# Step: Move stop managing workflow and tests

## Goal

Move `sibu skills stop` command behavior and tests into the Skill Selection Management module while preserving unmanaged-status recording and keep/delete prompt behavior.

## Scope

- Move `src/features/stop-managing-file/command.ts`, `src/features/stop-managing-file/handler.ts`, and `src/features/stop-managing-file/handler.test.ts` into `src/modules/skill-selection-management/stop-managing-file/` with stable exported names.
- Update `src/modules/skill-selection-management/index.ts` to export `handleStopManagingFile`, `StopManagingFileCommand`, `stopSelectedSkill`, and result types needed by tests or callers.
- Update relative imports inside moved implementation and test files to use Workflow Target Planning, Template Catalog and Rendering, Workflow State Registry, shared object/hash/path primitives, and shared types from their approved locations.
- Preserve selected-skill checks, unmanaged status recording before optional deletion, local-edit detection, `AGENTS.md` routing refresh, keep/delete prompt semantics, output meaning, and exit-code behavior.
- Do not change deletion prompt text, prompt order, or architecture-skill replacement behavior.

## Files

- `src/features/stop-managing-file/command.ts`
- `src/features/stop-managing-file/handler.ts`
- `src/features/stop-managing-file/handler.test.ts`
- `src/modules/skill-selection-management/stop-managing-file/command.ts`
- `src/modules/skill-selection-management/stop-managing-file/handler.ts`
- `src/modules/skill-selection-management/stop-managing-file/handler.test.ts`
- `src/modules/skill-selection-management/index.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/template-catalog-rendering/index.ts`
- `src/modules/workflow-state-registry/index.ts`
- `src/shared/catalog.ts`
- `src/shared/hash.ts`
- `src/shared/object.ts`
- `src/shared/paths.ts`
- `src/shared/prompts.tsx`
- `src/shared/types.ts`

## Done when

- Skill Selection Management owns `handleStopManagingFile`, `StopManagingFileCommand`, `stopSelectedSkill`, and stop-managing-file handler tests.
- Moved stop tests retain equivalent assertions for unmanaged status recording, optional deletion handling, local-edit protection, and state updates.
- Focused compiled tests can run with `pnpm build && node --test bin/modules/skill-selection-management/stop-managing-file/handler.test.js`.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T11:56:55-06:00
