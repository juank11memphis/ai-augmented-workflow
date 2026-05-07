# Step: Cover MCP Health and Sync Drift Tests

## Goal

Add focused tests proving missing and modified MCP-managed files are protected by doctor and sync without bypassing existing managed-file semantics.

## Scope

- Add or extend health diagnosis tests for selected GitHub MCP config targets.
- Test doctor reports missing MCP-managed files when selected MCP targets are absent.
- Test doctor reports modified MCP-managed files when recorded hashes no longer match.
- Add or extend sync preview tests for MCP-managed missing, modified, and stale/new-template cases.
- Test unmanaged MCP-managed files are not reported as actionable through expected-target checks.
- Keep tests focused on doctor/sync; do not test post-init `sibu mcp use/stop` commands.

## Files

- `src/modules/workflow-health-diagnosis/handler.test.ts`
- `src/modules/sync-review/sync-preview.test.ts`

## Done when

- Tests cover missing MCP-managed file diagnosis.
- Tests cover modified MCP-managed file diagnosis and sync preview.
- Tests cover stale/new expected MCP template preview.
- Tests prove unmanaged MCP files remain respected.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:36:49Z
