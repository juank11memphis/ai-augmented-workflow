# Step: Compress planning workflow skills

## Goal

Apply audit-backed, conservative compression to the planning-oriented skill templates while preserving their required inputs, hard stop rules, output locations, artifact formats, and quality gates.

## Scope

- Edit only planning workflow skill templates where the audit recommends useful-but-compressible wording:
  - `templates/skills/product-vision-writer/SKILL.md`
  - `templates/skills/feature-brief-writer/SKILL.md`
  - `templates/skills/technical-design-writer/SKILL.md`
  - `templates/skills/scrum-master-planner/SKILL.md`
  - `templates/skills/ai-implementation-planner/SKILL.md`
- Preserve each skill's purpose, ownership boundaries, required inputs, missing-input stop conditions, output locations, examples that define non-obvious output shape, and final response behavior.
- Reduce only wording that the audit identifies as useful-but-compressible or duplicated without added behavioral value.
- Leave uncertain reductions unchanged.
- Do not edit generated `.agents/skills/**` files.
- Do not update `templates/manifest.json`; metadata updates belong to the later metadata story.

## Files

- `templates/skills/product-vision-writer/SKILL.md`
- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/scrum-master-planner/SKILL.md`
- `templates/skills/ai-implementation-planner/SKILL.md`
- `docs/features/workflow-prompt-compression/template_audit.md`

## Done when

- Changed planning skill templates still state when to use the skill, what source context is required, when to stop, where to write outputs, and how to respond after writing.
- Every removed or reduced instruction is traceable to audit rationale in `template_audit.md`.
- Manual diff review confirms no quality-critical rule, stop condition, required input, output location, or artifact format was removed without equivalent replacement.
- `git diff -- .agents templates/manifest.json` shows generated skill copies and manifest metadata were not edited.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T21:59:01-06:00
