# Step: Cover Notion-only stop flow

## Goal

Add tests proving Notion-only stop behavior follows existing MCP stop semantics and unmanages MCP-only config files when no MCP servers remain.

## Scope

- Create a Notion-only initialized repo fixture using existing MCP use behavior.
- Stop Notion through `stopSelectedMcpServer` or the handler where practical.
- Assert selected MCP servers are empty.
- Assert Notion config is removed from state.
- Assert Codex config remains managed and no longer contains Notion.
- Assert Claude/Gemini MCP-only config files are marked unmanaged when no MCP servers remain.

## Files

- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.test.ts`

## Done when

- Notion-only stop flow is covered by tests.
- Existing GitHub-only stop tests still pass.
- The test proves no Notion credential, parent page, or hosted URL remains in regenerated Codex config after stop.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:50:27Z
