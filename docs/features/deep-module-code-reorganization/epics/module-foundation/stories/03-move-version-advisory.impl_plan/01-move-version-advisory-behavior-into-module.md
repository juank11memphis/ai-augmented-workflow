# Step: Move version advisory behavior into the module

## Goal

Put npm version advisory behavior behind `src/modules/version-advisory/` while preserving live lookup, cache, override, classification, and unavailable-result semantics.

## Scope

- Move `checkForLatestSibuVersion` and its helper behavior from `src/shared/npm-version.ts` into a module-owned implementation file such as `src/modules/version-advisory/npm-version.ts`.
- Move package name, current package version, npm lookup environment constants, supported lookup modes, cache TTL, registry URL, and cache path behavior into the Version Advisory module.
- Export the public advisory API and version/package constants from `src/modules/version-advisory/index.ts` with stable names where callers already depend on them.
- Keep `STATE_RELATIVE_PATH` in shared catalog as a state path constant only; do not leave npm advisory behavior or constants in generic shared catalog code.
- Do not change advisory copy, cache TTL, cache JSON shape, npm registry URL, override environment variable names, or unavailable-result behavior.

## Files

- `src/shared/npm-version.ts`
- `src/shared/catalog.ts`
- `src/shared/paths.ts`
- `src/modules/version-advisory/index.ts`
- `src/modules/version-advisory/npm-version.ts`
- `src/shared/types.ts`

## Done when

- Version Advisory owns `checkForLatestSibuVersion` and its npm lookup/cache helpers.
- Version Advisory owns `SIBU_PACKAGE_NAME`, `SIBU_VERSION`, `SIBU_NPM_LOOKUP_MODE`, `SIBU_NPM_LATEST_VERSION`, and `SIBU_CACHE_HOME` handling needed for advisory behavior.
- Shared catalog no longer mixes package/version and npm advisory constants with unrelated workflow constants.
- The moved implementation preserves live, cache, override, and unavailable outcomes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T16:56:54.478Z
