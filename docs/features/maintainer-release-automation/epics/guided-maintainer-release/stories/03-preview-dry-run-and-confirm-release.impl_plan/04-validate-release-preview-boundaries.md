# Step: Validate release preview and confirmation boundaries

## Goal

Validate that the release preview, dry-run, and confirmation gate satisfy the story acceptance criteria without introducing release execution side effects or public CLI exposure.

## Scope

- Run focused release workflow and release entrypoint tests.
- Run normal build and type-check validation.
- Confirm dry-run and declined confirmation perform no writes or public side effects.
- Confirm `--yes` still prints the plan before the workflow reaches the confirmed state.
- Confirm package `bin` metadata still exposes only `sibu`.
- Confirm `package.json` does not expose `admin:release` yet.
- Confirm no public `release` command is wired into `src/entrypoints/cli/create-program.ts`.
- Make only small cleanup fixes directly related to preview, dry-run, or confirmation validation failures.
- Do not implement release validation execution, metadata writes, release commits, tags, npm publish, pushes, GitHub Release creation, package script exposure, or docs updates in this step.

## Files

- `src/admin/release.ts`
- `src/admin/release-workflow/handler.test.ts`
- `src/admin/release-workflow/handler.ts`
- `src/admin/release-workflow/release-plan.ts`
- `src/admin/release-workflow/command.ts`
- `package.json`
- `src/entrypoints/cli/create-program.ts`

## Done when

- Focused release workflow and release entrypoint tests pass.
- `pnpm build` passes.
- `pnpm check` passes.
- Tests cover preview contents.
- Tests cover dry-run no-side-effect behavior.
- Tests cover declined confirmation no-side-effect behavior.
- Tests cover `--yes` printing the plan before reaching confirmed execution.
- `package.json` still has no `admin:release` script.
- `package.json` `bin` still exposes only `sibu`.
- No public `release` command is present in `src/entrypoints/cli/create-program.ts`.
- All implementation plan steps for story 03 are ready for approval.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T20:15:13-06:00
