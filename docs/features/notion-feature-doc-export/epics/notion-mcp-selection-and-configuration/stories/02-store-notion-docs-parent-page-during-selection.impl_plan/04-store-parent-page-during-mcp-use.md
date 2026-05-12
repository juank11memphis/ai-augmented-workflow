# Step: Store parent page during MCP use

## Goal

Wire Notion parent page collection into `sibu mcp use notion` so post-init Notion selection records the destination page in Sibu state.

## Scope

- Extend MCP use handler dependencies or flow to ask for the Notion parent page when selecting Notion.
- Store `mcpServerConfigs.notion.docsParentPage` alongside selected Notion MCP state.
- Preserve any existing MCP server configs during unrelated MCP use state writes.
- Do not ask for the Notion parent page when selecting GitHub.
- Do not ask when Notion is already selected and the command is a no-op.
- Do not add Notion export behavior or live Notion validation.

## Files

- `src/modules/mcp-server-selection-management/use-mcp-server/handler.ts`
- `src/modules/mcp-server-selection-management/use-mcp-server/handler.test.ts`
- `src/modules/workflow-target-planning/workflow-targets.ts`
- `src/shared/types.ts`

## Done when

- `sibu mcp use notion` stores the prompted parent page in Sibu state.
- `sibu mcp use github` does not prompt for Notion config.
- Running `sibu mcp use notion` when Notion is already selected remains a no-op and does not rewrite state.
- Existing MCP use tests remain green.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:47:52Z
