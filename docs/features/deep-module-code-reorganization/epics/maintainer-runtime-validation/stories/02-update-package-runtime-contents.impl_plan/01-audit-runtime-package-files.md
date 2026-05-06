# Step: Audit runtime package files

## Goal

Confirm `package.json` package file entries match the reorganized compiled runtime layout before changing package contents.

## Scope

- Inspect runtime imports from `bin/sibu.js`, `bin/entrypoints/`, `bin/modules/`, and admin compatibility entrypoints after `pnpm build`.
- Confirm `bin/modules/` is included, `bin/shared/` remains included only for runtime primitives still imported, and `bin/features/` is not needed.
- Confirm admin compatibility entrypoints under `bin/admin/changelog.js` and `bin/admin/release.js` remain package-reachable if package scripts still use them.
- Do not change package name, version, publish policy, command behavior, or admin behavior.

## Files

- `package.json`
- `bin/sibu.js`
- `bin/entrypoints/`
- `bin/modules/`
- `bin/shared/`
- `bin/admin/changelog.js`
- `bin/admin/release.js`

## Done when

- Runtime package needs are explicitly known before editing `package.json`.
- No runtime import depends on `bin/features/`.
- Any remaining `bin/shared/` package inclusion is justified by runtime imports.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:38:21-06:00
