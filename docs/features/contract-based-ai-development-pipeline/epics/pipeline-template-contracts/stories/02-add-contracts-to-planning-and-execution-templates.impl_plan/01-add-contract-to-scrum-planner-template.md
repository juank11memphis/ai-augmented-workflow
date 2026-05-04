# Step: Add contract to Scrum planner template

## Goal

Add a concise pipeline contract to the Scrum planner template so it clearly requires approved feature and technical design artifacts, writes only Epic and User Story artifacts, and treats technical design as the implementation-boundary source of truth.

## Scope

- Update `templates/skills/scrum-master-planner/SKILL.md` with exactly one `## Pipeline Contract` section.
- Include the four required subsections: `### What this skill needs`, `### What this skill writes`, `### When this skill stops`, and `### What this skill must not do`.
- Clarify that Scrum planning requires `feature_brief.md` and `technical_design.md`, plus `ux.md` only when the feature has UI impact.
- Clarify that Scrum planning writes only Epic and User Story artifacts under the feature's `epics/` tree.
- Clarify that Scrum planning does not modify prior-stage artifacts and does not reread `docs/product-context-map.md` by default.
- Align `.agents/skills/scrum-master-planner/SKILL.md` with the template.
- Do not update implementation planner, executor, or manifest metadata in this step.

## Files

- `templates/skills/scrum-master-planner/SKILL.md`
- `.agents/skills/scrum-master-planner/SKILL.md`

## Done when

- Both files have exactly one `## Pipeline Contract` section.
- The contract includes all four required subsection headings.
- The contract names `feature_brief.md`, `technical_design.md`, and conditional `ux.md` as required inputs.
- The contract names Epic and User Story output paths under `docs/features/<feature-slug>/epics/`.
- The contract stops for missing or incomplete prior artifacts and redirects to the owning stage.
- The contract states that Scrum planning trusts `technical_design.md` for implementation boundaries and does not reread the Product Context Map by default.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T14:44:12-06:00
