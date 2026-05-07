# List Selectable MCP Servers

## Epic

[MCP Command Lifecycle](../epic_brief.md)

## User Story

As a Sibu user, I want to list available MCP servers and see which ones are selected, so that I can understand my current MCP workflow configuration.

## Context

The MVP includes one selectable MCP server, GitHub, but the command should establish the command group and selected-state presentation for future MCP servers.

## Scope

- Add CLI routing for `sibu mcp list`.
- Implement list behavior in MCP Server Selection Management.
- Read selected MCP server state from `.sibu/state.json`.
- Show GitHub metadata and selected/unselected status.
- Keep output clear that Sibu configures MCP only and does not install or authenticate providers.

## Out of Scope

- Adding, stopping, or repairing MCP selections.
- Live MCP server availability checks.
- Additional MCP servers.

## Acceptance Criteria

- `sibu mcp list` shows the GitHub MCP server with id `github`.
- The command indicates whether GitHub is currently selected.
- The command handles missing optional `selectedMcpServers` state as no MCP servers selected.
- The command does not mutate files or state.

## Validation

- Unit tests for list output with no selected MCP servers and with GitHub selected.
- CLI routing tests for `sibu mcp list`.
- `pnpm run build`.
