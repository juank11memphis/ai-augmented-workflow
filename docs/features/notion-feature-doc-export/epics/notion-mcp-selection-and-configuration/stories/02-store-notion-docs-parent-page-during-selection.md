# Store Notion Docs Parent Page During Selection

## Epic
[Notion MCP Selection and Configuration](../epic_brief.md)

## User Story
As a Sibu user selecting Notion MCP, I want to provide a Notion parent page once, so that later feature-doc exports know where Notion pages should be organized.

## Context

The feature brief defines the Notion docs destination as a parent page, not a workspace. The technical design stores that page reference in Sibu state as provider-specific MCP server configuration.

## Scope

- Add an optional `mcpServerConfigs.notion.docsParentPage` state shape.
- Validate the optional Notion config in state reads.
- Add an interactive prompt for a Notion parent page URL or page ID.
- Ask for the Notion parent page during `sibu init` when Notion is selected.
- Ask for the Notion parent page during `sibu mcp use notion`.
- Preserve existing Notion config when unrelated state writes occur.
- Add tests for init and post-init selection storing the configured parent page.

## Out of Scope

- Validating the page against live Notion.
- Selecting Notion workspaces.
- Managing Notion credentials, OAuth, integration permissions, or page sharing.
- Letting users choose different destinations per document.

## Acceptance Criteria

- Given Notion is selected during init, Sibu asks for a Notion docs parent page and stores it in `.sibu/state.json`.
- Given `sibu mcp use notion` selects Notion after init, Sibu asks for a Notion docs parent page and stores it.
- Given a non-Notion MCP server is selected, Sibu does not ask for a Notion parent page.
- State validation accepts a string `mcpServerConfigs.notion.docsParentPage`.
- Malformed Notion MCP config is rejected by state validation.
- Existing selected MCP behavior for GitHub remains unchanged.

## Validation

- `pnpm verify`
- Project adoption tests for Notion selection during init.
- MCP use handler tests for `sibu mcp use notion`.
- Workflow state registry tests for valid and invalid Notion config.
