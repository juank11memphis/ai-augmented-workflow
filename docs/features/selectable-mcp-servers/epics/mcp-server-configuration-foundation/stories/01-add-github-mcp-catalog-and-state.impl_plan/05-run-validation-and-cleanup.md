# Step: Run Validation and Cleanup

## Goal

Verify the story is complete, type-safe, and limited to catalog/state support before handing it back for review.

## Scope

- Run the validation commands needed for this story.
- Review changed files for unintended scope creep into rendering, init prompts, CLI routing, templates, or Windsurf MCP support.
- Keep code simple and consistent with nearby selectable skill/state validation patterns.
- Do not implement later stories from the foundation epic.

## Files

- `src/shared/types.ts`
- `src/modules/workflow-target-planning/catalog.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/workflow-target-planning/catalog.test.ts`
- `src/modules/workflow-state-registry/state.ts`
- `src/modules/workflow-state-registry/state.test.ts`

## Done when

- `pnpm run build` passes.
- `pnpm test` passes.
- No generated MCP config files, templates, init prompts, or `sibu mcp` command routing were added in this story.
- Git diff is limited to the approved story scope and the implementation plan artifacts.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:11:42Z
