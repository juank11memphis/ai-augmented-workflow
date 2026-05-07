# Step: Run Init MCP Validation

## Goal

Validate the init MCP selection story and confirm the implementation stayed within project adoption and interactive guidance scope.

## Scope

- Run automated validation for the story.
- Perform a manual temporary-project smoke check when practical, or document why it was skipped.
- Review changes for unintended post-init MCP command lifecycle, prerequisite installation, credential storage, live connectivity checks, or Windsurf MCP support.
- Keep fixes within init selection wiring and tests.

## Files

- `src/modules/interactive-guidance/prompts.tsx`
- `src/modules/interactive-guidance/index.ts`
- `src/modules/interactive-guidance/prompts.test.ts`
- `src/modules/project-adoption/handler.ts`
- `src/modules/project-adoption/handler.test.ts`

## Done when

- `pnpm run build` passes.
- `pnpm test` passes.
- Manual smoke check is completed when practical, or skipped with a clear reason.
- No `sibu mcp` command lifecycle, prerequisite/auth checks, credential handling, or Windsurf MCP support was added.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:29:12Z
