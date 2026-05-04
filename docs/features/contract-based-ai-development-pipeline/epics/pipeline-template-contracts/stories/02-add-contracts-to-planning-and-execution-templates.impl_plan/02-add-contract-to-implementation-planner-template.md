# Step: Add contract to implementation planner template

## Goal

Add a concise pipeline contract to the AI implementation planner template so it requires exactly one User Story and approved upstream artifacts, writes only story-local step files, and trusts technical design for implementation boundaries.

## Scope

- Update `templates/skills/ai-implementation-planner/SKILL.md` with exactly one `## Pipeline Contract` section.
- Include the four required subsections: `### What this skill needs`, `### What this skill writes`, `### When this skill stops`, and `### What this skill must not do`.
- Clarify that implementation planning requires exactly one story, its Epic brief, feature brief, technical design, relevant repo files, and conditional `ux.md`.
- Clarify that implementation planning writes only story-local `.impl_plan/*.md` files.
- Clarify that implementation planning does not modify prior-stage artifacts and does not reread `docs/product-context-map.md` by default.
- Align `.agents/skills/ai-implementation-planner/SKILL.md` with the template.
- Do not update Scrum planner, executor, or manifest metadata in this step.

## Files

- `templates/skills/ai-implementation-planner/SKILL.md`
- `.agents/skills/ai-implementation-planner/SKILL.md`

## Done when

- Both files have exactly one `## Pipeline Contract` section.
- The contract includes all four required subsection headings.
- The contract requires exactly one User Story file and the upstream artifacts from the technical design.
- The contract names the story-local `.impl_plan/*.md` output path pattern.
- The contract stops for vague requests, missing stories, missing source context, incomplete prior artifacts, or requests to write code.
- The contract states that implementation planning trusts `technical_design.md` for implementation boundaries and does not reread the Product Context Map by default.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T14:45:02-06:00
