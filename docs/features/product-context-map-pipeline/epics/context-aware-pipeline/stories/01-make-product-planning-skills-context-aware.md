# Make Product Planning Skills Context-Aware

## Epic

[Context-Aware Pipeline](../epic_brief.md)

## User Story

As a Sibu user, I want feature brief and technical design skills to use Product Contexts, so that product planning and technical direction share the same responsibility boundaries.

## Context

Product Context Maps sit between product vision and feature briefs. Feature briefs must not silently invent contexts, and technical designs must translate approved contexts through selected architecture guidance.

## Scope

- Update `feature-brief-writer` to read `docs/product-context-map.md` after `docs/product-vision.md`.
- Make `feature-brief-writer` stop if the Product Context Map is missing and instruct the user to create it with `product-context-map-writer`.
- Add a required `## Product Context` section to feature briefs.
- Make `feature-brief-writer` stop if no existing Product Context fits and provide a suggested map-update prompt.
- Update `technical-design-writer` to read the Product Context Map and the feature brief’s Product Context section.
- Make `technical-design-writer` explain Product Context and architecture interaction only when it affects implementation direction.

## Out of Scope

- Updating implementation planner/executor behavior.
- Updating architecture skill internals.

## Acceptance Criteria

- Feature brief generation requires an existing Product Context Map.
- Feature briefs identify one or more existing Product Contexts.
- Feature brief generation stops before drafting when a new context appears necessary.
- The stop message gives the user clear instructions for updating the map.
- Technical designs preserve the selected Product Contexts and avoid inventing new ones.

## Validation

- Review updated skill templates for concise, non-duplicative Product Context guidance.
- `pnpm build`
- `pnpm check`
