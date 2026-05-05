# Step: Run final validation and record results

## Goal

Run the final validation commands for the Deep Module Map refactor and document any remaining expected failures or workflow drift.

## Scope

- Run `pnpm verify`.
- Run `sibu doctor`.
- Run temporary Sibu lifecycle checks (`sibu init`, `sibu doctor`, `sibu sync`) when practical and safe in a temp directory.
- Document validation failures with clear follow-up notes instead of silently expanding scope.
- Do not manually edit `.sibu/state.json` unless required and explicitly approved by the user.

## Files

- `docs/features/deep-module-map-refactor/epics/deep-module-map-workflow/stories/03-remove-product-context-remnants-and-validate.impl_plan/04-run-final-validation-and-record-results.md`
- `templates/manifest.json`
- `.sibu/state.json`

## Done when

- `pnpm verify` result is known and documented.
- `sibu doctor` result is known and documented.
- Temporary lifecycle check result is known, skipped with reason, or documented as blocked.
- Any remaining failures are clearly tied to follow-up work or expected workflow drift.

## Validation results

- `pnpm verify`: failed. Build and typecheck completed, then the test phase failed in workflow/template-state-related tests:
  - `bin/features/doctor-project/handler.test.js`
  - `bin/features/stop-managing-file/handler.test.js`
  - `bin/features/use-skill/handler.test.js`
  - `bin/shared/sync-preview.test.js`
  - `bin/shared/workflow-mutation-readiness.test.js`
  - `bin/shared/workflow-targets.test.js`
- `sibu doctor`: ran and reported review needed. The repo's `.sibu/state.json` was generated from template version 63 while the manifest is now version 66, and it still records the removed local `product-context-map-writer` managed skill plus older local workflow template versions. Per the step scope, `.sibu/state.json` was not manually edited.
- Temporary lifecycle check: skipped. `sibu init` is interactive and prompts for agent selection; running a full lifecycle non-interactively was not practical in this step.
- Follow-up: the failing tests appear tied to runtime/template-state expectations that still reference the removed Product Context Map skill. Fixing those expectations is outside this validation-only step unless a later approved step expands into runtime/test maintenance.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T15:05:53-06:00
