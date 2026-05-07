# MCP Command Lifecycle Epic Brief

## Summary

Deliver the post-init `sibu mcp` command group so users can inspect, add, and stop selected MCP servers after adoption. The lifecycle must reuse Sibu's clean-workflow protections and managed-file behavior so MCP changes remain safe and predictable.

## Source Context

- Feature brief: `../../feature_brief.md`
- Technical design: `../../technical_design.md`

## Scope

- Add `sibu mcp list`, `sibu mcp use <mcp_server_id>`, and `sibu mcp stop <mcp_server_id>` command routing.
- Implement MCP lifecycle orchestration in the MCP Server Selection Management module.
- Reuse Workflow Mutation Readiness to block targeted MCP mutations when workflow drift needs sync review.
- Add, regenerate, unmanage, keep, or delete MCP-managed config files according to selected MCP server state.
- Provide user-facing output for selected state, no-ops, unknown ids, and config-only boundaries.

## Out of Scope

- Initial MCP selection during `sibu init`.
- Adding MCP servers beyond GitHub.
- Windsurf MCP support.
- Installing prerequisites, creating credentials, or testing live connectivity.

## User Stories

- [List selectable MCP servers](./stories/01-list-selectable-mcp-servers.md)
- [Use GitHub MCP after init](./stories/02-use-github-mcp-after-init.md)
- [Stop GitHub MCP after init](./stories/03-stop-github-mcp-after-init.md)

## Acceptance Criteria

- `sibu mcp list` shows GitHub and whether it is selected.
- `sibu mcp use github` safely adds GitHub MCP config after init and no-ops when already selected.
- `sibu mcp stop github` safely removes selected GitHub MCP state and regenerates or unmanages affected config files.
- Targeted MCP mutations block when unresolved workflow drift exists.
- Unknown MCP ids guide users toward `sibu mcp list`.

## Dependencies / Risks

- Depends on the MCP catalog, state, target planning, and rendering foundation.
- Stop behavior must carefully distinguish MCP-only generated files from config files that are still managed for non-MCP purposes.
