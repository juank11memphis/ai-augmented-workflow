# Render Managed MCP Config Targets for Supported Agents

## Epic

[MCP Server Configuration Foundation](../epic_brief.md)

## User Story

As a Sibu user, I want selected MCP servers rendered into the right agent config files, so that my supported agents receive consistent GitHub MCP configuration from Sibu-managed templates.

## Context

The technical design limits MVP agent support to Codex, Claude, and Gemini. Generated MCP config files are fully Sibu-managed while managed, and the GitHub MCP entry should use user-owned environment/auth setup without storing credentials.

## Scope

- Resolve selected MCP servers into Codex, Claude, and Gemini MCP config targets.
- Update or add templates for the supported agent config files.
- Register new or changed MCP templates in the template manifest with user-facing sync notes.
- Render deterministic JSON/TOML output for the GitHub MCP server launch shape.
- Preserve non-MCP agent support content where a config file also serves existing Sibu purposes.

## Out of Scope

- Windsurf MCP config.
- Custom MCP server definitions.
- Live MCP connectivity checks.
- Credential creation, storage, or validation.
- Post-init `sibu mcp use/stop` behavior.

## Acceptance Criteria

- Selected GitHub MCP produces expected managed targets for Codex, Claude, and Gemini.
- Generated config references the official GitHub MCP server launch command without embedding real credentials.
- Existing non-MCP managed content, such as Codex agent support config, remains intact.
- Template manifest metadata is updated for every new or changed managed template.
- Rendering output is stable across repeated runs for the same selection.

## Validation

- Unit or snapshot tests for rendered Codex, Claude, and Gemini MCP config.
- Template manifest validation for new/changed templates.
- `pnpm run build`.
- `pnpm run validate:packed-runtime`.
