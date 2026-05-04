# Step: Add contracts to product artifact templates

## Goal

Add concise pipeline contracts to the product vision, Product Context Map, and feature brief writer templates so each upstream product stage declares its required inputs, owned output, stop behavior, and downstream boundaries.

## Scope

- Update `product-vision-writer`, `product-context-map-writer`, and `feature-brief-writer` templates with exactly one `## Pipeline Contract` section each.
- Include the four required subsections in each contract: `### What this skill needs`, `### What this skill writes`, `### When this skill stops`, and `### What this skill must not do`.
- Revise existing interview/final-response rules only where they conflict with the feature brief's contract behavior.
- Align matching local `.agents/skills/` copies with the same content changes.
- Do not update technical design or UX templates in this step.
- Do not update `templates/manifest.json`; that belongs to Story 3.

## Files

- `templates/skills/product-vision-writer/SKILL.md`
- `templates/skills/product-context-map-writer/SKILL.md`
- `templates/skills/feature-brief-writer/SKILL.md`
- `.agents/skills/product-vision-writer/SKILL.md`
- `.agents/skills/product-context-map-writer/SKILL.md`
- `.agents/skills/feature-brief-writer/SKILL.md`

## Done when

- Each covered template and local copy has exactly one `## Pipeline Contract` section.
- Each contract has all four required subsection headings.
- Product vision work writes only `docs/product-vision.md` and does not require upstream artifacts.
- Product Context Map work requires `docs/product-vision.md` and writes only `docs/product-context-map.md`.
- Feature brief work requires `docs/product-vision.md` and `docs/product-context-map.md` and writes only `docs/features/<feature-slug>/feature_brief.md`.
- The feature brief template no longer requires a final confirmation summary before writing when enough current-stage information has been gathered.
- Covered templates stop and redirect instead of producing artifacts owned by later stages.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T14:33:00-06:00
