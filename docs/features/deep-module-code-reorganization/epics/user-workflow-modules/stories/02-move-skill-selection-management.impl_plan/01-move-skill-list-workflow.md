# Step: Move skill list workflow

## Goal

Move `sibu skills list` command behavior into the Skill Selection Management module while preserving the current read-only skill listing semantics.

## Scope

- Move `src/features/list-skills/command.ts` and `src/features/list-skills/handler.ts` into `src/modules/skill-selection-management/list-skills/` with stable exported names.
- Update relative imports inside the moved files to keep using Workflow Target Planning, Workflow State Registry, shared paths, shared prompts, and shared types from their approved locations.
- Update `src/modules/skill-selection-management/index.ts` to export `handleListSkills` and `ListSkillsCommand`.
- Preserve current output meaning, selected marker behavior, uninitialized-project warning, command discriminant, and command arguments.
- Do not move use-skill or stop-managing-file behavior in this step.

## Files

- `src/features/list-skills/command.ts`
- `src/features/list-skills/handler.ts`
- `src/modules/skill-selection-management/list-skills/command.ts`
- `src/modules/skill-selection-management/list-skills/handler.ts`
- `src/modules/skill-selection-management/index.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/workflow-state-registry/index.ts`
- `src/shared/paths.ts`
- `src/shared/prompts.tsx`
- `src/shared/types.ts`

## Done when

- Skill Selection Management owns `handleListSkills` and `ListSkillsCommand`.
- The moved list handler compiles with correct relative imports and no behavior changes.
- No production code imports list-skill behavior from `src/features/list-skills/*` after the CLI update step.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T11:56:55-06:00
