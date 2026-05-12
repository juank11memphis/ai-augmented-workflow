# Step: Add Notion parent page state

## Goal

Add the optional Sibu state shape for storing the Notion docs destination parent page and validate it safely when state is read.

## Scope

- Add an optional `mcpServerConfigs.notion.docsParentPage` type to `SibuState`.
- Update state validation to accept a string `docsParentPage` when present.
- Reject malformed Notion MCP config shapes.
- Preserve existing selected MCP server validation and GitHub behavior.
- Do not add prompts, CLI wiring, Notion export behavior, or live Notion validation in this step.

## Files

- `src/shared/types.ts`
- `src/modules/workflow-state-registry/state.ts`
- `src/modules/workflow-state-registry/state.test.ts`

## Done when

- TypeScript models optional Notion MCP config in Sibu state.
- State reads accept valid `mcpServerConfigs.notion.docsParentPage` values.
- State reads reject malformed `mcpServerConfigs` or non-string Notion parent page values.
- Existing state tests still pass.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:47:52Z
