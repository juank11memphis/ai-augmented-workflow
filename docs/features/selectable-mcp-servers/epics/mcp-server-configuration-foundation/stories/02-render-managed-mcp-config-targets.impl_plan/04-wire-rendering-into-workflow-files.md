# Step: Wire Rendering Into Workflow Files

## Goal

Connect MCP target planning and rendering so selected GitHub MCP targets create deterministic managed file contents alongside existing workflow file rendering.

## Scope

- Extend `getWorkflowTargets` and `renderMissingWorkflowFiles` inputs to accept selected MCP servers while preserving default behavior for existing callers.
- Route MCP config targets through the MCP renderer or MCP templates instead of skill-routing rendering.
- Preserve existing AGENTS.md and skill routing rendering behavior for non-MCP files.
- Update `writeSibuState` to persist `selectedMcpServers` when provided and continue hashing rendered managed files normally.
- Do not add init prompt wiring; later stories will pass selected MCP servers from adoption.
- Do not add post-init `sibu mcp use/stop` behavior.

## Files

- `src/modules/workflow-target-planning/workflow-targets.ts`
- `src/modules/workflow-target-planning/workflow-targets.test.ts`
- `src/shared/types.ts`

## Done when

- Rendering selected GitHub MCP targets creates expected Codex, Claude, and Gemini config contents.
- Rendering with no selected MCP servers preserves existing workflow output.
- `writeSibuState` can persist selected MCP server ids and managed-file hashes for MCP targets when callers pass them.
- Tests cover stable repeated rendering and preservation of non-MCP Codex content.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:23:20Z
