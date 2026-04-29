# Step: Validate release planning boundaries

## Goal

Run focused and normal validation for the release planning slice and confirm it has not introduced metadata writes, public CLI wiring, or package script exposure outside this story's scope.

## Scope

- Run focused release workflow tests.
- Run build and type-check validation.
- Confirm no `admin:release` package script is added in this story.
- Confirm package `bin` metadata still exposes only `sibu`.
- Confirm no public `release` command is wired into `src/entrypoints/cli/create-program.ts`.
- Make only small cleanup fixes directly related to release planning validation failures.
- Do not implement changelog writes, package metadata writes, validation execution, commits, tags, publishing, pushing, GitHub Release creation, or documentation updates in this step.

## Files

- `package.json`
- `src/entrypoints/cli/create-program.ts`
- `src/admin/release-workflow/handler.test.ts`
- `src/admin/release-workflow/handler.ts`
- `src/admin/release-workflow/git-release.ts`
- `src/admin/release-workflow/release-plan.ts`
- `src/admin/release-workflow/command.ts`

## Done when

- `pnpm build` passes.
- `pnpm check` passes.
- Focused release workflow tests pass.
- `package.json` does not contain `admin:release` yet.
- `package.json` `bin` still exposes only `sibu`.
- No public `release` command is present in `src/entrypoints/cli/create-program.ts`.
- All implementation plan steps for story 01 are ready for approval.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T21:04:39-06:00
