# Step: Update package files for admin compatibility

## Goal

Update package runtime file entries so installed user CLI and admin compatibility scripts can resolve all moved module code.

## Scope

- Update `package.json` `files` entries only as needed for the final reorganized runtime layout.
- Preserve `bin/sibu.js`, `bin/entrypoints/`, `bin/modules/`, `bin/shared/`, `templates/`, and `README.md` when still required.
- Add `bin/admin/changelog.js`, `bin/admin/release.js`, and admin compatibility tests exclusions or `bin/admin/` packaging if needed for existing `admin:*` scripts to work from a packed install.
- Keep test files excluded from package contents.
- Remove obsolete package paths only after no runtime imports depend on them.
- Do not publish to npm or change package metadata unrelated to runtime file inclusion.

## Files

- `package.json`
- `src/admin/changelog.ts`
- `src/admin/release.ts`
- `src/modules/maintainer-release-support/index.ts`

## Done when

- Package `files` includes all compiled files needed by installed CLI and admin scripts.
- Obsolete `bin/features/` remains absent.
- Tests remain excluded from packaged runtime contents.
- `pnpm build` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:38:21-06:00
