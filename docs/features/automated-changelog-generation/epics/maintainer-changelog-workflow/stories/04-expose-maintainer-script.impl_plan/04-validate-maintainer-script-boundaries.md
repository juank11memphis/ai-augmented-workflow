# Step: Validate maintainer script boundaries

## Goal

Run the full validation flow and manually confirm the changelog workflow is available to maintainers without becoming a public Sibu CLI command or published binary.

## Scope

- Run `pnpm build`, `pnpm check`, and `pnpm test`.
- Confirm `pnpm admin:changelog -- --help` or equivalent entrypoint usage works if help behavior was implemented; otherwise confirm the built entrypoint exists and script resolves after build.
- Confirm `package.json` `bin` metadata still exposes only `sibu`.
- Confirm no `sibu-admin` binary is added.
- Confirm no `changelog` command is present in `src/entrypoints/cli/create-program.ts`.
- Confirm release docs mention the local maintainer script and not a public CLI command.
- Make only small cleanup fixes directly related to validation failures.
- Do not implement release publishing, package version updates, git tags, GitHub Releases, npm publishing, or public CLI wiring.

## Files

- `package.json`
- `docs/releasing.md`
- `src/admin/changelog.ts`
- `src/entrypoints/cli/create-program.ts`
- `src/admin/generate-changelog/handler.test.ts`

## Done when

- `pnpm build` passes.
- `pnpm check` passes.
- `pnpm test` passes.
- `pnpm admin:changelog -- --version 0.2.0 --yes` is available as a local maintainer command after build, without requiring public CLI wiring.
- `package.json` still exposes only `sibu` in the `bin` map.
- No public changelog command is present in `src/entrypoints/cli/create-program.ts`.
- Release docs explain the maintainer-only workflow.
- All implementation plan steps for story 04 are ready for approval.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-26T20:07:43-06:00
