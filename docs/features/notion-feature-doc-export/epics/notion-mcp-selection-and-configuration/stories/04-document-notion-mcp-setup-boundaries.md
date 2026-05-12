# Document Notion MCP Setup Boundaries

## Epic
[Notion MCP Selection and Configuration](../epic_brief.md)

## User Story
As a Sibu user configuring Notion MCP, I want README guidance that clearly states what Sibu does and does not handle, so that I can complete Notion setup without expecting Sibu to manage credentials, workspace access, or permissions.

## Context

The feature brief explicitly requires user-facing README documentation for Notion MCP setup boundaries. The technical design says README guidance should be concise, provider-safe, and link to Notion MCP docs instead of copying volatile provider instructions.

## Scope

- Update `README.md` MCP setup documentation to include Notion.
- Explain that Notion is selectable during `sibu init` and with `sibu mcp use notion`.
- Explain that Sibu stores a Notion docs destination parent page in `.sibu/state.json`.
- Explain that Sibu does not manage Notion OAuth login, workspace selection, integration installation, page permissions, credentials, or live connectivity.
- Explain that local Markdown remains canonical and Notion is optional export only.
- Link to Notion MCP setup docs.

## Out of Scope

- Full Notion provider setup walkthroughs.
- Agent-specific troubleshooting beyond concise examples or pointers.
- Documentation for Notion databases or bidirectional sync.

## Acceptance Criteria

- README documents Notion MCP selection and parent page configuration.
- README clearly lists Notion setup responsibilities Sibu does not own.
- README states the Notion MCP connection must be authenticated and able to access the configured parent page.
- README states feature docs are still written locally first and Notion export is optional.
- README links to Notion MCP documentation.

## Validation

- Manual README review for clarity and alignment with the feature brief.
- `pnpm verify`
