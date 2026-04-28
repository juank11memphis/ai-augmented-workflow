# Step: Add maintainer release entrypoint argument handling

## Goal

Add the maintainer-only release entrypoint that parses release flags and delegates preview, dry-run, and confirmation behavior to the release workflow orchestration layer.

## Scope

- Add `src/admin/release.ts` as a thin Node entrypoint mirroring the style of `src/admin/changelog.ts`.
- Parse `--from`, `--to`, `--version`, `--date`, `--yes`, `--dry-run`, and `--help` into `ReleaseWorkflowCommand`.
- Implement terminal ports for preview printing and confirmation prompting.
- Map blocked, dry-run, declined, and confirmed workflow results to clear terminal messages and exit codes.
- Keep this maintainer-only and unexposed for now: do not add `admin:release` to `package.json`, do not add package `bin` metadata, and do not wire any public CLI command under `src/entrypoints/cli/`.
- Do not implement validation execution, file writes, release commits, tags, npm publish, pushes, or GitHub Release creation in this step.

## Files

- `src/admin/release.ts`
- `src/admin/release-workflow/command.ts`
- `src/admin/release-workflow/handler.test.ts`
- `package.json`
- `src/entrypoints/cli/create-program.ts`

## Done when

- Tests prove release args parse into the expected command shape, including `--dry-run` and `--yes`.
- Tests prove unknown flags and missing flag values return clear usage errors.
- Tests prove the entrypoint delegates confirmation through ports instead of embedding confirmation in planning.
- `package.json` still has no `admin:release` script in this story.
- `package.json` `bin` still exposes only `sibu`.
- No public `release` command is present in `src/entrypoints/cli/create-program.ts`.
- `pnpm build`, `pnpm check`, and focused release workflow tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T20:14:29-06:00
