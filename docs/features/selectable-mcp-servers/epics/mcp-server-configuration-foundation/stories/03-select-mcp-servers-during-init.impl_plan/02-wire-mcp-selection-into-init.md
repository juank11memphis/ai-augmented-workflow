# Step: Wire MCP Selection Into Init

## Goal

Pass selected MCP servers through project adoption so init can plan, render, write, and record managed GitHub MCP config when selected.

## Scope

- Call `askForMcpServers()` during `handleInitProject()` after agent selection and before/near skill selections.
- Pass selected MCP servers into `getWorkflowTargets()`.
- Pass selected MCP servers into `renderMissingWorkflowFiles()`.
- Pass selected MCP servers into `writeSibuState()`.
- Keep init behavior unchanged when no MCP server is selected.
- Do not perform Docker, GitHub CLI, token, auth, or live MCP connectivity checks.
- Do not add Windsurf MCP support.

## Files

- `src/modules/project-adoption/handler.ts`

## Done when

- Init target planning receives selected MCP servers.
- Init rendering receives selected MCP servers.
- Initial state writing receives selected MCP servers.
- Existing init behavior remains unchanged for no MCP selection.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:29:12Z
