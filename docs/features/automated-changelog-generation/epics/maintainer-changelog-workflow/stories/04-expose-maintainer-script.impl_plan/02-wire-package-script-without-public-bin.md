# Step: Wire package script without public bin exposure

## Goal

Expose the maintainer changelog workflow through a repository-local package script while keeping it out of the published public CLI surface.

## Scope

- Add a package script such as `"admin:changelog": "node ./bin/admin/changelog.js"`.
- Ensure the script runs against TypeScript build output, not `ts-node` or unpublished source execution.
- Ensure `package.json` `bin` still exposes only `sibu`.
- Ensure package `files` metadata does not expose a standalone `sibu-admin` binary or public changelog command.
- Add or adjust validation tests/checks only as needed to prove the script is present and public bin metadata is unchanged.
- Do not add `src/entrypoints/cli` wiring, a public `sibu changelog` command, a separate `sibu-admin` binary, publishing automation, or git tags.

## Files

- `package.json`
- `src/admin/changelog.ts`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- A maintainer can run `pnpm admin:changelog -- --version 0.2.0` after `pnpm build`.
- `package.json` contains the local admin script.
- `package.json` `bin` contains only `sibu`.
- No public changelog command is wired into `src/entrypoints/cli/create-program.ts`.
- `pnpm build`, `pnpm check`, and focused tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T20:01:12-06:00
