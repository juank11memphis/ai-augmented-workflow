# Add GitHub MCP Catalog and State Support

## Epic

[MCP Server Configuration Foundation](../epic_brief.md)

## User Story

As a Sibu maintainer, I want GitHub MCP represented as a first-class selectable MCP server, so that later workflows can configure it without treating MCP servers as skills.

## Context

The feature adds selectable MCP servers as a parallel category to selectable skills. The first supported server is the official GitHub MCP Server with id `github`; Sibu should configure it only and leave prerequisites/auth to the user.

## Scope

- Add MCP server id/types for the initial `github` server.
- Add a selectable MCP server catalog entry with user-facing name, description, and config-only positioning.
- Add catalog resolution for MCP server ids and unknown-id behavior that points users toward `sibu mcp list`.
- Extend Sibu state validation/persistence to allow an optional selected MCP server list.
- Keep existing state files valid when `selectedMcpServers` is absent.

## Out of Scope

- Rendering agent config files.
- Init prompts or CLI command routing.
- Additional MCP servers.
- Windsurf MCP support.

## Acceptance Criteria

- `github` resolves as a valid selectable MCP server.
- Unknown MCP server ids are rejected with guidance to list available MCP servers.
- Existing state without selected MCP servers remains valid.
- State with `selectedMcpServers: ['github']` is accepted.
- MCP server metadata does not imply Sibu installs prerequisites, creates tokens, or verifies GitHub auth.

## Validation

- Unit tests for MCP catalog resolution and unknown-id failures.
- Unit tests for state validation with missing, valid, and invalid selected MCP server values.
- `pnpm run build`.
