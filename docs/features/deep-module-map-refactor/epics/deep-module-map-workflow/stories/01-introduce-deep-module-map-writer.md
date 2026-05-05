# Introduce the Deep Module Map Writer and Routing

## Epic
[Deep Module Map Workflow](../epic_brief.md)

## User Story
As a Sibu workflow user, I want a Deep Module Map writer skill and routing language, so that I can define product-aligned implementation modules before feature work begins.

## Context
The feature replaces Product Context Map with Deep Module Map. The new skill should be treated as a brand-new managed skill, not a compatibility rename.

## Scope
- Add `templates/skills/deep-module-map-writer/SKILL.md`.
- Define `docs/deep-module-map.md` as the writer's owned artifact.
- Remove `templates/skills/product-context-map-writer/SKILL.md` from the active template set.
- Update `templates/AGENTS.md` pipeline order and skill routing to use Deep Module Map language.
- Update `templates/manifest.json` for the new skill, removed old skill, changed AGENTS template, and template version bumps.

## Out of Scope
- Updating all downstream skills; covered by later stories.
- Supporting Product Context Map compatibility aliases or migrations.
- Creating a project-specific `docs/deep-module-map.md`.

## Acceptance Criteria
- `deep-module-map-writer` exists as a managed skill template with frontmatter name `deep-module-map-writer`.
- The writer requires `docs/product-vision.md` and writes `docs/deep-module-map.md`.
- The writer's recommended map structure includes module name, suggested module slug, ownership, exclusions, scenarios, related modules, and boundary notes.
- Active agent routing points Deep Module Map requests to `deep-module-map-writer`.
- The old product-context map writer template is no longer present in the active template set or manifest.

## Validation
- Search active templates for `product-context-map-writer` and confirm no active references remain.
- Confirm `templates/manifest.json` includes the new skill entry and no old writer entry.
- Run manifest/template validation as described in the technical design.

## Notes
- Treat Deep Modules as suggested top-level implementation modules, not as DDD, service, database, package, or team boundaries.
