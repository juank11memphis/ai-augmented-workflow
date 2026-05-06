# Step: Update state callers to the module boundary

## Goal

Make command handlers, workflow target planning, and tests consume workflow state behavior through the Workflow State Registry module boundary instead of `src/shared/state.ts`.

## Scope

- Replace imports from `../../shared/state.js` or equivalent relative shared-state paths with imports from `../../modules/workflow-state-registry/index.js` or the correct relative module index path.
- Update command handlers and module code without changing command behavior, prompts, exit codes, or output meanings.
- Update tests that directly read state so they import from the registry module.
- Remove `src/shared/state.ts` once no caller imports it, or leave only a temporary compatibility re-export if TypeScript/package constraints require it; stop and ask before keeping long-term shared state behavior.
- Do not move command handlers or unrelated modules as part of this story.

## Files

- `src/features/init-project/handler.ts`
- `src/features/doctor-project/handler.ts`
- `src/features/sync-project/handler.ts`
- `src/features/sync-project/apply-action.ts`
- `src/features/list-skills/handler.ts`
- `src/features/use-skill/handler.test.ts`
- `src/features/stop-managing-file/handler.ts`
- `src/modules/workflow-target-planning/workflow-targets.ts`
- `src/shared/state.ts`

## Done when

- No production or test file imports workflow state behavior from `src/shared/state.ts`.
- Callers use the Workflow State Registry module boundary for reads, writes, cloning, and reviewed-version checks.
- `src/shared` no longer owns workflow state registry behavior.
- `pnpm build` passes after import updates.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T16:38:57.176Z
