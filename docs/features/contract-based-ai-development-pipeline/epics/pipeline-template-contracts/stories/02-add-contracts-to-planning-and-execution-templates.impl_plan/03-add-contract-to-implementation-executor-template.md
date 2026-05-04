# Step: Add contract to implementation executor template

## Goal

Add a concise pipeline contract to the AI implementation plan executor template while preserving its one-step-at-a-time execution model, user review gate, and approved-step commit behavior.

## Scope

- Update `templates/skills/ai-implementation-plan-executor/SKILL.md` with exactly one `## Pipeline Contract` section.
- Include the four required subsections: `### What this skill needs`, `### What this skill writes`, `### When this skill stops`, and `### What this skill must not do`.
- Clarify that execution requires exactly one story or `.impl_plan/`, ordered step files, upstream source artifacts, technical design, relevant repo files, and conditional `ux.md`.
- Clarify that execution writes only code/docs changes required by the current step plus step approval metadata when approved.
- Clarify that execution does not modify prior-stage artifacts and does not reread `docs/product-context-map.md` by default.
- Preserve the existing one-step-at-a-time execution model and reviewed-step behavior.
- Align `.agents/skills/ai-implementation-plan-executor/SKILL.md` with the template.
- Do not update Scrum planner, implementation planner, or manifest metadata in this step.

## Files

- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `.agents/skills/ai-implementation-plan-executor/SKILL.md`

## Done when

- Both files have exactly one `## Pipeline Contract` section.
- The contract includes all four required subsection headings.
- The contract requires exactly one story or implementation plan folder and ordered step files.
- The contract names current-step implementation changes and approval metadata as owned outputs.
- The contract stops for missing or invalid implementation plans, missing source context, incomplete prior artifacts, or requests to create plans instead of execute them.
- The contract states that execution trusts `technical_design.md` for implementation boundaries and does not reread the Product Context Map by default.
- Existing user review gate and approved-step commit behavior remain present.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T14:48:06-06:00
