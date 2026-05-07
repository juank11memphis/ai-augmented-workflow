# Step: Add MCP Target Planning

## Goal

Extend Workflow Target Planning so selected MCP servers resolve into managed config targets for Codex, Claude, and Gemini without changing init prompts or post-init commands yet.

## Scope

- Add MCP-aware target metadata to `WorkflowTarget` in `src/shared/types.ts` only as needed for this story, keeping existing callers backward compatible.
- Add `getSelectedMcpServersFromState(state)` to resolve selected MCP ids through `SELECTABLE_MCP_SERVERS`.
- Add `getSelectedMcpTargetsForAgents(selectedAgents, selectedMcpServers)` in `src/modules/workflow-target-planning/workflow-targets.ts`.
- Include Codex, Claude, and Gemini MCP targets when GitHub is selected.
- Do not include Windsurf MCP targets.
- Do not wire selected MCP servers into `sibu init`, `sibu mcp`, doctor, or sync behavior in this step.

## Files

- `src/shared/types.ts`
- `src/modules/workflow-target-planning/workflow-targets.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/workflow-target-planning/workflow-targets.test.ts`

## Done when

- Target planning can produce MCP config targets for Codex, Claude, and Gemini.
- Target planning produces no Windsurf MCP config target.
- Existing calls to `getWorkflowTargets` still compile and behave as before when no MCP servers are provided.
- Focused tests cover target paths and no-Windsurf behavior.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:23:20Z
