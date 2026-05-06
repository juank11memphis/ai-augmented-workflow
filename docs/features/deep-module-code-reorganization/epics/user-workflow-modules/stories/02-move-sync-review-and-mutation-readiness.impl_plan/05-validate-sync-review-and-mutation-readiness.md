# Step: Validate sync review and mutation readiness move

## Goal

Prove the sync review and mutation readiness move is behavior-preserving and ready for review.

## Scope

- Run the focused moved Sync Review and Workflow Mutation Readiness tests.
- Run build and broad tests after stale compiled files from deleted `src/features/sync-project/*`, `src/shared/sync-preview.*`, and `src/shared/workflow-mutation-readiness.*` sources are not discoverable by the test runner.
- Run `sibu doctor` in this repository to confirm workflow state remains healthy after the refactor.
- Run packed-runtime validation if package contents or runtime module reachability changed in a way that could affect installed CLI behavior.
- Do not mark the story complete if any test is skipped, weakened, or only manually inspected without a clear reason.

## Files

- `src/modules/sync-review/sync-preview.ts`
- `src/modules/sync-review/sync-preview.test.ts`
- `src/modules/sync-review/handler.ts`
- `src/modules/workflow-mutation-readiness/workflow-mutation-readiness.ts`
- `src/modules/workflow-mutation-readiness/workflow-mutation-readiness.test.ts`
- `src/modules/skill-selection-management/use-skill/handler.ts`
- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/execute-command.ts`
- `package.json`

## Done when

- `pnpm build` passes.
- `node --test bin/modules/sync-review/sync-preview.test.js` passes.
- `node --test bin/modules/workflow-mutation-readiness/workflow-mutation-readiness.test.js` passes.
- `pnpm test` passes, or any remaining failure is documented as unrelated with exact failing command and output summary.
- `sibu doctor` passes.
- Any packed-runtime validation needed for this move passes or has an exact documented reason for deferral.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:05:53-06:00
