# Step: Validate the state registry refactor

## Goal

Prove the workflow state registry move is behavior-preserving and ready for review.

## Scope

- Run the focused state registry tests and existing workflow tests affected by state imports.
- Run the required build and package-runtime validation for this slice.
- Run the broader test suite if focused checks pass.
- Do not mark the story complete if any test was skipped, weakened, or only manually inspected without a clear reason.

## Files

- `src/modules/workflow-state-registry/state.test.ts`
- `src/features/doctor-project/handler.test.ts`
- `src/features/stop-managing-file/handler.test.ts`
- `src/features/use-skill/handler.test.ts`
- `src/modules/workflow-target-planning/workflow-targets.test.ts`
- `package.json`

## Done when

- `pnpm build` passes.
- `node --test bin/modules/workflow-state-registry/state.test.js` passes.
- Relevant compiled workflow tests pass, including doctor, stop-managing-file, use-skill, and workflow-target-planning tests.
- `pnpm run validate:packed-runtime` passes.
- `pnpm test` passes, or any remaining failure is documented as unrelated with exact failing command and output summary.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T16:38:57.176Z
