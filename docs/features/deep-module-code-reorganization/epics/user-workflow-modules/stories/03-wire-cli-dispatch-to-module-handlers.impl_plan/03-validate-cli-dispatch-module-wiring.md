# Step: Validate CLI dispatch module wiring

## Goal

Prove the CLI dispatch wiring is complete, behavior-preserving, and free of stale feature imports.

## Scope

- Run targeted stale-import checks for `src/features`, `bin/features`, and removed feature import paths after build output is refreshed.
- Run `pnpm build` and `pnpm verify` as required by the story.
- Run `sibu doctor` in this repository to confirm the installed/current CLI path still works.
- Run packed-runtime validation because package runtime file contents changed.
- Do not mark the story complete if validation is skipped or only manually inspected without a clear reason.

## Files

- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/execute-command.ts`
- `package.json`
- `scripts/run-tests.mjs`

## Done when

- No source imports reference removed `src/features/*` workflow paths.
- `pnpm build` passes.
- `pnpm verify` passes.
- `sibu doctor` passes.
- `pnpm run validate:packed-runtime` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:13:09-06:00
