# Add Notion MCP Catalog and Config Rendering

## Epic
[Notion MCP Selection and Configuration](../epic_brief.md)

## User Story
As a Sibu user, I want Notion to appear as a selectable MCP server, so that Sibu can configure supported agents for Notion just like other first-class MCP integrations.

## Context

The technical design adds `notion` to the MCP catalog and renders Notion MCP config into the same supported agent files currently used for GitHub MCP: Codex, Claude, and Gemini.

## Scope

- Extend shared MCP server typing to include `notion`.
- Add Notion to `SELECTABLE_MCP_SERVERS` with user-facing guidance that auth and permissions remain user-owned.
- Update MCP target planning so Notion-only selection creates supported-agent MCP config targets.
- Update MCP config rendering so Notion-only and GitHub+Notion selections render deterministic config for Codex, Claude, and Gemini.
- Cover catalog resolution, list display, and rendering behavior with tests.

## Out of Scope

- Prompting for or storing the Notion docs parent page.
- Live Notion MCP authentication or connectivity checks.
- Any Notion document export behavior.

## Acceptance Criteria

- `McpServerId` supports `notion`.
- `sibu mcp list` can show Notion with clear auth/permissions ownership guidance.
- Resolving `notion` succeeds; unknown MCP ids still fail with `sibu mcp list` guidance.
- Selecting only Notion creates expected MCP config targets for supported selected agents.
- Selecting GitHub and Notion renders both MCP servers in the same agent config files.
- Rendered Notion config uses the hosted Notion MCP URL and contains no credentials.
- Existing GitHub MCP rendering behavior remains covered and unchanged except for composition with other MCP servers.

## Validation

- `pnpm verify`
- Focused catalog and workflow-target rendering tests for Notion-only and GitHub+Notion selections.
