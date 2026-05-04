# Pipeline Template Contracts Epic Brief

## Summary

This Epic delivers contract-based behavior across Sibu's AI Development Workflow Pipeline templates. It makes each pipeline skill explicit about required inputs, owned outputs, stop conditions, stage boundaries, and context access so agents behave predictably without CLI changes.

## Source Context

- Feature brief: ../../feature_brief.md
- Technical design: ../../technical_design.md

## Scope

- Add the shared `## Pipeline Contract` structure to all pipeline-stage templates.
- Tailor each contract to its stage-specific inputs, outputs, stop rules, and boundaries.
- Apply the context access policy so downstream stages trust the technical design instead of rereading the Product Context Map by default.
- Keep local `.agents/skills/` copies aligned where matching skills exist.
- Update template manifest metadata and validate the template set.

## Out of Scope

- CLI behavior changes.
- Runtime pipeline engines or schema validation.
- Automated evals or new tests for contract behavior.
- New pipeline stages.
- Supporting skills such as `clean-code`, `typescript`, or `command-pattern`.

## User Stories

- [Add pipeline contracts to product and design stage templates](./stories/01-add-contracts-to-product-and-design-templates.md)
- [Add pipeline contracts to planning and execution stage templates](./stories/02-add-contracts-to-planning-and-execution-templates.md)
- [Update template metadata and validate contract coverage](./stories/03-update-metadata-and-validate-contracts.md)

## Acceptance Criteria

- All affected pipeline templates include one `## Pipeline Contract` section with the four required subsection headings.
- Each affected template states its own required inputs and output path or path pattern.
- Missing-input, wrong-stage, and incomplete-prior-artifact stop behavior is explicit where applicable.
- Later implementation stages do not require reading `docs/product-context-map.md` by default.
- Template manifest versions and user-facing change notes are updated for changed templates.
- Validation commands from the technical design pass or any failures are documented.

## Dependencies / Risks

- Story 3 depends on the template edits from Stories 1 and 2.
- Contract language must stay concise enough to avoid prompt bloat while preserving behavior quality.
