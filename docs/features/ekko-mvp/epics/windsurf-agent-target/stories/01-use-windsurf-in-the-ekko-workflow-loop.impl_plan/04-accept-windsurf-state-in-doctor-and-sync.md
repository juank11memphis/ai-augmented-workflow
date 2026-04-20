# Step: Accept Windsurf state in doctor and sync

## Goal

Ensure Ekko state that includes `windsurf` is treated as supported by state reading, `doctor`, and `sync` preview logic.

## Scope

- Verify `readStateForDoctor` accepts state with `selectedAgents: ['windsurf']` after the `AgentId` and catalog changes.
- Add tests showing `getSelectedAgentsFromState` resolves Windsurf from state.
- Add tests showing `getWorkflowMutationReadiness` or sync preview logic does not expect an unnecessary Windsurf-specific file for a Windsurf-selected repo.
- Add doctor-oriented coverage where practical by exercising shared diagnosis inputs through existing public helpers; if diagnosis remains private, cover the same behavior through workflow targets/readiness and document that `doctor` uses those helpers.
- Do not broaden state validation beyond the story scope.

## Files

- src/shared/state.ts
- src/shared/workflow-targets.ts
- src/shared/workflow-targets.test.ts
- src/shared/workflow-mutation-readiness.test.ts
- src/features/doctor-project/handler.ts

## Done when

- A valid state containing `windsurf` is accepted rather than reported as an unsupported selected agent.
- Workflow readiness/sync preview tests for a Windsurf-selected repo are clean when `AGENTS.md` and shared skill files are present.
- No test or helper expects a `.windsurf` file to exist.
- `pnpm build`, `pnpm check`, and relevant tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-20T02:38:26Z
