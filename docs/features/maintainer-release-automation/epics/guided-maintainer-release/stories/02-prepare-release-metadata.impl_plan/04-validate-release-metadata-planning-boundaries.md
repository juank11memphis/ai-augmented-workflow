# Step: Validate release metadata planning boundaries

## Goal

Validate that release metadata planning satisfies the story acceptance criteria without introducing execution side effects or public CLI exposure.

## Scope

- Run focused release workflow tests for changelog and package metadata planning.
- Run normal build and type-check validation.
- Confirm metadata planning remains preview/testable only and performs no writes in this story.
- Confirm `package.json` `bin` metadata still exposes only `sibu`.
- Confirm no public `release` command is wired into `src/entrypoints/cli/create-program.ts`.
- Make only small cleanup fixes directly related to release metadata planning validation failures.
- Do not implement confirmation behavior, release validation execution, release commits, tags, npm publish, pushes, GitHub Release creation, package script exposure, or docs updates in this step.

## Files

- `src/admin/release-workflow/handler.test.ts`
- `src/admin/release-workflow/handler.ts`
- `src/admin/release-workflow/package-json.ts`
- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/release-plan.ts`
- `package.json`
- `src/entrypoints/cli/create-program.ts`

## Done when

- Focused release workflow tests pass.
- `pnpm build` passes.
- `pnpm check` passes.
- Tests cover malformed `CHANGELOG.md` and malformed `package.json` blocking.
- Tests cover package version planning changing only the root `package.json` version value.
- Tests cover the release plan including changelog and package metadata changes for later preview and execution.
- `package.json` `bin` still exposes only `sibu`.
- No public `release` command is present in `src/entrypoints/cli/create-program.ts`.
- All implementation plan steps for story 02 are ready for approval.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T19:49:30-06:00
