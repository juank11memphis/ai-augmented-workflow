# Step: Update AGENTS Product Context routing

## Goal

Make generated agent instructions route Product Context Map work to `product-context-map-writer` and show the Product Context Map step before feature briefs.

## Scope

- Update `templates/AGENTS.md` skill routing with a concise `product-context-map-writer` route for creating, revising, or clarifying `docs/product-context-map.md` and product responsibility boundaries.
- Update the feature brief routing sentence so feature brief work is framed as coming after Product Context Map work.
- Add or adjust concise pipeline wording so the workflow order includes `product vision -> product context map -> feature brief -> technical design -> optional UX -> epics/stories -> AI implementation plan -> AI executor`.
- Preserve existing optional skill routing placeholder behavior.
- Do not add `docs/product-context-map.md` as a managed template.
- Do not update source code in this step unless AGENTS template rendering requires it.

## Files

- `templates/AGENTS.md`

## Done when

- Agent instructions route Product Context Map creation/update requests to `product-context-map-writer`.
- Agent instructions route feature brief work after Product Context Map work.
- The pipeline order includes Product Context Map between product vision and feature brief.
- New routing language is concise and preserves context budget.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:45:59Z
