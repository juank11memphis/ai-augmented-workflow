# Step: Add database skill catalog resolution and tests

## Goal

Register PostgreSQL Expert in Workflow Target Planning's selectable skill catalog so the rest of Sibu can resolve the skill id as a database category.

## Scope

- Add `SELECTABLE_DATABASE_SKILLS` to `src/modules/workflow-target-planning/catalog.ts` with the PostgreSQL Expert metadata from the technical design.
- Include shared `.agents/skills/postgresql-expert/SKILL.md` target paths for Codex, Gemini, Claude, and Windsurf.
- Update `ResolvedSelectableSkill` and `resolveSelectableSkillById` to return `kind: 'database'` for `postgresql-expert`.
- Export `SELECTABLE_DATABASE_SKILLS` from `src/modules/workflow-target-planning/index.ts`.
- Update catalog tests to cover database resolution and shared Windsurf target path behavior.
- Do not wire database skills into init prompts or skill management commands in this story.

## Files

- `src/shared/types.ts`
- `src/modules/workflow-target-planning/catalog.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/workflow-target-planning/catalog.test.ts`

## Done when

- `resolveSelectableSkillById('postgresql-expert')` returns an ok database resolution.
- Unknown skill behavior remains unchanged.
- Mandatory-only skills still do not resolve as selectable skills.
- All selectable database skill targets use the shared `.agents/skills/postgresql-expert/SKILL.md` path for supported agents.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:17:46-06:00
