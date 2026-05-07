# Step: Run MCP Use Validation

## Goal

Validate the MCP use command story and confirm the implementation remains inside the approved post-init GitHub MCP selection scope.

## Scope

- Run automated validation for the story.
- Run packed runtime validation because this adds a CLI command path.
- Optionally run `node ./bin/sibu.js mcp use --help` after build.
- Review changed files for accidental `sibu mcp stop`, live connectivity checks, credential handling, arbitrary custom MCP server support, or Windsurf MCP support.
- Keep fixes inside the MCP use command lifecycle story.

## Files

- `src/modules/mcp-server-selection-management/use-mcp-server/command.ts`
- `src/modules/mcp-server-selection-management/use-mcp-server/handler.ts`
- `src/modules/mcp-server-selection-management/use-mcp-server/handler.test.ts`
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
- No `sibu mcp stop`, live connectivity checks, credential handling, arbitrary custom MCP server support, or Windsurf MCP support was added.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:53:27Z
