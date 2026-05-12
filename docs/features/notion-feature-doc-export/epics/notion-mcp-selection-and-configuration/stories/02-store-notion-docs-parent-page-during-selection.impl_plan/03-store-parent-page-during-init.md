# Step: Store parent page during init

## Goal

Wire Notion parent page collection into `sibu init` so first-time Notion selection records the destination page in Sibu state.

## Scope

- Extend project adoption dependencies to include the Notion parent page prompt.
- After MCP server selection, ask for the Notion parent page only when Notion is selected.
- Pass the resulting provider config into `writeSibuState`.
- Update `writeSibuState` to accept and preserve `mcpServerConfigs` while writing state.
- Do not ask for the Notion parent page when only GitHub or no MCP server is selected.
- Do not validate the parent page against live Notion.

## Files

- `src/modules/project-adoption/handler.ts`
- `src/modules/project-adoption/handler.test.ts`
- `src/modules/workflow-target-planning/workflow-targets.ts`
- `src/shared/types.ts`

## Done when

- Init with Notion selected stores `mcpServerConfigs.notion.docsParentPage` in `.sibu/state.json`.
- Init with only GitHub selected does not prompt for or store Notion config.
- Init with no MCP servers selected remains unchanged.
- Existing init tests for GitHub and baseline behavior still pass.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:47:52Z
