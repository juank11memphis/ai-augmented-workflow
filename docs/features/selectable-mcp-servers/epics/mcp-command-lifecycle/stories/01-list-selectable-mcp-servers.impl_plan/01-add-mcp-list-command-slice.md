# Step: Add MCP List Command Slice

## Goal

Create the first MCP Server Selection Management command slice for listing selectable MCP servers without mutating workflow files or state.

## Scope

- Add `src/modules/mcp-server-selection-management/list-mcp-servers/command.ts` with `ListMcpServersCommand` using command type `mcp:list`.
- Add `src/modules/mcp-server-selection-management/list-mcp-servers/handler.ts`.
- Add `src/modules/mcp-server-selection-management/index.ts` exports for the list command and handler.
- Read `.sibu/state.json` with existing state registry behavior.
- If state is missing/invalid, show available MCP servers with no selected state and guidance to run `sibu init` first.
- Do not mutate files or state.
- Do not add `sibu mcp use` or `sibu mcp stop` behavior in this story.

## Files

- `src/modules/mcp-server-selection-management/list-mcp-servers/command.ts`
- `src/modules/mcp-server-selection-management/list-mcp-servers/handler.ts`
- `src/modules/mcp-server-selection-management/index.ts`

## Done when

- The handler lists selectable MCP servers from `SELECTABLE_MCP_SERVERS`.
- Missing optional `selectedMcpServers` state is treated as no MCP servers selected.
- The output marks GitHub selected when `selectedMcpServers` contains `github`.
- The handler has no write operations and no prerequisite/auth/live checks.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:46:01Z
