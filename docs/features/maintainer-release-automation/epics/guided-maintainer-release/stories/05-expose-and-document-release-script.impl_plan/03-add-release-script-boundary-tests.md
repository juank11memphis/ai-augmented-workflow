# Step: Add release script boundary tests

## Goal

Add or tighten automated boundary tests that prove the maintainer release workflow is exposed only as a local package script and not as a public CLI command or package binary.

## Scope

- Add focused tests or extend existing tests to assert `package.json` includes `admin:release` with the expected local Node entrypoint.
- Assert package `bin` metadata still exposes only `sibu`.
- Assert `src/entrypoints/cli/create-program.ts` does not register a public `release` command.
- Assert `src/admin/release.ts` argument parsing continues to support `--version`, `--from`, `--to`, `--date`, `--yes`, and `--dry-run`.
- Keep tests local and deterministic; do not run real npm publish, git push, or GitHub Release commands.
- Do not add docs or package script changes beyond test-related fixes in this step.

## Files

- `src/admin/release.test.ts`
- `package.json`
- `src/entrypoints/cli/create-program.ts`

## Done when

- Tests fail if `admin:release` is missing or points somewhere other than `node ./bin/admin/release.js`.
- Tests fail if package `bin` exposes anything other than `sibu`.
- Tests fail if the public CLI wires a `release` command.
- Focused release entrypoint tests pass.
- `pnpm build` and `pnpm check` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T10:38:37-06:00
