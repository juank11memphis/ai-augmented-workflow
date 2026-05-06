# Step: Validate adoption and health diagnosis move

## Goal

Prove the init and doctor workflow move is behavior-preserving and ready for review.

## Scope

- Run the focused moved Workflow Health Diagnosis tests.
- Run build and broad tests after stale compiled files from deleted `src/features/init-project/*` and `src/features/doctor-project/*` sources are not discoverable by the test runner.
- Run `sibu doctor` in this repository to confirm read-only health diagnosis still works against the current workflow state.
- Run packed-runtime validation if package contents or runtime module reachability changed in a way that could affect installed CLI behavior.
- Do not mark the story complete if any test is skipped, weakened, or only manually inspected without a clear reason.

## Files

- `src/modules/project-adoption/handler.ts`
- `src/modules/workflow-health-diagnosis/handler.ts`
- `src/modules/workflow-health-diagnosis/handler.test.ts`
- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/execute-command.ts`
- `package.json`

## Done when

- `pnpm build` passes.
- `node --test bin/modules/workflow-health-diagnosis/handler.test.js` passes.
- `pnpm test` passes, or any remaining failure is documented as unrelated with exact failing command and output summary.
- `sibu doctor` passes and remains read-only.
- Any packed-runtime validation needed for this move passes or has an exact documented reason for deferral.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T11:51:42-06:00
