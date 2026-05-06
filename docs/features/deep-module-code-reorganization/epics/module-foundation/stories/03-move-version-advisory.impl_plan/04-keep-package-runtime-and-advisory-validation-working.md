# Step: Keep package runtime and advisory validation working

## Goal

Ensure the Version Advisory move does not break compiled runtime packaging or the doctor advisory smoke validation.

## Scope

- Confirm `package.json` package contents still include compiled `bin/modules/` runtime files required by Doctor and CLI version reporting.
- Keep `bin/shared/` packaged while remaining shared runtime primitives are still compiled there.
- Update validation script imports or assumptions only if the module move makes an existing assumption stale.
- Do not change doctor advisory copy, package metadata, release publishing behavior, or command names.

## Files

- `package.json`
- `scripts/validate-doctor-version-advisory.mjs`
- `scripts/validate-packed-cli-runtime.mjs`
- `src/modules/version-advisory/index.ts`
- `src/modules/version-advisory/npm-version.ts`

## Done when

- Runtime package contents cover the compiled Version Advisory module.
- `pnpm run validate:doctor-version-advisory` passes after `pnpm build`.
- `pnpm run validate:packed-runtime` passes or any failure is documented as unrelated to Version Advisory with exact command and output summary.
- Doctor advisory smoke behavior remains equivalent for newer-version override and offline mode.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T16:56:54.478Z
