# Step: Validate product and design contracts

## Goal

Check that the product and design template contract edits satisfy the story acceptance criteria without changing manifest metadata or unrelated pipeline templates.

## Scope

- Manually inspect all files touched by Steps 1 and 2 for contract heading coverage and stage-specific behavior.
- Confirm matching local `.agents/skills/` copies are aligned with changed templates where local copies exist.
- Run a focused text search for duplicate or missing `## Pipeline Contract` headings in the covered files.
- Run available formatting/build validation only if it is relevant and inexpensive; full template manifest validation belongs to Story 3.
- Do not edit `templates/manifest.json` in this step.
- Do not change planning/execution templates in this step.

## Files

- `templates/skills/product-vision-writer/SKILL.md`
- `templates/skills/product-context-map-writer/SKILL.md`
- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `.agents/skills/product-vision-writer/SKILL.md`
- `.agents/skills/product-context-map-writer/SKILL.md`
- `.agents/skills/feature-brief-writer/SKILL.md`
- `.agents/skills/technical-design-writer/SKILL.md`

## Done when

- Every covered template has exactly one `## Pipeline Contract` section.
- Every covered contract includes all four required subsection headings.
- Local `.agents/skills/` copies match their corresponding templates for the changed contract behavior.
- Product Context Map, feature brief, technical design, and UX acceptance criteria from the source User Story are covered.
- Any validation command run passes, or the failure and next action are documented.
- No manifest metadata updates are made as part of this story.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T14:35:18-06:00
