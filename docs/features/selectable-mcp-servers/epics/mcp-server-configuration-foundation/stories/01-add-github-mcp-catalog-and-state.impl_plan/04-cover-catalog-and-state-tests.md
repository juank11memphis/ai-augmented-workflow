# Step: Cover Catalog and State Tests

## Goal

Add focused tests proving the GitHub MCP catalog/resolver and optional selected MCP state behavior satisfy the story acceptance criteria.

## Scope

- Extend `src/modules/workflow-target-planning/catalog.test.ts` to cover `SELECTABLE_MCP_SERVERS` and `resolveSelectableMcpServerById`.
- Assert `github` resolves as a valid MCP server and carries config-only metadata that does not imply install, token creation, auth validation, or live connectivity.
- Assert unknown MCP ids return guidance to run `sibu mcp list`.
- Extend `src/modules/workflow-state-registry/state.test.ts` to cover valid missing `selectedMcpServers`, valid `['github']`, and invalid non-string values.
- Keep tests focused on this story; do not add rendering, init, or CLI command tests.

## Files

- `src/modules/workflow-target-planning/catalog.test.ts`
- `src/modules/workflow-state-registry/state.test.ts`

## Done when

- Catalog tests cover successful GitHub resolution and unknown-id failure.
- State tests cover missing, valid, and invalid selected MCP server state.
- The story acceptance criteria are covered by tests.
- `pnpm test` passes after the full story implementation.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:11:42Z
