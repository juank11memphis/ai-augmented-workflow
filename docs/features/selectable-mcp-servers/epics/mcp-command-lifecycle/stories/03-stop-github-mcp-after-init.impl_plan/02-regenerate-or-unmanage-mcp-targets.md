# Step: Regenerate or Unmanage MCP Targets

## Goal

Implement the safe mutation path that removes GitHub from selected MCP state, regenerates mixed-purpose managed config files, and marks MCP-only generated files unmanaged when no selected MCP servers remain.

## Scope

- In `handleStopMcpServer`, call `getWorkflowMutationReadiness({ rootPath, statePath })` before mutating.
- If readiness is blocked, report the readiness message/hint and sample actionable previews without mutating.
- Build previous and next workflow targets from selected agents, existing selected skills, current MCP selection, and remaining MCP selection.
- For mixed-purpose config files that remain targets, such as Codex `.codex/config.toml`, render the file without GitHub MCP config and update managed-file hash/status.
- For MCP-only files no longer expected, such as `.mcp.json` and `.gemini/settings.json`, mark their managed-file state as `unmanaged` with the current file hash and a stop reason.
- Remove GitHub from `selectedMcpServers` and update `.sibu/state.json` accurately.
- Preserve local edit protection by relying on Workflow Mutation Readiness; do not merge arbitrary manual edits.
- Do not remove prerequisites, credentials, Docker images, or provider-side auth.
- Do not support Windsurf MCP targets.

## Files

- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.ts`
- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.test.ts`

## Done when

- `sibu mcp stop github` removes GitHub from selected MCP state when workflow state is clean.
- Codex `.codex/config.toml` remains managed and is rendered without GitHub MCP config.
- MCP-only files are marked unmanaged when no selected MCP servers remain.
- Managed-file hashes/statuses update accurately.
- Drift/readiness failures block before mutation.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T02:01:18Z
