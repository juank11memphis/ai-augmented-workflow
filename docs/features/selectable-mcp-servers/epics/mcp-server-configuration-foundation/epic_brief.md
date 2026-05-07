# MCP Server Configuration Foundation Epic Brief

## Summary

Deliver the foundation that lets Sibu understand selectable MCP servers and render GitHub MCP configuration for supported agents during project adoption. This makes MCP selection a first-class workflow option without expanding Sibu into prerequisite installation, credential management, or live connectivity checks.

## Source Context

- Feature brief: `../../feature_brief.md`
- Technical design: `../../technical_design.md`

## Scope

- Add GitHub as the first selectable MCP server with id `github`.
- Record selected MCP servers in Sibu state.
- Resolve selected MCP servers into Codex, Claude, and Gemini managed config targets.
- Render deterministic MCP config files/templates without storing secrets.
- Offer MCP server selection during `sibu init` and persist managed-file hashes.
- Ensure doctor/sync include MCP-managed files through existing target and drift mechanisms.

## Out of Scope

- `sibu mcp list/use/stop` post-init lifecycle commands.
- Windsurf MCP support.
- Installing Docker, MCP servers, GitHub CLI, or other prerequisites.
- Creating, storing, or validating credentials or provider authentication.
- Testing live GitHub MCP connectivity.

## User Stories

- [Add GitHub MCP catalog and state support](./stories/01-add-github-mcp-catalog-and-state.md)
- [Render managed MCP config targets for supported agents](./stories/02-render-managed-mcp-config-targets.md)
- [Select MCP servers during init](./stories/03-select-mcp-servers-during-init.md)
- [Include MCP-managed files in health and sync checks](./stories/04-include-mcp-managed-files-in-health-and-sync.md)

## Acceptance Criteria

- GitHub appears as a selectable MCP server with id `github` and clear config-only copy.
- Sibu state can represent selected MCP servers while remaining backward compatible with existing state files.
- Selecting GitHub produces managed MCP config for Codex, Claude, and Gemini only.
- Generated MCP config contains no real credentials and relies on user-owned environment/auth setup.
- `sibu init`, `sibu doctor`, and `sibu sync` treat MCP-managed files consistently with other managed workflow files.

## Dependencies / Risks

- This Epic should land before post-init `sibu mcp use/stop`, because lifecycle commands depend on MCP catalog, state, target planning, and rendering.
- Agent MCP config formats differ; rendering should stay isolated and covered by focused tests.
