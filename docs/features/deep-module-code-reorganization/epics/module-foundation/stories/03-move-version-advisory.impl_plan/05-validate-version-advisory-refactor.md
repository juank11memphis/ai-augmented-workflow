# Step: Validate the version advisory refactor

## Goal

Prove the Version Advisory move is behavior-preserving and ready for review.

## Scope

- Run the focused moved Version Advisory tests and affected Doctor tests.
- Run the required build and doctor advisory validation for this slice.
- Run the broader test suite if focused checks pass.
- Do not mark the story complete if any test was skipped, weakened, or only manually inspected without a clear reason.

## Files

- `src/modules/version-advisory/npm-version.test.ts`
- `src/modules/version-advisory/package-version.test.ts`
- `src/features/doctor-project/handler.test.ts`
- `src/entrypoints/cli/create-program.ts`
- `src/modules/workflow-target-planning/workflow-targets.ts`
- `package.json`

## Done when

- `pnpm build` passes.
- `node --test bin/modules/version-advisory/*.test.js` passes.
- Affected compiled Doctor tests pass.
- `pnpm run validate:doctor-version-advisory` passes.
- `pnpm test` passes, or any remaining failure is documented as unrelated with exact failing command and output summary.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T16:56:54.478Z
