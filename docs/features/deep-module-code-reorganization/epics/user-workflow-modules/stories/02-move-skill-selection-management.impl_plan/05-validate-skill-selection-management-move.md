# Step: Validate skill selection management move

## Goal

Prove the skill workflow move is behavior-preserving and ready for review.

## Scope

- Run the focused moved Skill Selection Management tests.
- Run build and broad tests after stale compiled files from deleted `src/features/list-skills/*`, `src/features/use-skill/*`, and `src/features/stop-managing-file/*` sources are not discoverable by the test runner.
- Run `sibu doctor` in this repository to confirm workflow state remains healthy after the refactor.
- Run packed-runtime validation if package contents or runtime module reachability changed in a way that could affect installed CLI behavior.
- Do not mark the story complete if any test is skipped, weakened, or only manually inspected without a clear reason.

## Files

- `src/modules/skill-selection-management/list-skills/handler.ts`
- `src/modules/skill-selection-management/use-skill/handler.ts`
- `src/modules/skill-selection-management/use-skill/handler.test.ts`
- `src/modules/skill-selection-management/stop-managing-file/handler.ts`
- `src/modules/skill-selection-management/stop-managing-file/handler.test.ts`
- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/execute-command.ts`
- `package.json`

## Done when

- `pnpm build` passes.
- `node --test bin/modules/skill-selection-management/use-skill/handler.test.js` passes.
- `node --test bin/modules/skill-selection-management/stop-managing-file/handler.test.js` passes.
- `pnpm test` passes, or any remaining failure is documented as unrelated with exact failing command and output summary.
- `sibu doctor` passes.
- Any packed-runtime validation needed for this move passes or has an exact documented reason for deferral.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T11:56:55-06:00
