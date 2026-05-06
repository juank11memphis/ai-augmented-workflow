# Step: Move sync preview classification

## Goal

Move sync preview classification and its tests into the Sync Review module while preserving all current drift statuses and actionable-preview behavior.

## Scope

- Move `src/shared/sync-preview.ts` and `src/shared/sync-preview.test.ts` into `src/modules/sync-review/` with stable exported names.
- Update relative imports inside the moved implementation and test files to use Workflow State Registry, Template Catalog and Rendering, Workflow Target Planning, and shared primitives from their approved locations.
- Update `src/modules/sync-review/index.ts` to export `SyncPreview`, `getSyncPreviews`, `isActionableSyncPreview`, and `shouldAskForSyncAction`.
- Preserve sync preview statuses, unsupported-selection behavior, missing-file classification, local-edit protection, side-template detection, template update checks, and actionable-status behavior.
- Do not move sync command handling or mutation readiness behavior in this step.

## Files

- `src/shared/sync-preview.ts`
- `src/shared/sync-preview.test.ts`
- `src/modules/sync-review/sync-preview.ts`
- `src/modules/sync-review/sync-preview.test.ts`
- `src/modules/sync-review/index.ts`
- `src/modules/workflow-state-registry/index.ts`
- `src/modules/template-catalog-rendering/index.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/shared/hash.ts`
- `src/shared/types.ts`

## Done when

- Sync Review owns `SyncPreview`, `getSyncPreviews`, `isActionableSyncPreview`, `shouldAskForSyncAction`, and sync preview tests.
- Moved sync preview tests retain equivalent assertions.
- Focused compiled tests can run with `pnpm build && node --test bin/modules/sync-review/sync-preview.test.js`.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:05:53-06:00
