# Step: Wire MCP Stop CLI Routing

## Goal

Expose the stop handler through the CLI as `sibu mcp stop <mcp_server_id>` while preserving existing MCP list/use commands.

## Scope

- Add `StopMcpServerCommand` to `SibuCliCommand` in `src/entrypoints/cli/command.ts`.
- Add `mcp stop <mcp_server_id>` under the existing `mcp` command group in `src/entrypoints/cli/create-program.ts`.
- Dispatch `mcp:stop` in `src/entrypoints/cli/execute-command.ts`.
- Extend CLI command builder tests to verify the `stop` subcommand exists.
- Keep command input named clearly as an MCP server id.

## Files

- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/create-program.ts`
- `src/entrypoints/cli/create-program.test.ts`
- `src/entrypoints/cli/execute-command.ts`
- `src/modules/mcp-server-selection-management/index.ts`

## Done when

- `sibu mcp stop github` routes to command type `mcp:stop` with `serverId: 'github'`.
- Existing `sibu mcp list` and `sibu mcp use` remain available.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T02:01:18Z
