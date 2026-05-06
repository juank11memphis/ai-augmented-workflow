# Step: Extend packed runtime validation for admin entrypoints

## Goal

Make packed-runtime validation catch missing admin compatibility entrypoints or moved maintainer module code.

## Scope

- Update `scripts/validate-packed-cli-runtime.mjs` to run installed package admin compatibility entrypoints if they are packaged.
- Validate `changelog --help` and `release --help` through installed package files without publishing or running release side effects.
- Keep the existing installed `sibu --help` and `sibu doctor` smoke checks.
- Preserve isolated workspace behavior and cleanup behavior.
- Do not require network beyond the existing local `npm pack` and local global install workflow.

## Files

- `scripts/validate-packed-cli-runtime.mjs`
- `package.json`
- `src/admin/changelog.ts`
- `src/admin/release.ts`

## Done when

- `pnpm run validate:packed-runtime` fails if packaged admin entrypoints or their module dependencies are missing.
- Existing packed CLI doctor smoke behavior is preserved.
- `pnpm run validate:packed-runtime` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:38:21-06:00
