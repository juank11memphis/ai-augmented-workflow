# Step: Run validation and review boundaries

## Goal

Validate the story implementation and review the changed code for scope boundaries, deterministic rendering, and user-owned Notion setup language.

## Scope

- Run the repository validation command.
- Run the Sibu workflow health check after validation.
- Review changed files for accidental parent-page state, Notion document export behavior, credential handling, live MCP checks, or workspace/permission management.
- Confirm user-facing text says Sibu configures MCP files only and Notion auth/permissions remain user-owned.
- Do not commit changes in this step unless the user explicitly asks.

## Files

- `src/shared/types.ts`
- `src/modules/workflow-target-planning/catalog.ts`
- `src/modules/workflow-target-planning/catalog.test.ts`
- `src/modules/workflow-target-planning/workflow-targets.ts`
- `src/modules/workflow-target-planning/workflow-targets.test.ts`
- `src/modules/template-catalog-rendering/templates.ts`
- `src/modules/project-adoption/handler.test.ts`
- `src/modules/mcp-server-selection-management/list-mcp-servers/handler.test.ts`
- `src/modules/mcp-server-selection-management/use-mcp-server/handler.test.ts`

## Done when

- `pnpm verify` passes.
- `sibu doctor` reports a healthy workflow or any drift is explicitly understood before continuing.
- The story acceptance criteria are covered by implementation and tests.
- Review confirms this story did not add Notion docs parent page prompting/state, live Notion auth/connectivity checks, or Notion document export behavior.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:41:02Z
