# Deep Module Map Workflow Epic Brief

## Summary

Deliver the Deep Module Map refactor across Sibu's planning workflow so agents use product-aligned implementation modules instead of the removed Product Context Map concept. This Epic creates the new map-writer skill, updates downstream handoffs, aligns architecture guidance, removes obsolete legacy map artifacts, and validates the managed template set.

## Source Context
- Feature brief: ../../feature_brief.md
- Technical design: ../../technical_design.md

## Scope
- Add `deep-module-map-writer` as the new workflow skill and `docs/deep-module-map.md` as the standard artifact.
- Remove the old `product-context-map-writer` template and Product Context Map routing language.
- Update downstream pipeline and architecture skills to preserve Deep Module boundaries.
- Update template manifest metadata and repository-local workflow copies.
- Remove obsolete Product Context Map feature docs and validate the template/workflow state.

## Out of Scope
- Automated migration or compatibility support for `docs/product-context-map.md`.
- Runtime code scaffolding for module folders.
- Choosing an internal architecture for all Deep Modules.
- Creating Sibu's own final `docs/deep-module-map.md` content.

## User Stories
- [Introduce the Deep Module Map writer and routing](./stories/01-introduce-deep-module-map-writer.md)
- [Update downstream pipeline skills for Deep Modules](./stories/02-update-pipeline-skills-for-deep-modules.md)
- [Update architecture guidance for Deep Module boundaries](./stories/02-update-architecture-guidance-for-deep-modules.md)
- [Remove legacy map remnants and validate templates](./stories/03-remove-product-context-remnants-and-validate.md)

## Acceptance Criteria
- The Sibu workflow routes module-map work to `deep-module-map-writer` and `docs/deep-module-map.md`.
- Legacy map terminology is removed from active templates and local workflow guidance.
- Feature, technical design, planning, execution, and architecture skills consistently use Deep Module terminology and boundaries.
- Obsolete Product Context Map docs and skill/template entries are removed rather than kept as compatibility aliases.
- Template manifest metadata and validation checks reflect the new managed template set.

## Dependencies / Risks
- Story 1 should land before downstream skill rewrites so naming and artifact paths are stable.
- Stories 2 and 3 can proceed in parallel after Story 1 because they affect different skill groups.
- Story 4 should run last because it validates cleanup and manifest consistency across the full change.
