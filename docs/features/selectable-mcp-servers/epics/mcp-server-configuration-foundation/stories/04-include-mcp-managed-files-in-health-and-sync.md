# Include MCP-Managed Files in Health and Sync Checks

## Epic

[MCP Server Configuration Foundation](../epic_brief.md)

## User Story

As a Sibu user, I want doctor and sync to protect MCP-managed config files like other managed workflow files, so that manual edits are never silently overwritten.

## Context

The feature requires generated MCP config files to be fully Sibu-managed while managed. Existing doctor/sync behavior should remain generic, using expected targets and recorded hashes instead of introducing a separate MCP drift path.

## Scope

- Ensure expected MCP targets participate in health diagnosis.
- Ensure sync review can preview missing, modified, and stale MCP-managed files.
- Treat manual edits to MCP-managed files as local drift.
- Keep `doctor` read-only and `sync` responsible for user review/repair choices.

## Out of Scope

- Implementing `sibu mcp use/stop` drift preflight.
- Special merge preservation for arbitrary manual edits inside managed MCP config files.
- Live MCP server validation.

## Acceptance Criteria

- `sibu doctor` reports missing MCP-managed files when selected MCP targets are absent.
- `sibu doctor` reports modified MCP-managed files when recorded hashes no longer match.
- `sibu sync` presents MCP-managed file drift through the existing review model.
- MCP-managed file handling does not bypass existing managed/customized/unmanaged semantics.

## Validation

- Unit tests for missing, modified, and stale MCP-managed target diagnosis/sync preview.
- Manual smoke check by editing a managed MCP config file and running `sibu doctor` when practical.
- `pnpm run build`.
