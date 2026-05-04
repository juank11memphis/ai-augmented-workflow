# Step: Update feature brief Product Context rules

## Goal

Make the feature brief writer require an existing Product Context Map, select only existing Product Contexts, and stop before drafting when the requested feature needs a new context.

## Scope

- Update `templates/skills/feature-brief-writer/SKILL.md` so `docs/product-context-map.md` is required immediately after `docs/product-vision.md`.
- Add a hard-stop path for a missing map that instructs the user to create it with `product-context-map-writer`.
- Add concise selection guidance: feature briefs must identify one or more existing Product Contexts and must not invent new contexts.
- Add a stop-before-drafting path for features that do not fit an existing context, including a suggested prompt for updating `docs/product-context-map.md`.
- Add `## Product Context` to the feature brief output structure and quality checks.
- Do not implement or revise `product-context-map-writer` in this step.

## Files

- `templates/skills/feature-brief-writer/SKILL.md`

## Done when

- Feature brief generation requires both `docs/product-vision.md` and `docs/product-context-map.md` before drafting.
- The skill clearly stops if the Product Context Map is missing and points to `product-context-map-writer`.
- The skill clearly stops if no existing Product Context fits and provides a user-ready map-update prompt.
- The generated feature brief format includes `## Product Context`.
- The updated guidance stays concise and avoids duplicating the full Product Context Map concept.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T15:59:22Z
