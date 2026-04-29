# Step: Expose maintainer release package script

## Goal

Expose the completed maintainer release workflow through a repo-local `pnpm admin:release` script while keeping release automation out of public package binaries and the public Sibu CLI.

## Scope

- Add `admin:release` to `package.json` scripts, pointing to `node ./bin/admin/release.js`.
- Ensure `src/admin/release.ts` remains the maintainer-only entrypoint compiled by the existing TypeScript build.
- Add the release entrypoint tests to the normal `pnpm test` command so release argument parsing and confirmation behavior are covered by routine validation.
- Preserve existing `admin:changelog`, `validate:release`, and public `sibu` script/bin behavior.
- Do not add `sibu release`, `sibu-admin`, new package `bin` entries, publishing behavior changes, or end-user README guidance in this step.

## Files

- `package.json`
- `src/admin/release.ts`
- `src/admin/release.test.ts`
- `src/entrypoints/cli/create-program.ts`

## Done when

- `package.json` includes `"admin:release": "node ./bin/admin/release.js"`.
- `package.json` `test` includes `bin/admin/release.test.js` and focused release workflow tests needed for release automation coverage.
- `package.json` `bin` still exposes only `sibu`.
- No public `release` command is present in `src/entrypoints/cli/create-program.ts`.
- `pnpm build`, `pnpm check`, and focused release tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-27T22:04:35-06:00
