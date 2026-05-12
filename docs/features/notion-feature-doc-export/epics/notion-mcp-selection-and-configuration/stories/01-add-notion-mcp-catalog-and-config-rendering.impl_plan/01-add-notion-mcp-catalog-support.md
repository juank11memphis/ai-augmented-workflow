# Step: Add Notion MCP catalog support

## Goal

Add Notion as a first-class selectable MCP server in shared types, catalog resolution, and MCP list behavior without adding parent-page state or live Notion checks in this story.

## Scope

- Extend the shared MCP server id type to include `notion`.
- Add a Notion entry to the selectable MCP server catalog with concise user-owned auth/permissions guidance.
- Keep GitHub catalog behavior unchanged.
- Update catalog and MCP list tests to expect both GitHub and Notion.
- Do not add Notion docs parent page prompting or state config in this step.
- Do not perform live Notion authentication, OAuth, permissions, or connectivity checks.

## Files

- `src/shared/types.ts`
- `src/modules/workflow-target-planning/catalog.ts`
- `src/modules/workflow-target-planning/catalog.test.ts`
- `src/modules/mcp-server-selection-management/list-mcp-servers/handler.test.ts`

## Done when

- `McpServerId` supports `notion`.
- `resolveSelectableMcpServerById('notion')` succeeds with the Notion catalog entry.
- Unknown MCP ids still return guidance to run `sibu mcp list`.
- MCP list item tests cover GitHub and Notion, including selected-state behavior for Notion.
- Notion catalog/list descriptions clearly state that credentials, OAuth/authentication, workspace/page access, and permissions remain user-owned.
- Focused catalog and MCP list tests pass.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:41:02Z
