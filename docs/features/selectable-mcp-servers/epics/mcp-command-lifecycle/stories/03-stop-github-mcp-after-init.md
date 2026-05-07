# Stop GitHub MCP After Init

## Epic

[MCP Command Lifecycle](../epic_brief.md)

## User Story

As a Sibu user, I want to run `sibu mcp stop github`, so that Sibu stops managing GitHub MCP configuration without silently overwriting local edits.

## Context

Stopping an MCP server removes selected MCP state and then regenerates managed config from the remaining selections. If a generated MCP-only file is no longer expected, Sibu should stop managing it and prompt whether to keep or delete it. Files still needed for non-MCP agent support should remain managed and be rendered without the MCP section.

## Scope

- Add CLI routing for `sibu mcp stop <mcp_server_id>`.
- Validate the requested MCP server id and guide unknown ids to `sibu mcp list`.
- Use Workflow Mutation Readiness to block when workflow drift requires sync review.
- No-op with clear output when GitHub is not selected.
- Remove GitHub from selected MCP state.
- Regenerate affected managed config files or unmanage MCP-only files when no selected MCP servers remain.
- Prompt keep/delete for generated MCP-only files that are no longer expected.
- Preserve managed-file hashes and status updates accurately.

## Out of Scope

- Preserving arbitrary manual edits inside managed MCP config files during targeted stop; users must resolve drift through sync first.
- Removing prerequisites, credentials, Docker images, or provider-side auth.
- Windsurf MCP support.

## Acceptance Criteria

- `sibu mcp stop github` removes GitHub from selected MCP state when the workflow is clean.
- MCP-only config files are unmanaged and users can choose whether to keep or delete them.
- Config files still needed for non-MCP agent support remain managed and are rendered without GitHub MCP config.
- Running the command when GitHub is not selected reports a no-op.
- The command refuses to mutate when Workflow Mutation Readiness reports actionable drift.
- Unknown ids are rejected with guidance to run `sibu mcp list`.

## Validation

- Unit tests for successful stop, not-selected no-op, unknown id, drift-blocked path, keep/delete handling, and mixed-purpose config regeneration.
- Tests asserting selected MCP state and managed-file hashes/statuses update correctly.
- `pnpm run build`.
- `pnpm run validate:packed-runtime`.
