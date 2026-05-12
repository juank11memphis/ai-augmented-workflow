# Stop Notion MCP Cleanly

## Epic
[Notion MCP Selection and Configuration](../epic_brief.md)

## User Story
As a Sibu user, I want `sibu mcp stop notion` to remove Notion configuration safely, so that Sibu stops managing Notion without disrupting other selected MCP servers.

## Context

Stopping MCP servers already updates selected MCP state and rewrites or unmanages MCP config files. Notion adds provider-specific parent page state that must be removed when Notion is stopped.

## Scope

- Update stop behavior so `sibu mcp stop notion` removes `notion` from selected MCP servers.
- Remove `mcpServerConfigs.notion` from state when Notion is stopped.
- Rewrite supported-agent MCP config files without Notion when GitHub remains selected.
- Preserve existing unmanaged-file behavior when no selected MCP servers remain.
- Add tests for Notion-only and GitHub+Notion stop flows.

## Out of Scope

- Deleting Notion pages or changing Notion workspace permissions.
- Cleaning up exported Notion documents.
- Stopping unrelated MCP servers.

## Acceptance Criteria

- Given Notion is selected, `sibu mcp stop notion` removes Notion from `selectedMcpServers`.
- Given Notion config exists in state, stopping Notion removes `mcpServerConfigs.notion`.
- Given GitHub remains selected, generated MCP config files still contain GitHub and no longer contain Notion.
- Given no MCP servers remain, MCP-only config files follow the existing stop/unmanage behavior.
- Given Notion is not selected, `sibu mcp stop notion` reports a no-op and changes no files.

## Validation

- `pnpm verify`
- MCP stop handler tests for Notion-only, GitHub+Notion, and not-selected no-op cases.
