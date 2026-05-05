# Step: Update feature brief Deep Module guidance

## Goal

Revise the feature-brief writer template so feature briefs require `docs/deep-module-map.md`, name existing Deep Modules, and route missing module boundaries back to `deep-module-map-writer`.

## Scope

- Update `templates/skills/feature-brief-writer/SKILL.md` to replace Product Context Map requirements with Deep Module Map requirements.
- Change required input from `docs/product-context-map.md` to `docs/deep-module-map.md`.
- Change feature brief output section from `## Product Context` to `## Deep Module`.
- Require one or more existing Deep Modules from `docs/deep-module-map.md`.
- Stop when a feature needs a new or changed Deep Module and direct the user to `deep-module-map-writer`.
- Update the matching local copy `.agents/skills/feature-brief-writer/SKILL.md`.
- Do not update technical-design, planning, or executor skills in this step.

## Files

- `templates/skills/feature-brief-writer/SKILL.md`
- `.agents/skills/feature-brief-writer/SKILL.md`

## Done when

- Feature brief guidance refers to Deep Module Map and `docs/deep-module-map.md` instead of Product Context Map.
- The recommended feature brief structure includes `## Deep Module`.
- The skill stops instead of inventing new Deep Modules and routes to `deep-module-map-writer`.
- The changed template and local copy no longer contain active Product Context Map terminology.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:46:59-06:00
