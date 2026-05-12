# Step: Cover GitHub plus Notion stop flow

## Goal

Add tests proving stopping Notion from a GitHub+Notion selection preserves GitHub config and removes only Notion-specific config.

## Scope

- Create an initialized repo with both GitHub and Notion selected.
- Stop Notion.
- Assert GitHub remains selected.
- Assert Notion parent page state is removed.
- Assert generated Codex, Claude, and Gemini config files still contain GitHub and no longer contain Notion.
- Preserve existing stop behavior for GitHub when it is the stopped server.

## Files

- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.test.ts`

## Done when

- GitHub+Notion stop flow is covered by tests.
- Stopping Notion does not unmanage MCP-only config files while GitHub remains selected.
- Rendered files after stop contain GitHub MCP URL and do not contain Notion MCP URL.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:50:27Z
