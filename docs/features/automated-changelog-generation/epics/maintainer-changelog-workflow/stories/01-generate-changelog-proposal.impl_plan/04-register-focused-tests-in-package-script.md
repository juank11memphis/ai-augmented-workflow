# Step: Register focused proposal tests in the test script

## Goal

Make the new changelog proposal tests part of the repository's normal validation flow while keeping this story limited to proposal generation.

## Scope

- Add the compiled admin changelog proposal test file to the existing `pnpm test` command.
- Keep package `bin` metadata unchanged so no public CLI command is exposed.
- Do not add `admin:changelog` yet; that belongs to the later maintainer-script story.
- Do not add changelog writing, confirmation prompts, SemVer validation, tagging, or publishing behavior.

## Files

- `package.json`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- `pnpm test` runs the compiled `bin/admin/generate-changelog/handler.test.js` test file.
- `package.json` still exposes only the public `sibu` binary in the `bin` map.
- No public `sibu changelog` command is wired into `src/entrypoints/cli/`.
- `pnpm build`, `pnpm check`, and `pnpm test` pass.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-24T22:10:44.239335Z
