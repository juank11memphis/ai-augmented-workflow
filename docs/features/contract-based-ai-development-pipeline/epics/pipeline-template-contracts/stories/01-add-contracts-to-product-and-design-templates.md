# Add Pipeline Contracts to Product and Design Stage Templates

## Epic
[Pipeline Template Contracts](../epic_brief.md)

## User Story
As a Sibu pipeline user, I want the product and design stage skills to enforce clear contracts, so that upstream product decisions are created in order and later stages receive reliable source artifacts.

## Context

The feature brief requires every pipeline skill to define what it needs, what it writes, when it stops, and what it must not do. This story covers the upstream product/design stages where Product Contexts are created, selected, and translated for implementation.

## Scope

- Update these templates with a concise `## Pipeline Contract` section:
  - `templates/skills/product-vision-writer/SKILL.md`
  - `templates/skills/product-context-map-writer/SKILL.md`
  - `templates/skills/feature-brief-writer/SKILL.md`
  - `templates/skills/technical-design-writer/SKILL.md`
  - `templates/skills/ux-expert/SKILL.md`
- Align matching local copies under `.agents/skills/` where they exist.
- Make `technical-design-writer` explicitly responsible for translating Product Context Map responsibilities into implementation boundaries.
- Make `ux-expert` explicitly apply only when a feature has UI impact.
- Remove or revise any required final confirmation-summary behavior that conflicts with the feature brief.

## Out of Scope

- Scrum planning, implementation planning, and execution templates.
- Manifest version updates and validation; those are handled by the metadata story.
- CLI changes.

## Acceptance Criteria

- Each covered template has exactly one `## Pipeline Contract` section.
- Each covered contract includes the four required subsection headings.
- Product context map work requires `docs/product-vision.md` and writes only `docs/product-context-map.md`.
- Feature brief work requires product vision and Product Context Map and writes only the feature brief artifact.
- Technical design work requires the feature brief and Product Context Map, writes only `technical_design.md`, and records implementation boundary translation.
- UX work requires a feature brief and UI impact, writes only `ux.md`, and stops when the feature has no UI impact.
- Covered templates stop and redirect instead of producing downstream artifacts owned by later stages.

## Validation

- Manually inspect each covered template for the required contract headings and stage-specific bullets.
- Confirm local `.agents/skills/` copies match changed templates where corresponding local skills exist.
