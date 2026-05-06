# Step: Move prompt tests

## Goal

Move prompt-related tests into Interactive Guidance while preserving equivalent assertions for prompt decision helpers.

## Scope

- Move `src/shared/prompts.test.ts` to `src/modules/interactive-guidance/prompts.test.ts`.
- Update test imports to use Interactive Guidance exports and shared types from their approved locations.
- Preserve existing assertions for `shouldAskForNewLanguageSkills` and any prompt-helper behavior currently covered by tests.
- Do not weaken assertions or replace tests with manual inspection.
- Do not add new prompt copy or new prompt flows.

## Files

- `src/shared/prompts.test.ts`
- `src/modules/interactive-guidance/prompts.test.ts`
- `src/modules/interactive-guidance/index.ts`
- `src/modules/interactive-guidance/prompts.tsx`
- `src/shared/types.ts`

## Done when

- Interactive Guidance owns prompt-related tests.
- Moved tests retain equivalent assertions.
- Focused compiled tests can run with `pnpm build && node --test bin/modules/interactive-guidance/prompts.test.js`.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:23:00-06:00
