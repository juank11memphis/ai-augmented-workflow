# Step: Include Selected MCP Targets in Sync Preview

## Goal

Ensure Sync Review calculates expected targets with selected MCP servers so missing or newly expected MCP-managed files appear in sync previews through existing statuses.

## Scope

- Import and use `getSelectedMcpServersFromState(state)` in `src/modules/sync-review/sync-preview.ts`.
- Pass selected MCP servers into `getWorkflowTargets()` inside `getSyncPreviews()`.
- Ensure selected MCP config targets missing from state appear as `new-template` when expected.
- Keep existing managed/customized/unmanaged status behavior unchanged.
- Do not add MCP-specific prompt/action behavior.

## Files

- `src/modules/sync-review/sync-preview.ts`
- `src/modules/sync-review/sync-preview.test.ts`

## Done when

- Sync preview includes expected MCP targets selected in state.
- Missing MCP target records preview through existing generic `new-template` or `missing` behavior as appropriate.
- Existing non-MCP sync previews remain unchanged.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:36:49Z
