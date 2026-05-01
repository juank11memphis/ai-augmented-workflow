# Context-Aware Pipeline Epic Brief

## Summary

Integrate Product Context Map awareness across Sibu’s built-in/local pipeline and first-scope architecture skills. Downstream skills should use Product Contexts as the answer to “where does this work belong?” while architecture skills decide how that context is structured internally.

## Source Context

- Feature brief: `docs/features/product-context-map-pipeline/feature_brief.md`
- Technical design: `docs/features/product-context-map-pipeline/technical_design.md`

## Scope

- Update feature brief and technical design skills to require and apply Product Contexts.
- Update implementation planner and executor skills to preserve Product Context boundaries.
- Update the DDD + Hexagonal and Command Pattern architecture skills for Product Context compatibility.
- Update routing instructions to reflect the new pipeline step.
- Keep all new skill guidance concise and non-duplicative.

## Out of Scope

- Third-party or custom architecture skill support.
- Adding Product Context compatibility to architecture skills beyond DDD + Hexagonal and Command Pattern.
- Generating code or folder structures automatically.

## User Stories

- [Make product planning skills context-aware](./stories/01-make-product-planning-skills-context-aware.md)
- [Preserve contexts during implementation planning and execution](./stories/02-preserve-contexts-during-implementation.md)
- [Make selected architecture skills context-compatible](./stories/02-make-architecture-skills-context-compatible.md)
- [Update routing and template notes for the new pipeline](./stories/03-update-routing-and-template-notes.md)

## Acceptance Criteria

- Feature briefs must reference existing Product Contexts or stop for a map update.
- Technical designs use feature Product Contexts when explaining implementation direction.
- Implementation plans and execution preserve approved context boundaries.
- DDD + Hexagonal and Command Pattern guidance respects Product Contexts when present.
- Routing instructions show Product Context Map before feature briefs.

## Dependencies / Risks

- Depends on the Product Context Map writer skill definition for shared language.
- Prompt bloat is a risk; each skill update should use compact compatibility rules instead of restating the full concept.
