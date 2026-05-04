# Add Pipeline Contracts to Planning and Execution Stage Templates

## Epic
[Pipeline Template Contracts](../epic_brief.md)

## User Story
As a Sibu pipeline user, I want planning and execution skills to trust approved upstream artifacts, so that implementation work stays inside the agreed scope without reinterpreting product context.

## Context

The technical design says Scrum planning, implementation planning, and execution should trust `technical_design.md` as the implementation-boundary source of truth. These later stages should not reread the Product Context Map by default and should stop if required upstream translation is missing.

## Scope

- Update these templates with a concise `## Pipeline Contract` section:
  - `templates/skills/scrum-master-planner/SKILL.md`
  - `templates/skills/ai-implementation-planner/SKILL.md`
  - `templates/skills/ai-implementation-plan-executor/SKILL.md`
- Align matching local copies under `.agents/skills/`.
- Make Scrum planning require feature brief and technical design, plus `ux.md` only for UI-impacting features.
- Make implementation planning require exactly one story plus its required source artifacts and technical design.
- Make implementation execution require exactly one story or implementation plan folder plus ordered step files and technical design.
- Clarify that these downstream stages must not modify prior-stage artifacts.
- Clarify that these downstream stages do not reread `docs/product-context-map.md` by default.

## Out of Scope

- Product vision, context map, feature brief, technical design, and UX templates.
- Manifest version updates and validation; those are handled by the metadata story.
- Writing implementation plans or production code for this feature.

## Acceptance Criteria

- Each covered template has exactly one `## Pipeline Contract` section.
- Each covered contract includes the four required subsection headings.
- Scrum planning writes only Epic and User Story artifacts under the feature's `epics/` tree.
- Implementation planning writes only story-local `.impl_plan/*.md` step files.
- Implementation execution preserves the existing one-step-at-a-time execution model and reviewed-step behavior.
- Downstream templates stop when required source artifacts are missing, incomplete, or owned by a prior stage that needs repair.
- Downstream templates trust `technical_design.md` for implementation boundaries and do not require the Product Context Map by default.

## Validation

- Manually inspect each covered template for the required contract headings and stage-specific bullets.
- Confirm local `.agents/skills/` copies match changed templates.
- Confirm existing executor confirmation/review behavior is preserved.
