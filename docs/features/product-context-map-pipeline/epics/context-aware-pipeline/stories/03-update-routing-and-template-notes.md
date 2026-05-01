# Update Routing and Template Notes for the New Pipeline

## Epic

[Context-Aware Pipeline](../epic_brief.md)

## User Story

As a Sibu user, I want agent routing and sync notes to reflect the Product Context Map step, so that the workflow order is clear and existing projects understand the new required skill.

## Context

The pipeline now includes Product Context Map before feature briefs. Sibu templates and manifest notes should expose that change without adding unnecessary prompt weight.

## Scope

- Update `templates/AGENTS.md` skill routing to include `product-context-map-writer`.
- Update pipeline wording so Product Context Map appears between product vision and feature brief.
- Update relevant manifest entries and template versions for changed templates.
- Ensure change notes explain the new required managed skill and context-aware downstream behavior.
- Keep routing additions concise.

## Out of Scope

- Adding `docs/product-context-map.md` as a managed template.
- Updating source code beyond catalog/template metadata needed for routing and skill installation.

## Acceptance Criteria

- Agent instructions route Product Context Map creation/update requests to `product-context-map-writer`.
- Agent instructions route feature brief work after Product Context Map work.
- Manifest versions and change notes follow Sibu template-change rules.
- Existing projects receive clear sync notes about the new required skill.
- New routing language preserves context budget.

## Validation

- `pnpm build`
- `pnpm check`
- `pnpm test` or `pnpm verify`
- Manual review of `templates/manifest.json` change notes.
