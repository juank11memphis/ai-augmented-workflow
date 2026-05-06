# Step: Support database skills in use command

## Goal

Allow existing projects to opt into PostgreSQL Expert with `sibu skills use postgresql-expert` using the same clean-workflow guardrails as existing selectable skills.

## Scope

- Extend `NextSkillSelection` with `selectedDatabaseSkills`.
- Add selected database skill preservation to all existing selection branches.
- Replace the temporary database blocked branch with multi-select database behavior.
- Include database skills in `renderTemplateForSync`, `renderMissingWorkflowFiles`, `getWorkflowTargets`, and `writeSibuState` calls inside the use-skill handler.
- Add helper resolution for database skill ids from state.
- Update use-skill tests for database selection, duplicate no-op behavior, state persistence, created skill file, and AGENTS.md routing update.
- Do not change architecture replacement behavior.

## Files

- `src/modules/skill-selection-management/use-skill/handler.ts`
- `src/modules/skill-selection-management/use-skill/handler.test.ts`

## Done when

- `getNextSkillSelection` prepares PostgreSQL Expert as a database selection.
- `getNextSkillSelection` returns no-op when PostgreSQL Expert is already selected.
- `handleUseSkill` creates `.agents/skills/postgresql-expert/SKILL.md` in a clean initialized repo.
- `handleUseSkill` records `selectedDatabaseSkills: ['postgresql-expert']` and updates `AGENTS.md` routing.
- Existing use-skill tests still pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:27:02-06:00
