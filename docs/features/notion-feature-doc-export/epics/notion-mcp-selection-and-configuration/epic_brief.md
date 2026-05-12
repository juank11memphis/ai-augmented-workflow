# Notion MCP Selection and Configuration Epic Brief

## Summary

Deliver first-class Notion MCP selection in Sibu's existing MCP lifecycle. Users can select Notion during init or after init, provide one Notion docs destination parent page, and get deterministic agent MCP config without Sibu owning Notion auth, workspace access, credentials, permissions, or live connectivity.

## Source Context

- Feature brief: `../../feature_brief.md`
- Technical design: `../../technical_design.md`

## Scope

- Add Notion to the selectable MCP catalog and shared MCP server type.
- Render Notion MCP config for supported agents alongside existing GitHub MCP config.
- Prompt for and persist the Notion docs parent page during init and `sibu mcp use notion`.
- Clear Notion-specific state when `sibu mcp stop notion` runs.
- Validate state, doctor/sync behavior, and README user guidance for Notion MCP setup boundaries.

## Out of Scope

- Live Notion MCP authentication or connectivity checks.
- Managing Notion OAuth, workspace selection, integration installation, credentials, or page permissions.
- Implementing Notion document export behavior inside the Sibu CLI runtime.
- Notion database schemas or arbitrary Notion workspace management.

## User Stories

- [Add Notion MCP catalog and config rendering](./stories/01-add-notion-mcp-catalog-and-config-rendering.md)
- [Store Notion docs parent page during MCP selection](./stories/02-store-notion-docs-parent-page-during-selection.md)
- [Stop Notion MCP cleanly](./stories/03-stop-notion-mcp-cleanly.md)
- [Document Notion MCP setup boundaries](./stories/04-document-notion-mcp-setup-boundaries.md)

## Acceptance Criteria

- Notion appears in MCP selection and list flows with user-owned auth guidance.
- Selecting Notion produces deterministic supported-agent MCP config without credentials.
- Sibu state records the selected Notion MCP server and configured docs parent page.
- Stopping Notion removes Notion-specific state and rewrites or unmanages MCP config files according to remaining selected MCP servers.
- README explains what Sibu configures and what Notion setup remains user-owned.

## Dependencies / Risks

- Notion MCP hosted config and agent login behavior can change; implementation should keep docs concise and link to Notion's setup documentation.
- The state shape should stay provider-specific enough for Notion's parent page while remaining extensible for future MCP server settings.
