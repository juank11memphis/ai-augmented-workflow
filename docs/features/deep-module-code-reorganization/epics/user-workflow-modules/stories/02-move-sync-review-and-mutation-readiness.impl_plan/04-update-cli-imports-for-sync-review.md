# Step: Update CLI imports for sync review

## Goal

Point the CLI command surface at Sync Review for `sibu sync` behavior.

## Scope

- Update CLI command type imports for `SyncProjectCommand` to use `src/modules/sync-review/index.ts` instead of `src/features/sync-project/command.ts`.
- Update CLI command execution imports for `handleSyncProject` to use the Sync Review module entrypoint.
- Remove empty legacy `src/features/sync-project/` source files after imports are updated.
- Do not rename `SibuCliCommand` discriminants, command names, command arguments, or command dispatch cases.
- Do not move unrelated maintainer/admin release tooling.

## Files

- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/execute-command.ts`
- `src/modules/sync-review/index.ts`
- `src/features/sync-project/command.ts`
- `src/features/sync-project/handler.ts`
- `src/features/sync-project/action-prompt.ts`
- `src/features/sync-project/apply-action.ts`
- `src/features/sync-project/log-preview.ts`
- `src/features/sync-project/preview.ts`

## Done when

- CLI command parsing and dispatch compile against module-owned sync contracts and handlers.
- No source file imports from `src/features/sync-project/*`.
- `src/features/` has no remaining user workflow handler source files from this Epic.
- `pnpm build` passes after import updates.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:05:53-06:00
