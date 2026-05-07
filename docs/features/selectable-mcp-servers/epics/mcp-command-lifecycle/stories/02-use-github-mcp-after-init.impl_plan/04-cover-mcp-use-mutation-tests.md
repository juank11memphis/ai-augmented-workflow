# Step: Cover MCP Use Mutation Tests

## Goal

Add end-to-end handler tests for successful GitHub MCP use, duplicate no-op, unknown id, and drift-blocked behavior.

## Scope

- Test successful `handleUseMcpServer({ type: 'mcp:use', serverId: 'github' })` in a temporary initialized repo.
- Assert generated MCP config files exist for supported selected agents and contain the official GitHub MCP server launch config without real credentials.
- Assert `.sibu/state.json` includes `selectedMcpServers: ['github']` and managed-file hashes for affected MCP config files.
- Test duplicate use reports no-op and does not rewrite state/files unnecessarily.
- Test unknown MCP id fails with `sibu mcp list` guidance.
- Test readiness/drift blocks mutation before files/state change.
- Test unrecorded existing MCP target files block mutation rather than being overwritten.

## Files

- `src/modules/mcp-server-selection-management/use-mcp-server/handler.test.ts`

## Done when

- Tests cover every story acceptance criterion.
- Tests prove no live connectivity, prerequisite, or credential behavior is attempted.
- Tests prove Windsurf MCP config is not generated.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:53:27Z
