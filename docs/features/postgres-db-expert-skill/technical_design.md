# Technical Design: PostgreSQL Expert Skill

## Inputs

- Product vision: `docs/product-vision.md`
- Deep Module Map: `docs/deep-module-map.md`
- Feature brief: `docs/features/postgres-db-expert-skill/feature_brief.md`
- Delegated skills for implementation: `clean-code`, `typescript`, `command-pattern`, `sibu-template-change`, `ai-prompt-engineer-master`

## Summary

Add a new selectable database skill category to the existing skill catalog, with **PostgreSQL Expert** as its first skill. The implementation should reuse the current selectable-skill mechanics instead of creating a separate database workflow: catalog entry, state selection, target planning, template rendering, init prompt, skills list/use/stop support, and sync/doctor compatibility.

## Existing Context

- Selectable skill categories currently live in `src/modules/workflow-target-planning/catalog.ts` as language, framework, architecture, and workflow arrays.
- State tracks selected categories in `src/shared/types.ts` and `src/modules/workflow-state-registry/state.ts`; missing optional category fields are backward-compatible.
- Target resolution and state writes flow through `src/modules/workflow-target-planning/workflow-targets.ts`.
- Init prompts are in `src/modules/interactive-guidance/prompts.tsx` and wired by `src/modules/project-adoption/handler.ts`.
- `sibu skills list/use/stop` already resolve selectable skill ids through `resolveSelectableSkillById` and update the relevant selected-skill field.
- Skill templates are stored under `templates/skills/**/SKILL.md` and registered in `templates/manifest.json`; template changes must update manifest metadata.

## Proposed Design

### Skill category and catalog

- Add `DatabaseSkillId = 'postgresql-expert'` and `SelectableDatabaseSkill` to `src/shared/types.ts`.
- Add `SELECTABLE_DATABASE_SKILLS` in `src/modules/workflow-target-planning/catalog.ts` with:
  - `id`: `postgresql-expert`
  - `name`: `PostgreSQL Expert`
  - `description`: concise schema design and PostgreSQL judgment guidance
  - `routingInstruction`: use the skill for PostgreSQL schema design, migrations, constraints, queries, indexing, and database tradeoffs
  - `templateRelativePath`: `skills/postgresql-expert/SKILL.md`
  - shared `.agents/skills/postgresql-expert/SKILL.md` target for all supported agents
- Update `ResolvedSelectableSkill` and `resolveSelectableSkillById` to include `kind: 'database'`.
- Export `SELECTABLE_DATABASE_SKILLS` from the workflow target planning index.

### State and target planning

- Add optional `selectedDatabaseSkills?: DatabaseSkillId[]` to `SibuState`.
- Validate it like the other optional array fields in `state.ts`; undefined means no database skills selected for old projects.
- Add helpers in `workflow-targets.ts`:
  - `getSelectedDatabaseSkillsFromState`
  - database-skill parameter support in `getSelectedSkillTargetsForAgents`, `getWorkflowTargets`, `renderMissingWorkflowFiles`, and `writeSibuState`
- Include selected database skills in the same target deduplication path as other skill templates.
- Include selected database skills in `renderSkillRouting` so `AGENTS.md` receives the PostgreSQL routing instruction.

### Init and interactive guidance

- Add `askForDatabaseSkills()` in `interactive-guidance/prompts.tsx` as an optional multiselect.
- Prompt after framework selection and before architecture selection so it reads as a technology/domain category, not workflow-process guidance.
- Wire the selected database skills through `project-adoption/handler.ts` into target planning, rendering, and state writing.
- Do not add a sync-time migration prompt for existing projects. Existing projects can opt in through `sibu skills use postgresql-expert`; this keeps the new category optional and avoids prompting users about database choices during unrelated sync work.

### Skill management commands

- Update `sibu skills list` to show a **Databases** group and selected marker based on `selectedDatabaseSkills`.
- Update `sibu skills use` selection calculation to append database skills to `selectedDatabaseSkills` and preserve all existing category selections.
- Update `sibu skills stop` to detect and remove database skills from `selectedDatabaseSkills` while preserving existing stop/delete behavior.
- Keep architecture exclusivity unchanged; database skills are multi-select like language/framework/workflow skills.

### Template content and manifest

- Add `templates/skills/postgresql-expert/SKILL.md`.
- Keep the skill concise and principle-driven. It should cover schema clarity, constraints, migrations, query/access-pattern awareness, transactions, PostgreSQL-specific capabilities, and index restraint.
- Explicitly avoid DBA-scale coverage, database introspection, generated schemas, and blanket index recommendations.
- Update `templates/manifest.json` with a new template entry and bump the global template version. Use user-facing change notes that explain the new optional database category and PostgreSQL Expert template.

### Module boundaries

- **Workflow Target Planning** owns the database category type, catalog entry, resolution, and target computation.
- **Template Catalog and Rendering** owns rendering the new skill template and routing instruction; it should not decide whether the skill is selected.
- **Project Adoption** owns wiring the new init prompt into initial file creation/state.
- **Skill Selection Management** owns list/use/stop behavior for the database category after init.
- **Sync Review / Workflow Health Diagnosis** should work through existing expected-target/state mechanics; no special database-specific drift logic is needed.

## Validation

- Unit tests:
  - catalog resolves `postgresql-expert` as `database`
  - all selected skill targets include the PostgreSQL skill for shared `.agents/skills` paths
  - init state writing persists `selectedDatabaseSkills`
  - rendered `AGENTS.md` includes the PostgreSQL routing instruction when selected
  - `skills use postgresql-expert` adds the skill and is a no-op when already selected
  - `skills stop postgresql-expert` removes the database selection
  - `skills list` shows the Databases group with correct selected state
- Runtime validation:
  - `pnpm run build`
  - `pnpm run validate:packed-runtime`
  - `sibu doctor` after implementation

## Risks / Open Questions

- Adding a new state category touches several function signatures; keep the implementation mechanical and consistent with existing categories.
- The skill content can easily grow too large. Favor a small first version and leave deep performance/DBA guidance out of scope.
