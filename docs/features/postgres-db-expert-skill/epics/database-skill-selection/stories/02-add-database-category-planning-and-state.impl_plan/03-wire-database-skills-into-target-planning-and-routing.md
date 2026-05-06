# Step: Wire database skills into target planning and routing

## Goal

Make selected database skills participate in target computation, file rendering, skill routing, and state writes through the same mechanics as existing selectable categories.

## Scope

- Add `getSelectedDatabaseSkillsFromState` in `workflow-targets.ts`.
- Add selected database skill parameters to `getSelectedSkillTargetsForAgents`, `getWorkflowTargets`, `renderMissingWorkflowFiles`, and `writeSibuState`.
- Include selected database skills in skill target deduplication and managed-file state writing.
- Update `renderSkillRouting` in Template Catalog and Rendering to include selected database skills in `{{OPTIONAL_SKILL_ROUTING}}`.
- Preserve existing defaults so callers that do not pass database skills behave exactly as before.
- Do not update project adoption prompts, `sibu skills list/use/stop`, or sync migration prompts in this story.

## Files

- `src/modules/workflow-target-planning/workflow-targets.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/template-catalog-rendering/templates.ts`

## Done when

- Selected PostgreSQL Expert produces a `.agents/skills/postgresql-expert/SKILL.md` workflow target.
- `writeSibuState` persists `selectedDatabaseSkills: ['postgresql-expert']` when database skills are provided.
- Rendering `AGENTS.md` includes the PostgreSQL Expert routing instruction when selected.
- Existing callers compile without needing database skill arguments.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:17:46-06:00
