# Step: Run MCP List Validation

## Goal

Validate the MCP list command story and confirm the implementation is limited to read-only list behavior.

## Scope

- Run automated validation for this story.
- Optionally run a lightweight manual `sibu mcp list --help` or built CLI check when practical.
- Review changed files for accidental `sibu mcp use/stop`, state mutation, prerequisite/auth checks, live connectivity, or extra MCP server scope.
- Keep fixes within MCP list command routing, handler, and tests.

## Files

- `src/modules/mcp-server-selection-management/list-mcp-servers/command.ts`
- `src/modules/mcp-server-selection-management/list-mcp-servers/handler.ts`
- `src/modules/mcp-server-selection-management/list-mcp-servers/handler.test.ts`
- `src/modules/mcp-server-selection-management/index.ts`
- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/create-program.ts`
- `src/entrypoints/cli/create-program.test.ts`
- `src/entrypoints/cli/execute-command.ts`

## Done when

- `pnpm run build` passes.
- `pnpm test` passes.
- Manual/help check is completed when practical, or skipped with a clear reason.
- No write behavior, `sibu mcp use/stop`, live connectivity checks, credential handling, or non-GitHub MCP server support was added.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:46:01Z
