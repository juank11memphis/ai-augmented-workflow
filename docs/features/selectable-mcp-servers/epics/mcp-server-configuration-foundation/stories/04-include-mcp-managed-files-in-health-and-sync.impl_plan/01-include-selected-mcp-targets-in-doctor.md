# Step: Include Selected MCP Targets in Doctor

## Goal

Ensure Workflow Health Diagnosis calculates expected targets with selected MCP servers so missing MCP-managed files are diagnosed through the same generic path as other managed files.

## Scope

- Import and use `getSelectedMcpServersFromState(state)` in `src/modules/workflow-health-diagnosis/handler.ts`.
- Pass selected MCP servers into `getWorkflowTargets()` inside doctor expected-target diagnosis.
- Add unsupported selected MCP server warnings if this fits the existing unsupported-selection validation style.
- Preserve doctor as read-only.
- Do not implement `sibu mcp use/stop` drift preflight.

## Files

- `src/modules/workflow-health-diagnosis/handler.ts`
- `src/modules/workflow-health-diagnosis/handler.test.ts`

## Done when

- Doctor expected-target checks include selected GitHub MCP config targets.
- Missing selected MCP config files are reported with existing missing-file messages/hints.
- Existing non-MCP doctor behavior is unchanged.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:36:49Z
