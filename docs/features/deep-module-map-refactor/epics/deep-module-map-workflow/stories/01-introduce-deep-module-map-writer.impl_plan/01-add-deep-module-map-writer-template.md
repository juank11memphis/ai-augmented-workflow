# Step: Add the Deep Module Map writer template

## Goal

Create the new managed `deep-module-map-writer` skill template from scratch so Sibu has a first-class pipeline stage for defining product-aligned implementation modules.

## Scope

- Add `templates/skills/deep-module-map-writer/SKILL.md` with frontmatter name `deep-module-map-writer`.
- Define `docs/deep-module-map.md` as the only artifact this skill writes.
- Require `docs/product-vision.md` before the skill can create or update a Deep Module Map.
- Include the recommended Deep Module Map structure from the technical design, including `Suggested module slug`.
- Make the skill explain that Deep Modules are suggested top-level implementation modules, not DDD, service, database, package, or team boundaries.
- Do not update downstream pipeline skills in this step.
- Do not create a project-specific `docs/deep-module-map.md`.

## Files

- `templates/skills/deep-module-map-writer/SKILL.md`
- `templates/skills/product-context-map-writer/SKILL.md`

## Done when

- `templates/skills/deep-module-map-writer/SKILL.md` exists and has frontmatter name `deep-module-map-writer`.
- The new skill requires `docs/product-vision.md` and writes `docs/deep-module-map.md`.
- The new skill includes name, suggested module slug, ownership, exclusions, scenarios, related modules, and boundary notes in its output guidance.
- The old `templates/skills/product-context-map-writer/SKILL.md` file is removed from the template tree.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:01:23-06:00
