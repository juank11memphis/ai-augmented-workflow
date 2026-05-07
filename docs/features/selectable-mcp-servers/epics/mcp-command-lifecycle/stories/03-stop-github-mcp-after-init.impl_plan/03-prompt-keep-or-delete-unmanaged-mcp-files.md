# Step: Prompt Keep or Delete Unmanaged MCP Files

## Goal

Ask users whether to keep or delete MCP-only files that Sibu just stopped managing, while preserving local-edit safety.

## Scope

- Add a keep/delete prompt for stopped MCP-only files after state has been updated.
- Default/recommended behavior should keep local files.
- If the file is missing or not a regular file, do not delete it and report clearly.
- If the file hash differs from the stopped managed-file hash, ask a second confirmation before deleting.
- Support tests by injecting or isolating the delete decision helper where practical.
- Do not prompt for mixed-purpose files that remain managed, such as Codex `.codex/config.toml`.

## Files

- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.ts`
- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.test.ts`

## Done when

- Stopped MCP-only files can be kept or deleted by user choice.
- The recommended/default path preserves local files.
- Edited files require a second confirmation before deletion.
- Mixed-purpose still-managed files are not offered for deletion.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T02:01:18Z
