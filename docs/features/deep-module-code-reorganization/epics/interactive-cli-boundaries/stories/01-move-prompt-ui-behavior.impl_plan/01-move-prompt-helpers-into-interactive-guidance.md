# Step: Move prompt helpers into Interactive Guidance

## Goal

Move the existing prompt UI implementation from shared code into the Interactive Guidance module while preserving the current public helper names and behavior.

## Scope

- Move `src/shared/prompts.tsx` implementation into `src/modules/interactive-guidance/prompts.tsx` with stable exported names.
- Update relative imports in the moved file to use Workflow Target Planning and shared types from their approved locations.
- Update `src/modules/interactive-guidance/index.ts` to export the moved prompt helpers.
- Leave a temporary compatibility wrapper at `src/shared/prompts.tsx` that re-exports from Interactive Guidance so current consumers continue to compile until the follow-up consumer story.
- Preserve intro rendering, prompt text, cancel handling, validation behavior, multi-select behavior, selected-skill option semantics, and terminal presentation.
- Do not change which domain modules decide what to do with prompt answers.

## Files

- `src/shared/prompts.tsx`
- `src/modules/interactive-guidance/prompts.tsx`
- `src/modules/interactive-guidance/index.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/shared/types.ts`

## Done when

- Interactive Guidance owns the prompt helper implementation.
- `src/shared/prompts.tsx` contains no prompt behavior beyond compatibility re-exports.
- Existing consumers still compile without changing their imports in this step.
- `pnpm build` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T12:23:00-06:00
