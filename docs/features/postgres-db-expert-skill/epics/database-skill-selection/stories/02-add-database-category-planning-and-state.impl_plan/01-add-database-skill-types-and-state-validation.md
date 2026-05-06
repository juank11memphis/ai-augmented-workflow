# Step: Add database skill types and state validation

## Goal

Extend Sibu's shared selectable-skill contracts so database skills are a first-class optional state category while remaining backward-compatible for existing projects.

## Scope

- Add a `DatabaseSkillId` union containing `postgresql-expert`.
- Add a `SelectableDatabaseSkill` type that matches existing selectable multi-skill category shapes.
- Add optional `selectedDatabaseSkills?: DatabaseSkillId[]` to `SibuState`.
- Update state schema validation so `selectedDatabaseSkills` is valid when absent or when it is an array of strings.
- Add or update state registry tests to prove old state without `selectedDatabaseSkills` remains valid and state with `selectedDatabaseSkills: ['postgresql-expert']` is valid.
- Do not add init prompts, skill command handling, or sync-time database prompts in this story.

## Files

- `src/shared/types.ts`
- `src/modules/workflow-state-registry/state.ts`
- `src/modules/workflow-state-registry/state.test.ts`

## Done when

- TypeScript shared contracts include database skill id, selectable database skill, and optional selected database skills state.
- `readStateForDoctor` accepts existing state files without `selectedDatabaseSkills`.
- `readStateForDoctor` accepts state files with `selectedDatabaseSkills` as a string array.
- State validation rejects non-array/non-string selected database skill values consistently with existing category validation.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:17:46-06:00
