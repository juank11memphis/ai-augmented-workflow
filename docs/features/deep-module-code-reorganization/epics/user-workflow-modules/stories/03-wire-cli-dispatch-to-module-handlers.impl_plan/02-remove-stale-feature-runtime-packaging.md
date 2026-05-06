# Step: Remove stale feature runtime packaging

## Goal

Ensure packaged runtime contents no longer depend on removed `bin/features/` output after user workflow handlers moved into modules.

## Scope

- Update `package.json` `files` to stop packaging `bin/features/` after confirming no runtime imports require it.
- Keep `bin/modules/`, `bin/entrypoints/`, and remaining `bin/shared/` entries needed by runtime primitives.
- Preserve package scripts, command names, admin script paths, and package metadata.
- Do not remove `bin/shared/` from package files while runtime module code still imports shared primitives.

## Files

- `package.json`
- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/execute-command.ts`
- `src/modules/project-adoption/index.ts`
- `src/modules/workflow-health-diagnosis/index.ts`
- `src/modules/sync-review/index.ts`
- `src/modules/skill-selection-management/index.ts`

## Done when

- `package.json` no longer includes `bin/features/` in `files`.
- Runtime packaging still includes all compiled module and shared files required by the CLI.
- `pnpm run validate:packed-runtime` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:13:09-06:00
