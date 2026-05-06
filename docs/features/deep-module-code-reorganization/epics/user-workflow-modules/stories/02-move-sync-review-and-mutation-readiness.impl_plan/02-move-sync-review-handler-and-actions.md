# Step: Move sync review handler and actions

## Goal

Move `sibu sync` command behavior into the Sync Review module while preserving the current explicit review-and-apply workflow.

## Scope

- Move `src/features/sync-project/command.ts`, `src/features/sync-project/handler.ts`, `src/features/sync-project/action-prompt.ts`, `src/features/sync-project/apply-action.ts`, `src/features/sync-project/log-preview.ts`, and `src/features/sync-project/preview.ts` into `src/modules/sync-review/`.
- Prefer replacing the moved `preview.ts` compatibility wrapper with direct local imports from the Sync Review module entrypoint or moved `sync-preview.ts` where it keeps dependencies clear.
- Update `src/modules/sync-review/index.ts` to export `handleSyncProject`, `SyncProjectCommand`, `SyncAction`, preview helpers, and any action helpers used by tests or callers.
- Update relative imports inside moved files to use Workflow State Registry, Template Catalog and Rendering, Interactive Guidance/shared prompts, shared paths, shared hash, and shared types from approved locations.
- Preserve available sync actions, action prompt behavior, preview logging, side-template behavior, mark-reviewed semantics, stop-managing semantics, local edit protection, state updates, output meaning, and exit-code behavior.
- Do not change command names, command arguments, prompt text, or drift status names.

## Files

- `src/features/sync-project/command.ts`
- `src/features/sync-project/handler.ts`
- `src/features/sync-project/action-prompt.ts`
- `src/features/sync-project/apply-action.ts`
- `src/features/sync-project/log-preview.ts`
- `src/features/sync-project/preview.ts`
- `src/modules/sync-review/command.ts`
- `src/modules/sync-review/handler.ts`
- `src/modules/sync-review/action-prompt.ts`
- `src/modules/sync-review/apply-action.ts`
- `src/modules/sync-review/log-preview.ts`
- `src/modules/sync-review/index.ts`
- `src/modules/workflow-state-registry/index.ts`
- `src/modules/template-catalog-rendering/index.ts`
- `src/shared/catalog.ts`
- `src/shared/hash.ts`
- `src/shared/paths.ts`
- `src/shared/prompts.tsx`
- `src/shared/types.ts`

## Done when

- Sync Review owns `handleSyncProject`, `SyncProjectCommand`, action prompting, action application, and preview logging.
- The moved sync handler compiles with correct relative imports and no behavior changes.
- No production code imports sync behavior from `src/features/sync-project/*` after the CLI update step.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:05:53-06:00
