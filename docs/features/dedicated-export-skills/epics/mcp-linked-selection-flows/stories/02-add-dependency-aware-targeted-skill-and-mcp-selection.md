# Add Dependency-Aware Targeted Skill and MCP Selection

## Epic
[MCP-Linked Selection Flows](../epic_brief.md)

## User Story
As a Sibu user changing an existing workflow, I want targeted MCP and exporter skill commands to add their matching dependency together, so that the workflow stays complete and usable.

## Context

The technical design requires `sibu mcp use github/notion` to add the matching exporter skill and direct `sibu skills use export-to-github/export-to-notion` to add the required MCP server with explicit messaging.

## Scope

- Update `sibu mcp use github` and `sibu mcp use notion` planning to include the matching exporter skill when missing.
- Update direct `sibu skills use export-to-github` and `sibu skills use export-to-notion` to include the required MCP server when missing.
- Ask for Notion docs parent page when a targeted command causes Notion MCP to become selected.
- Refresh affected MCP config files, exporter skill files, `AGENTS.md`, and `.sibu/state.json` as one guarded mutation.
- Replace any single-new-target assumptions in targeted skill application where dependency-backed plans need multiple affected targets.
- Preserve existing workflow mutation readiness and local-edit protections.
- Add tests for dependency messaging, affected file writes, state updates, and preflight blockers.

## Out of Scope

- Init companion UX.
- Sync adoption for already-selected MCP servers.
- Provider authentication validation.
- External export execution.

## Acceptance Criteria

- `sibu mcp use notion` adds Notion MCP config and `export-to-notion` when the skill is missing.
- `sibu mcp use github` adds GitHub MCP config and `export-to-github` when the skill is missing.
- `sibu skills use export-to-notion` tells the user Notion MCP is required and adds Notion MCP configuration when missing.
- `sibu skills use export-to-github` tells the user GitHub MCP is required and adds GitHub MCP configuration when missing.
- `AGENTS.md` routing is refreshed when workflow skills change.
- Targeted commands refuse to proceed when affected files are missing, unrecorded, or locally modified in ways that require `sibu sync`.

## Validation

- Run targeted tests for `skill-selection-management/use-skill`.
- Run targeted tests for `mcp-server-selection-management/use-mcp-server`.
- Run workflow mutation readiness tests affected by the new plan shape.
- Run `pnpm run test`.
