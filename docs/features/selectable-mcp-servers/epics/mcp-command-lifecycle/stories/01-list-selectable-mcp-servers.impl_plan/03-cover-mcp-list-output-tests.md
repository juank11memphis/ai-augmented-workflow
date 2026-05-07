# Step: Cover MCP List Output Tests

## Goal

Add focused tests proving `sibu mcp list` output includes GitHub metadata and selected/unselected state without mutating files.

## Scope

- Add handler tests for MCP list output with no state file.
- Add handler tests for state with no `selectedMcpServers` field.
- Add handler tests for state with `selectedMcpServers: ['github']`.
- Assert output includes GitHub id `github`, name, source/description, and selected marker.
- Assert output copy keeps the config-only/auth user-owned boundary clear.
- Assert the handler does not create or modify `.sibu/state.json` or workflow files.
- Use existing project test style; avoid brittle ANSI assertions when practical.

## Files

- `src/modules/mcp-server-selection-management/list-mcp-servers/handler.test.ts`

## Done when

- Tests cover missing state, unselected state, and selected GitHub state.
- Tests prove the handler is read-only.
- Tests prove user-facing output does not imply install, auth, token creation, or live checks.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:46:01Z
