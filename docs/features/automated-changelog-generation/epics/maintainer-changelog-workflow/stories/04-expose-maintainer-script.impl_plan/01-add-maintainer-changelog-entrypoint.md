# Step: Add maintainer changelog entrypoint

## Goal

Add a repository-local admin entrypoint that parses maintainer script arguments, invokes the existing safe changelog write workflow, shows preview output, and prompts before writing when `--yes` is not provided.

## Scope

- Add `src/admin/changelog.ts` as a maintainer-only Node entrypoint compiled to `bin/admin/changelog.js`.
- Parse `--from`, `--to`, `--version`, `--date`, and `--yes` into `GenerateChangelogCommand`.
- Reject unknown flags or missing flag values with a clear error and non-zero exit code.
- Use `handleGenerateChangelogWrite` so existing validation, preview, confirmation, and safe write behavior remains centralized.
- Implement terminal confirmation in the entrypoint layer, not inside the handler.
- Print clear success, declined, and blocked messages.
- Do not add a package script, package `bin` entry, public `sibu changelog` command, git tags, package version updates, publishing, or GitHub Release automation in this step.

## Files

- `src/admin/changelog.ts`
- `src/admin/generate-changelog/handler.ts`
- `src/admin/generate-changelog/command.ts`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- `pnpm build` emits `bin/admin/changelog.js`.
- Tests cover argument parsing for supported flags and unknown/missing-value errors, either through exported parser helpers or focused entrypoint tests.
- Confirmation remains owned by the entrypoint/ports layer, not by changelog generation domain logic.
- Running the entrypoint with invalid input exits non-zero without writing files.
- `pnpm build`, `pnpm check`, and the focused changelog/admin test file pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T19:57:46-06:00
