# Step: Add MCP Use Selection Domain

## Goal

Add the pure selection behavior for `sibu mcp use <mcp_server_id>` so the command can validate ids, detect duplicate selections, and compute the next selected MCP server list.

## Scope

- Add `src/modules/mcp-server-selection-management/use-mcp-server/command.ts` with command type `mcp:use` and `serverId` input.
- Add `src/modules/mcp-server-selection-management/use-mcp-server/handler.ts` with a testable selection helper such as `getNextMcpSelection(state, serverId)`.
- Use `resolveSelectableMcpServerById(serverId)` for validation and unknown-id messaging.
- Treat existing `selectedMcpServers` absence as an empty selected list.
- Return a no-op result when GitHub is already selected.
- Keep this step pure: no filesystem writes, rendering, CLI routing, or mutation readiness calls yet.

## Files

- `src/modules/mcp-server-selection-management/use-mcp-server/command.ts`
- `src/modules/mcp-server-selection-management/use-mcp-server/handler.ts`
- `src/modules/mcp-server-selection-management/use-mcp-server/handler.test.ts`
- `src/modules/mcp-server-selection-management/index.ts`

## Done when

- Unknown MCP ids return guidance to run `sibu mcp list`.
- GitHub can be added to an empty or missing selected MCP server state.
- Selecting GitHub again returns a no-op message.
- Focused tests cover unknown id, selected, and duplicate no-op cases.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:53:27Z
