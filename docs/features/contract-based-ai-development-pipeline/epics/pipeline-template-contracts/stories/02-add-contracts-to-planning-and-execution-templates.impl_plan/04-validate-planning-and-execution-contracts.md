# Step: Validate planning and execution contracts

## Goal

Check that the planning and execution template contract edits satisfy the story acceptance criteria without changing manifest metadata or unrelated templates.

## Scope

- Manually inspect Scrum planner, implementation planner, and executor templates plus matching local copies for contract coverage and stage-specific behavior.
- Confirm matching local `.agents/skills/` copies are aligned with changed templates.
- Run a focused text search for duplicate or missing `## Pipeline Contract` headings in the covered files.
- Confirm executor review gate and approved-step commit behavior are still present.
- Do not edit `templates/manifest.json` in this step.
- Do not change product/design templates in this step.

## Files

- `templates/skills/scrum-master-planner/SKILL.md`
- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `.agents/skills/scrum-master-planner/SKILL.md`
- `.agents/skills/ai-implementation-planner/SKILL.md`
- `.agents/skills/ai-implementation-plan-executor/SKILL.md`

## Done when

- Every covered template and local copy has exactly one `## Pipeline Contract` section.
- Every covered contract includes all four required subsection headings.
- Local `.agents/skills/` copies match their corresponding templates for the changed contract behavior.
- Downstream templates do not require `docs/product-context-map.md` by default and trust `technical_design.md` for implementation boundaries.
- Executor one-step-at-a-time, user review gate, and approved-step commit behavior remain present.
- No manifest metadata updates are made as part of this story.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T14:49:08-06:00
