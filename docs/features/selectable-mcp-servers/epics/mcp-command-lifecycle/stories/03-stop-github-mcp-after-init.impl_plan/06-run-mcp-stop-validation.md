# Step: Run MCP Stop Validation

## Goal

Validate the MCP stop command story and confirm the implementation remains inside the approved GitHub MCP lifecycle scope.

## Scope

- Run automated validation for the story.
- Run packed runtime validation because this completes the CLI command group.
- Optionally run `node ./bin/sibu.js mcp stop --help` after build.
- Review changed files for live connectivity checks, credential/provider cleanup, arbitrary custom MCP server support, Windsurf MCP support, or special manual-edit merge behavior.
- Keep fixes inside the MCP stop command lifecycle story.

## Files

- `src/modules/mcp-server-selection-management/stop-mcp-server/command.ts`
- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.ts`
- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.test.ts`
- `src/modules/mcp-server-selection-management/index.ts`
- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/create-program.ts`
- `src/entrypoints/cli/create-program.test.ts`
- `src/entrypoints/cli/execute-command.ts`

## Done when

- `pnpm run build` passes.
- `pnpm test` passes.
- `pnpm run validate:packed-runtime` passes.
- CLI help check passes when practical.
- No live connectivity checks, credential/provider cleanup, arbitrary custom MCP server support, Windsurf MCP support, or special manual-edit merge behavior was added.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T02:01:18Z
