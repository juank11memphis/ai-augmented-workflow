# Step: Validate release script exposure

## Goal

Run final validation for the maintainer release automation Epic and prove the local release script is usable after build without exposing release automation publicly.

## Scope

- Run focused release tests and normal repository validation.
- Run `pnpm build` so `src/admin/release.ts` compiles to `bin/admin/release.js`.
- Run `pnpm check`.
- Run `pnpm test` after ensuring release tests are included in the package test script.
- Run or document a safe dry-run check for `pnpm admin:release -- --dry-run` after build; if the current working tree cannot be clean during the step, run the command after committing approved changes or use an explicit temporary release fixture and record the reason.
- Inspect `package.json` `bin` and `src/entrypoints/cli/create-program.ts` boundaries.
- Make only small cleanup fixes directly related to validation failures.
- Do not publish to npm, push to GitHub, create tags, create GitHub Releases, or add public CLI exposure in this step.

## Files

- `package.json`
- `docs/releasing.md`
- `src/admin/release.test.ts`
- `src/entrypoints/cli/create-program.ts`

## Done when

- `pnpm build` passes.
- `pnpm check` passes.
- `pnpm test` passes.
- `pnpm admin:release -- --dry-run` is validated safely after build or an explicit reason and equivalent safe dry-run fixture is reported.
- `package.json` includes `admin:release` but `bin` still exposes only `sibu`.
- No public `release` command is present in `src/entrypoints/cli/create-program.ts`.
- Release documentation covers maintainer usage.
- All implementation plan steps for story 05 are ready for approval.


## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T10:41:16-06:00
