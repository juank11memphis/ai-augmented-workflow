# Step: Inventory changed managed templates

## Goal

Identify every managed template changed by the workflow prompt compression feature so manifest updates cover exactly the affected template files and no unrelated templates.

## Scope

- Compare current template changes against the story baseline before the template-compression delivery work.
- Inventory changed managed templates under `templates/`, including `templates/AGENTS.md` and changed `templates/skills/**/SKILL.md` files.
- Distinguish template files from non-template source changes such as `src/shared/catalog.ts` routing text.
- Do not edit `templates/manifest.json` in this step.
- Do not edit generated managed workspace files.

## Files

- `templates/AGENTS.md`
- `templates/skills/**/SKILL.md`
- `templates/manifest.json`
- `src/shared/catalog.ts`

## Done when

- The step report lists every changed managed template that needs a manifest version and change-note update.
- The step report explicitly notes that `src/shared/catalog.ts` changed routing text but is not a managed template entry in `templates/manifest.json`.
- No files are modified in this step unless the step file is marked approved later by the executor.

## Inventory report

Changed managed templates that need `templates/manifest.json` updates:

- `AGENTS.md`
- `skills/product-vision-writer/SKILL.md`
- `skills/feature-brief-writer/SKILL.md`
- `skills/technical-design-writer/SKILL.md`
- `skills/scrum-master-planner/SKILL.md`
- `skills/ai-implementation-planner/SKILL.md`
- `skills/ai-implementation-plan-executor/SKILL.md`
- `skills/ai-prompt-engineer-master/SKILL.md`
- `skills/ux-expert/SKILL.md`

Non-template source change from this feature:

- `src/shared/catalog.ts` changed optional routing text, but it is not a managed template entry in `templates/manifest.json` and should not get a manifest entry.

Unchanged managed templates should keep their existing manifest versions and change notes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T22:04:59-06:00
