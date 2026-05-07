# Step: Cover Init MCP Flow Tests

## Goal

Add test coverage proving init works with no MCP servers selected and with GitHub selected, including managed-file hashes for generated MCP config.

## Scope

- Add project-adoption tests if the module does not already have focused tests.
- Mock or otherwise control interactive prompt dependencies so tests can run non-interactively.
- Test no MCP selection preserves the existing baseline behavior and does not write `selectedMcpServers` unless the implementation intentionally records an empty array.
- Test GitHub selection records `selectedMcpServers: ['github']`.
- Test GitHub selection creates expected Codex, Claude, and/or Gemini MCP config files for selected supported agents and records them in `managedFiles` with hashes.
- Test selected agents exclude Windsurf MCP config targets.
- Keep tests focused on init flow wiring; do not add `sibu mcp use/stop` tests.

## Files

- `src/modules/project-adoption/handler.test.ts`
- `src/modules/interactive-guidance/prompts.test.ts`

## Done when

- Tests prove init can complete without MCP selection.
- Tests prove init can complete with GitHub selected and records state/managed files.
- Tests prove Sibu does not attempt prerequisite/auth/live checks in init.
- Tests prove Windsurf MCP config is not generated.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:29:12Z
