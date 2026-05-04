# Step: Update implementation planner context preservation

## Goal

Make the AI implementation planner treat Product Context guidance from the feature brief and technical design as required planning context and preserve those boundaries in generated step files.

## Scope

- Update `templates/skills/ai-implementation-planner/SKILL.md` to read and apply Product Context guidance when present in the feature brief and technical design.
- Add concise guidance that Product Contexts answer “where does this work belong?” and implementation steps must keep work inside approved contexts unless cross-context work is explicit.
- Require generated step files to call out cross-context work, ownership, and stop-and-ask conditions when a step would move work into an unrelated or unapproved context.
- Add quality-check coverage so implementation plans preserve Product Context boundaries without duplicating the full Product Context Map concept.
- Do not update executor behavior in this step.

## Files

- `templates/skills/ai-implementation-planner/SKILL.md`

## Done when

- Planner instructions require reading and applying Product Context guidance when present.
- Generated step guidance keeps work inside approved Product Contexts unless cross-context work is explicit.
- Step-file quality checks include context-boundary preservation.
- Added guidance is concise and non-duplicative.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:29:56Z
