# Step: Wire confirmed execution and validate release side-effect boundaries

## Goal

Connect confirmed release execution to the maintainer release workflow and validate that side effects only run after preview and confirmation while preserving public CLI boundaries.

## Scope

- Update the release orchestration so confirmed releases call the execution function after the preview and confirmation gate.
- Wire Node terminal ports in `src/admin/release.ts` for file writes and command execution using `fs` and `node:child_process` with explicit args.
- Print progress/results for each completed step and clear failure guidance when execution stops.
- Ensure `--dry-run` and declined confirmation still perform no writes or command side effects.
- Confirm `--yes` still prints the preview before executing side effects.
- Keep the workflow maintainer-only: do not add public `sibu release`, `sibu-admin`, or package `bin` metadata.
- Do not add the `admin:release` package script or docs updates in this story; those belong to the exposure/documentation story.

## Files

- `src/admin/release.ts`
- `src/admin/release.test.ts`
- `src/admin/release-workflow/handler.ts`
- `src/admin/release-workflow/handler.test.ts`
- `src/admin/release-workflow/command.ts`
- `package.json`
- `src/entrypoints/cli/create-program.ts`

## Done when

- Tests prove confirmed releases call execution only after preview and confirmation.
- Tests prove dry-run and declined confirmation run no writes or command side effects.
- Tests prove `--yes` prints the preview before executing side effects.
- Focused release workflow and release entrypoint tests pass.
- `pnpm build` passes.
- `pnpm check` passes.
- `package.json` still has no `admin:release` script.
- `package.json` `bin` still exposes only `sibu`.
- No public `release` command is present in `src/entrypoints/cli/create-program.ts`.
- All implementation plan steps for story 04 are ready for approval.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T22:01:24-06:00
