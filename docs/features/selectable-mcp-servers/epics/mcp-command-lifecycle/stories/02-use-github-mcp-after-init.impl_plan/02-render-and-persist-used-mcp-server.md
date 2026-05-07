# Step: Render and Persist Used MCP Server

## Goal

Implement the safe mutation path that adds GitHub MCP config files, updates managed-file hashes, and records selected MCP state after workflow readiness passes.

## Scope

- In `handleUseMcpServer`, call `getWorkflowMutationReadiness({ rootPath, statePath })` before mutating.
- If readiness is blocked, report the readiness message/hint and sample actionable previews, matching the safe style of skill selection.
- Build previous and next workflow targets using selected agents, existing selected skills, existing selected MCP servers, and next selected MCP servers.
- Render only newly missing MCP config targets or existing managed targets that need MCP sections, preserving existing non-MCP content such as Codex `.codex/config.toml` through the approved renderer.
- Preflight target files so unrecorded existing MCP config files are not overwritten silently.
- Write generated MCP config files and update `.sibu/state.json` via `writeSibuState()` with `selectedMcpServers`.
- Preserve config-only/prerequisites-auth user-owned copy in command output.
- Do not check Docker, GitHub CLI, tokens, auth, or live MCP connectivity.
- Do not support Windsurf MCP targets.

## Files

- `src/modules/mcp-server-selection-management/use-mcp-server/handler.ts`
- `src/modules/mcp-server-selection-management/use-mcp-server/handler.test.ts`

## Done when

- `sibu mcp use github` can create expected MCP config files for selected Codex, Claude, and Gemini agents.
- `.sibu/state.json` records `selectedMcpServers: ['github']` and managed-file hashes.
- Duplicate use does not rewrite files unnecessarily.
- Drift/readiness failures block before mutation.
- Existing local unrecorded MCP config files are not overwritten silently.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:53:27Z
