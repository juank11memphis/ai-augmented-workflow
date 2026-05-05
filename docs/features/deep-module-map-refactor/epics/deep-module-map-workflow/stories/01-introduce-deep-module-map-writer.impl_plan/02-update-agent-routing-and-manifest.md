# Step: Update agent routing and template manifest

## Goal

Wire the new Deep Module Map stage into Sibu's managed template routing and manifest metadata so the workflow treats it as a new required skill.

## Scope

- Update `templates/AGENTS.md` pipeline order to `product vision -> deep module map -> feature brief -> technical design -> optional UX -> epics/stories -> AI implementation plan -> AI executor`.
- Route Deep Module Map, module boundary, suggested implementation module, and `docs/deep-module-map.md` requests to `deep-module-map-writer`.
- Update feature brief routing language so feature briefs come after Deep Module Map work.
- Update `templates/manifest.json` by bumping the global template version.
- Remove the `skills/product-context-map-writer/SKILL.md` manifest entry entirely.
- Add `skills/deep-module-map-writer/SKILL.md` as a brand-new managed skill entry.
- Bump changed template versions and replace their `changes` entries with current-version user-facing notes.
- Do not add compatibility notes or migration support for Product Context Map.

## Files

- `templates/AGENTS.md`
- `templates/manifest.json`
- `templates/skills/deep-module-map-writer/SKILL.md`
- `templates/skills/product-context-map-writer/SKILL.md`

## Done when

- `templates/AGENTS.md` routes Deep Module Map work to `deep-module-map-writer`.
- `templates/manifest.json` includes `skills/deep-module-map-writer/SKILL.md` and no `skills/product-context-map-writer/SKILL.md` entry.
- Manifest versions are bumped for the changed templates and the global template set.
- Manifest change notes introduce Deep Module Map guidance without promising backwards compatibility.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:18:17-06:00
