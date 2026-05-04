# Step: Add contracts to technical design and UX templates

## Goal

Add concise pipeline contracts to the technical design and UX templates, including the Product Context to implementation-boundary translation rule and UI-impact-only UX applicability.

## Scope

- Update `technical-design-writer` and `ux-expert` templates with exactly one `## Pipeline Contract` section each.
- Include the four required subsections in each contract: `### What this skill needs`, `### What this skill writes`, `### When this skill stops`, and `### What this skill must not do`.
- Make `technical-design-writer` explicitly responsible for translating selected Product Contexts into implementation boundaries appropriate to the selected architecture.
- Make `ux-expert` explicitly stop when the feature/request has no UI impact.
- Align the matching local `.agents/skills/technical-design-writer/SKILL.md` copy.
- Do not create a local `.agents/skills/ux-expert/` copy unless the selectable skill already exists there.
- Do not update planning or execution templates in this step.
- Do not update `templates/manifest.json`; that belongs to Story 3.

## Files

- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `.agents/skills/technical-design-writer/SKILL.md`

## Done when

- Each covered template and local copy has exactly one `## Pipeline Contract` section.
- Each contract has all four required subsection headings.
- Technical design work requires a feature brief and `docs/product-context-map.md`, writes only `docs/features/<feature-slug>/technical_design.md`, and stops for missing or inconsistent Product Context input.
- Technical design instructions state that the design translates Product Context responsibilities into architecture/module/implementation boundaries for downstream stages.
- UX work requires a feature brief and UI impact, writes only `docs/features/<feature-slug>/ux.md`, and stops instead of inventing UI work when there is no UI impact.
- Covered templates stop and redirect instead of producing artifacts owned by later stages.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T14:34:41-06:00
