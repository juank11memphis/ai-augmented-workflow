# Step: Render MCP Files During Sync Actions

## Goal

Make sync apply/update and side-template actions render MCP config files correctly instead of treating them as plain static templates.

## Scope

- Update sync rendering paths to provide selected MCP servers to the template rendering layer when applying updates or writing side templates.
- If `renderTemplateForSync()` is the sync rendering boundary, extend it to accept selected MCP servers and render MCP config templates when appropriate.
- Preserve existing AGENTS.md skill-routing rendering behavior.
- Ensure MCP config rendering remains deterministic and contains no real credentials.
- Do not add arbitrary custom MCP server support.

## Files

- `src/modules/template-catalog-rendering/templates.ts`
- `src/modules/template-catalog-rendering/index.ts`
- `src/modules/sync-review/apply-action.ts`
- `src/modules/sync-review/sync-preview.ts`
- `src/modules/sync-review/sync-preview.test.ts`

## Done when

- Sync apply/update paths can render selected GitHub MCP config content for MCP-managed files.
- Side-template rendering also produces selected GitHub MCP config content for MCP-managed files.
- Existing AGENTS.md and skill template rendering remains unchanged.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:36:49Z
