# Update Downstream Pipeline Skills for Deep Modules

## Epic
[Deep Module Map Workflow](../epic_brief.md)

## User Story
As a Sibu pipeline user, I want downstream planning skills to use Deep Modules consistently, so that feature briefs, technical designs, stories, and implementation plans preserve the same module boundaries.

## Context
Feature briefs should name existing Deep Modules. Technical designs should translate those modules into concrete implementation boundaries. Later planning and execution stages should trust the technical design rather than reread the full map by default.

## Scope
- Update `feature-brief-writer` to require `docs/deep-module-map.md` and output a `## Deep Module` section.
- Update `technical-design-writer` to require selected Deep Modules and translate them into implementation boundaries.
- Update `scrum-master-planner`, `ai-implementation-planner`, and `ai-implementation-plan-executor` to preserve Deep Module boundaries and avoid Product Context Map language.
- Update `product-vision-writer` and `ux-expert` boundary language where they mention the removed artifact.
- Update matching repository-local installed skill copies where applicable.

## Out of Scope
- Architecture-specific folder guidance; covered by the architecture story.
- Rewriting historical feature docs except the obsolete Product Context Map feature folder covered by cleanup.
- Adding runtime validation for feature brief sections.

## Acceptance Criteria
- Downstream skills refer to `docs/deep-module-map.md` and Deep Modules, not `docs/product-context-map.md` or Product Contexts.
- Feature brief guidance stops when a feature does not fit existing Deep Modules and routes back to `deep-module-map-writer`.
- Technical design guidance makes the selected Deep Modules the source for implementation boundary decisions.
- Scrum planning, implementation planning, and execution guidance preserve Deep Module boundaries without requiring a default reread of `docs/deep-module-map.md`.
- No downstream skill instructs agents to invent Product Contexts or preserve Product Context boundaries.

## Validation
- Search changed pipeline skills for old Product Context Map terms and confirm no active references remain.
- Review generated skill text for concise, non-duplicative guidance.
- Run repository verification from the technical design.
