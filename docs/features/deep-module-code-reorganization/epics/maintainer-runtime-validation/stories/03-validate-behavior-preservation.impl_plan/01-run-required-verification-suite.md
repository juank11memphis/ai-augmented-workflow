# Step: Run required verification suite

## Goal

Run the required project-level verification commands for the completed Deep Module reorganization.

## Scope

- Run `pnpm verify`.
- Run `sibu doctor` in this repository.
- Capture exact failing command and concise output summary if any validation fails.
- Fix only behavior-preservation regressions that are clearly within the refactor scope.
- Do not weaken tests, remove tests, publish a release, or add new functionality to satisfy validation.

## Files

- `package.json`
- `scripts/run-tests.mjs`
- `src/`
- `docs/features/deep-module-code-reorganization/`

## Done when

- `pnpm verify` passes.
- `sibu doctor` passes in this repository.
- Any failure is either fixed within scope and rerun, or reported with exact command and output summary.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:58:13-06:00
