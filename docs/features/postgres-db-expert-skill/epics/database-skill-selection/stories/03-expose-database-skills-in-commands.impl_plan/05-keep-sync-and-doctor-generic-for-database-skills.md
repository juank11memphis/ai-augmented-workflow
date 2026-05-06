# Step: Keep sync and doctor generic for database skills

## Goal

Ensure doctor and sync continue to derive expected database skill targets from state without adding database-specific drift logic or prompts.

## Scope

- Pass `getSelectedDatabaseSkillsFromState(state)` into existing `getWorkflowTargets` and `renderTemplateForSync` calls in Sync Review, Workflow Health Diagnosis, and Sync action application where selected skill sets are reconstructed from state.
- Preserve the no-sync-time-database-prompt decision.
- Add or update focused tests only if current sync/doctor coverage needs explicit selected database skill behavior.
- Do not create database-specific sync statuses, doctor messages, or repair actions.

## Files

- `src/modules/sync-review/sync-preview.ts`
- `src/modules/sync-review/apply-action.ts`
- `src/modules/workflow-health-diagnosis/handler.ts`
- `src/modules/sync-review/sync-preview.test.ts` if needed
- `src/modules/workflow-health-diagnosis/handler.test.ts` if needed

## Done when

- Doctor expected-target computation includes selected database skills through generic target planning.
- Sync preview/render/apply flows include selected database skills through generic selected-skill reconstruction.
- No new database-specific sync or doctor prompt/copy is introduced.
- Existing sync and doctor tests still pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:27:02-06:00
