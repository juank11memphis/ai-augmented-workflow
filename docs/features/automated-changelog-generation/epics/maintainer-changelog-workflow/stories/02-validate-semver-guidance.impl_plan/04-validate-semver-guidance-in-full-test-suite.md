# Step: Validate SemVer guidance in the full test suite

## Goal

Run and preserve the repository's normal validation flow after SemVer guidance is integrated, ensuring the maintainer-only changelog proposal still stays out of public CLI behavior.

## Scope

- Run the full build, type-check, and test suite.
- Confirm the existing `pnpm test` script still includes the changelog proposal test file.
- Confirm `package.json` `bin` metadata still exposes only the public `sibu` binary.
- Confirm no `sibu changelog` command has been wired into `src/entrypoints/cli/`.
- Make only small cleanup fixes directly related to SemVer guidance validation failures.
- Do not add the `admin:changelog` package script; that belongs to story 04.
- Do not implement changelog writing or confirmation prompts; those belong to later stories.

## Files

- `package.json`
- `src/admin/generate-changelog/handler.test.ts`
- `src/admin/generate-changelog/semver.ts`
- `src/admin/generate-changelog/handler.ts`
- `src/admin/generate-changelog/command.ts`

## Done when

- `pnpm build` passes.
- `pnpm check` passes.
- `pnpm test` passes.
- `package.json` still exposes only `sibu` in the `bin` map.
- No public changelog command is present in `src/entrypoints/cli/create-program.ts`.
- All implementation plan steps for story 02 are ready for approval.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T19:30:44-06:00
