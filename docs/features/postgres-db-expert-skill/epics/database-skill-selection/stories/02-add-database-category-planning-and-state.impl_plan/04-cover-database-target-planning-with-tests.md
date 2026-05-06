# Step: Cover database target planning with tests

## Goal

Prove database skills work through target planning, state persistence, and AGENTS.md routing without changing command-level behavior.

## Scope

- Update workflow target tests to include `SELECTABLE_DATABASE_SKILLS` in relevant selected-skill scenarios.
- Assert PostgreSQL Expert target path appears once at `.agents/skills/postgresql-expert/SKILL.md` when selected.
- Assert `writeSibuState` persists `selectedDatabaseSkills`.
- Assert generated `AGENTS.md` includes the PostgreSQL Expert routing instruction when selected.
- Keep tests focused on Workflow Target Planning and Template Catalog/Rendering mechanics.
- Do not add tests for init prompts or `sibu skills list/use/stop`; those belong to the next story.

## Files

- `src/modules/workflow-target-planning/workflow-targets.test.ts`
- `src/modules/workflow-target-planning/catalog.test.ts`
- `src/modules/workflow-state-registry/state.test.ts`

## Done when

- Catalog and workflow target tests cover database skill resolution, target paths, state persistence, and AGENTS.md routing.
- State tests cover optional `selectedDatabaseSkills` compatibility.
- Tests do not require command or prompt changes outside this story's scope.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:17:46-06:00
