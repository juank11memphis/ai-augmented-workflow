# Step: Run final database command validation

## Goal

Validate the full PostgreSQL Expert selectable command experience and package runtime after init/list/use/stop support is wired.

## Scope

- Run relevant prompt, skill use, skill stop, sync, doctor, and workflow target tests.
- Run `pnpm run build`.
- Run `pnpm run validate:packed-runtime`.
- Run `sibu doctor` in this repository.
- Inspect the diff to confirm the story did not add sync-time database prompts, additional database skills, command name changes, or database introspection/generation scope.

## Files

- `src/modules/interactive-guidance/prompts.tsx`
- `src/modules/project-adoption/handler.ts`
- `src/modules/skill-selection-management/list-skills/handler.ts`
- `src/modules/skill-selection-management/use-skill/handler.ts`
- `src/modules/skill-selection-management/use-skill/handler.test.ts`
- `src/modules/skill-selection-management/stop-managing-file/handler.ts`
- `src/modules/skill-selection-management/stop-managing-file/handler.test.ts`
- `src/modules/sync-review/sync-preview.ts`
- `src/modules/sync-review/apply-action.ts`
- `src/modules/workflow-health-diagnosis/handler.ts`

## Done when

- Relevant command and prompt tests pass.
- `pnpm run build` passes.
- `pnpm run validate:packed-runtime` passes.
- `sibu doctor` passes or reports only expected workflow drift from in-progress template changes.
- The story acceptance criteria are covered without out-of-scope database behavior.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:27:02-06:00
