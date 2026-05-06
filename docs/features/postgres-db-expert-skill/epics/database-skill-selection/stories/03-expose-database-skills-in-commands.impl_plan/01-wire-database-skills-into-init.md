# Step: Wire database skills into init

## Goal

Expose PostgreSQL Expert during first-time project adoption through an optional database skill selection prompt and persist the selected database skills in the initial workflow state.

## Scope

- Add `askForDatabaseSkills()` in Interactive Guidance as an optional multiselect over `SELECTABLE_DATABASE_SKILLS`.
- Prompt after framework selection and before architecture selection in `sibu init`.
- Pass selected database skills through `getWorkflowTargets`, `renderMissingWorkflowFiles`, and `writeSibuState` in Project Adoption.
- Update prompt exports as needed.
- Add or update prompt/adoption-adjacent tests only where practical with existing test structure.
- Do not add sync-time prompts for database skills.

## Files

- `src/modules/interactive-guidance/prompts.tsx`
- `src/modules/interactive-guidance/index.ts`
- `src/modules/interactive-guidance/prompts.test.ts`
- `src/modules/project-adoption/handler.ts`

## Done when

- `sibu init` has a database-related optional selection point for PostgreSQL Expert.
- Selected database skills flow into initial target planning, file rendering, and state writing.
- Existing init behavior remains unchanged when no database skill is selected.
- No sync-time database prompt is introduced.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:27:02-06:00
