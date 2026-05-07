# Step: Wire MCP Use CLI Routing

## Goal

Expose the mutation handler through the CLI as `sibu mcp use <mcp_server_id>` while preserving the existing MCP list command.

## Scope

- Add `UseMcpServerCommand` to `SibuCliCommand` in `src/entrypoints/cli/command.ts`.
- Add `mcp use <mcp_server_id>` under the existing `mcp` command group in `src/entrypoints/cli/create-program.ts`.
- Dispatch `mcp:use` in `src/entrypoints/cli/execute-command.ts`.
- Extend CLI command builder tests to verify the `use` subcommand exists.
- Do not wire `mcp stop` in this story.

## Files

- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/create-program.ts`
- `src/entrypoints/cli/create-program.test.ts`
- `src/entrypoints/cli/execute-command.ts`
- `src/modules/mcp-server-selection-management/index.ts`

## Done when

- `sibu mcp use github` routes to command type `mcp:use` with `serverId: 'github'`.
- Existing `sibu mcp list` remains available.
- No `sibu mcp stop` routing is added.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:53:27Z
