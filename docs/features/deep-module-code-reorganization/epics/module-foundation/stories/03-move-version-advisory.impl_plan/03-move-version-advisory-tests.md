# Step: Move version advisory tests

## Goal

Keep equivalent test coverage for Version Advisory after the module move.

## Scope

- Move `src/shared/npm-version.test.ts` to `src/modules/version-advisory/npm-version.test.ts` and update imports.
- Move or update package-version tests that currently live in `src/shared/catalog.test.ts` so `SIBU_VERSION` is tested through the Version Advisory module.
- Preserve assertions for override version, offline override mode, fresh cache reuse, and package version resolution.
- Add focused assertions only when needed to cover moved cache-path or constant ownership without changing behavior.
- Do not weaken or delete assertions to make the move easier.

## Files

- `src/shared/npm-version.test.ts`
- `src/shared/catalog.test.ts`
- `src/modules/version-advisory/npm-version.test.ts`
- `src/modules/version-advisory/package-version.test.ts`
- `src/modules/version-advisory/index.ts`
- `src/modules/version-advisory/npm-version.ts`

## Done when

- Version advisory tests live under `src/modules/version-advisory/`.
- Tests prove override, offline, cache, and package version behavior remain equivalent.
- Generic shared catalog tests no longer assert Version Advisory-owned package/version behavior.
- Focused compiled tests can run with `pnpm build && node --test bin/modules/version-advisory/*.test.js`.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T16:56:54.478Z
