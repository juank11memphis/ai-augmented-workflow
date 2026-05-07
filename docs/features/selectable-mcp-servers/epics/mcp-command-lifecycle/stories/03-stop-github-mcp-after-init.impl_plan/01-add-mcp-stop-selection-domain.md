# Step: Add MCP Stop Selection Domain

## Goal

Add the pure selection behavior for `sibu mcp stop <mcp_server_id>` so the command can validate ids, detect not-selected no-ops, and compute the remaining selected MCP servers.

## Scope

- Add `src/modules/mcp-server-selection-management/stop-mcp-server/command.ts` with command type `mcp:stop` and `serverId` input.
- Add `src/modules/mcp-server-selection-management/stop-mcp-server/handler.ts` with a testable helper such as `getNextStoppedMcpSelection(state, serverId)`.
- Use `resolveSelectableMcpServerById(serverId)` for validation and unknown-id messaging.
- Treat missing `selectedMcpServers` as an empty selected list.
- Return a no-op when GitHub is not selected.
- Export the stop command and handler from `src/modules/mcp-server-selection-management/index.ts`.
- Keep this step pure: no filesystem writes, prompts, rendering, CLI routing, or readiness calls yet.

## Files

- `src/modules/mcp-server-selection-management/stop-mcp-server/command.ts`
- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.ts`
- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.test.ts`
- `src/modules/mcp-server-selection-management/index.ts`

## Done when

- Unknown MCP ids return guidance to run `sibu mcp list`.
- Stopping GitHub when it is not selected returns a no-op message.
- Stopping GitHub when selected computes an empty remaining MCP server list.
- Focused tests cover unknown id, not-selected no-op, and selected stop cases.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T02:01:18Z
