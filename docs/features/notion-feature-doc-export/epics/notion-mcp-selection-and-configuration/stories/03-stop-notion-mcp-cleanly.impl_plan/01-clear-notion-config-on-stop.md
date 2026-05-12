# Step: Clear Notion config on stop

## Goal

Update MCP stop state handling so stopping Notion removes both the selected MCP server id and the Notion-specific docs parent page config.

## Scope

- Remove `notion` from `selectedMcpServers` when stopping Notion.
- Remove `mcpServerConfigs.notion` when stopping Notion.
- Preserve other MCP server configs when unrelated servers remain selected.
- Keep not-selected and unknown-id behavior unchanged.
- Do not delete Notion pages, validate Notion access, or modify Notion workspace permissions.

## Files

- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.ts`
- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.test.ts`

## Done when

- Stopping Notion removes `mcpServerConfigs.notion` from the next state.
- Stopping a non-Notion server does not remove Notion config unless Notion is also being stopped.
- Notion not-selected no-op leaves state unchanged.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:50:27Z
