# Step: Cover MCP Stop Mutation Tests

## Goal

Add tests covering successful stop, not-selected no-op, unknown id, drift-blocked behavior, keep/delete handling, and mixed-purpose config regeneration.

## Scope

- Test successful `handleStopMcpServer({ type: 'mcp:stop', serverId: 'github' })` in a temporary initialized repo with GitHub selected.
- Assert state removes `github` from `selectedMcpServers`.
- Assert Codex config remains managed and no longer contains GitHub MCP config.
- Assert MCP-only `.mcp.json` and `.gemini/settings.json` are marked unmanaged when no MCP servers remain.
- Test keep decision leaves stopped MCP-only files on disk.
- Test delete decision removes stopped MCP-only files when safe.
- Test not-selected no-op does not mutate files/state.
- Test unknown id fails with `sibu mcp list` guidance.
- Test drift/readiness blocks mutation before state/files change.
- Test local-edited stopped files require second confirmation before deletion.

## Files

- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.test.ts`

## Done when

- Tests cover every story acceptance criterion.
- Tests prove arbitrary manual-edit merge behavior is not introduced.
- Tests prove no prerequisite/auth/provider cleanup is attempted.
- Tests prove Windsurf MCP config is not generated or stopped.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T02:01:18Z
