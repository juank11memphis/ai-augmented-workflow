# Add Database Skill Category Planning and State

## Epic
[Database Skill Selection](../epic_brief.md)

## User Story
As a Sibu maintainer, I want database skills represented in the selectable skill catalog, state, and target planning, so that PostgreSQL Expert uses the same safe workflow mechanics as existing optional skills.

## Context

The technical design assigns the database category to Workflow Target Planning and keeps selected database skills backward-compatible through optional state. Target planning should deduplicate shared skill files and route selected skill instructions into `AGENTS.md` just like existing categories.

## Scope

- Add database skill id/type/state support in `src/shared/types.ts` and state validation.
- Add `SELECTABLE_DATABASE_SKILLS` with `postgresql-expert` in Workflow Target Planning.
- Resolve `postgresql-expert` as `kind: 'database'` through `resolveSelectableSkillById`.
- Include selected database skills in target planning, state writing, selected-from-state helpers, and skill routing rendering.
- Add or update tests for catalog resolution, target paths, state persistence, and `AGENTS.md` routing.

## Out of Scope

- Prompting users during init.
- Updating `sibu skills list/use/stop` command behavior.
- Adding more than one database skill.
- Adding sync-time migration prompts for old projects.

## Acceptance Criteria

- `postgresql-expert` resolves as a database skill.
- `selectedDatabaseSkills` is optional and backward-compatible in Sibu state.
- Selected database skills produce `.agents/skills/postgresql-expert/SKILL.md` targets for all supported agents.
- `writeSibuState` persists selected database skill ids when provided.
- Rendering `AGENTS.md` includes the PostgreSQL Expert routing instruction when selected.

## Validation

- Catalog and workflow target tests covering database skills pass.
- State validation tests cover optional `selectedDatabaseSkills` behavior where applicable.
- `pnpm run build`
