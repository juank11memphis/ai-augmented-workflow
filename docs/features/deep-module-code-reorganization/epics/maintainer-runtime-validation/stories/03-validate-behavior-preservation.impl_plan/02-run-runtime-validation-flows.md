# Step: Run runtime validation flows

## Goal

Run the package/runtime validation flows required by the technical design to prove installed and post-update behavior still works.

## Scope

- Run `pnpm run validate:packed-runtime`.
- Run `pnpm run validate:doctor-version-advisory`.
- Run `pnpm run validate:post-update-doctor-drift`.
- Capture exact failing command and concise output summary if any validation fails.
- Fix only behavior-preservation regressions that are clearly within the refactor scope.
- Do not publish to npm or change release policy.

## Files

- `package.json`
- `scripts/validate-packed-cli-runtime.mjs`
- `scripts/validate-doctor-version-advisory.mjs`
- `scripts/validate-post-update-doctor-drift.mjs`
- `src/modules/version-advisory/`
- `src/modules/workflow-health-diagnosis/`
- `src/modules/sync-review/`

## Done when

- `pnpm run validate:packed-runtime` passes.
- `pnpm run validate:doctor-version-advisory` passes.
- `pnpm run validate:post-update-doctor-drift` passes.
- Any failure is either fixed within scope and rerun, or reported with exact command and output summary.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:58:13-06:00
