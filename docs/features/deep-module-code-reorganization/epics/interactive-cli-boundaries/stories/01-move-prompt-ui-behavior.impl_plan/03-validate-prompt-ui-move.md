# Step: Validate prompt UI move

## Goal

Prove the prompt UI move is behavior-preserving and ready for review.

## Scope

- Run the focused moved Interactive Guidance prompt tests.
- Run build and broad tests after stale compiled prompt tests from `bin/shared/prompts.test.js` are not discoverable by the test runner.
- Run `sibu doctor` in this repository to confirm CLI intro/rendering imports still work in a real command.
- Run packed-runtime validation if package contents or runtime module reachability changed in a way that could affect installed CLI behavior.
- Do not mark the story complete if any test is skipped, weakened, or only manually inspected without a clear reason.

## Files

- `src/modules/interactive-guidance/prompts.tsx`
- `src/modules/interactive-guidance/prompts.test.ts`
- `src/modules/interactive-guidance/index.ts`
- `src/shared/prompts.tsx`
- `package.json`

## Done when

- `pnpm build` passes.
- `node --test bin/modules/interactive-guidance/prompts.test.js` passes.
- `pnpm test` passes, or any remaining failure is documented as unrelated with exact failing command and output summary.
- `sibu doctor` passes.
- Any packed-runtime validation needed for this move passes or has an exact documented reason for deferral.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:23:00-06:00
