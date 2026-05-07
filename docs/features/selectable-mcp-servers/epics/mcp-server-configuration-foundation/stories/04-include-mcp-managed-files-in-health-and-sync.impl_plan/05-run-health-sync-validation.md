# Step: Run Health and Sync Validation

## Goal

Validate the health/sync MCP story and confirm the implementation remains generic, read-only for doctor, and within the approved scope.

## Scope

- Run automated validation for this story.
- Perform a manual smoke check by editing a managed MCP config file and running `sibu doctor` when practical, or document why it was skipped.
- Review changes for unintended `sibu mcp use/stop`, live MCP validation, credential handling, or special manual-edit merge behavior.
- Keep fixes inside health diagnosis, sync review, and rendering support needed by sync.

## Files

- `src/modules/workflow-health-diagnosis/handler.ts`
- `src/modules/workflow-health-diagnosis/handler.test.ts`
- `src/modules/sync-review/sync-preview.ts`
- `src/modules/sync-review/sync-preview.test.ts`
- `src/modules/sync-review/apply-action.ts`
- `src/modules/template-catalog-rendering/templates.ts`
- `src/modules/template-catalog-rendering/index.ts`

## Done when

- `pnpm run build` passes.
- `pnpm test` passes.
- Manual doctor smoke check is completed when practical, or skipped with a clear reason.
- No post-init MCP command lifecycle, live connectivity checks, credential handling, or special manual-edit merge behavior was added.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:36:49Z
