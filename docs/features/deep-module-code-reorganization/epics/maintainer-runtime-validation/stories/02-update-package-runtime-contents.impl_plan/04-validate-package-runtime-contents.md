# Step: Validate package runtime contents

## Goal

Prove package runtime contents include all reorganized compiled modules needed by installed CLI and admin scripts.

## Scope

- Run `pnpm build`.
- Run `pnpm run validate:packed-runtime` after package file and validation script updates.
- Inspect or log the packed runtime paths enough to confirm `bin/modules/`, remaining required `bin/shared/`, and admin compatibility entrypoints are included.
- Run `pnpm test` if validation script changes need broad test confidence.
- Do not mark the story complete if packed-runtime validation fails due to missing moved runtime code.

## Files

- `package.json`
- `scripts/validate-packed-cli-runtime.mjs`
- `src/admin/changelog.ts`
- `src/admin/release.ts`
- `src/modules/maintainer-release-support/`

## Done when

- `pnpm build` passes.
- `pnpm run validate:packed-runtime` passes.
- Any package file inclusion changes are documented in the story execution summary.
- No obsolete `bin/features/` package entry is reintroduced.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:38:21-06:00
