# Use GitHub MCP After Init

## Epic

[MCP Command Lifecycle](../epic_brief.md)

## User Story

As a Sibu user with an initialized project, I want to run `sibu mcp use github`, so that Sibu can add managed GitHub MCP configuration after initial adoption.

## Context

Post-init MCP mutation should mirror the safe behavior of existing targeted workflow mutations: block on unresolved drift, avoid duplicate changes, render affected managed files, and update state/hashes only after a safe mutation.

## Scope

- Add CLI routing for `sibu mcp use <mcp_server_id>`.
- Validate the requested MCP server id and guide unknown ids to `sibu mcp list`.
- Use Workflow Mutation Readiness to block when workflow drift requires sync review.
- No-op with clear output when GitHub is already selected.
- Add GitHub to selected MCP state, render affected config files, and update managed-file hashes when safe.
- Preserve the config-only/prerequisites-auth user-owned boundary in command output.

## Out of Scope

- Installing Docker, MCP servers, GitHub CLI, or dependencies.
- Creating or validating GitHub tokens.
- Live MCP server connectivity checks.
- Windsurf MCP support.

## Acceptance Criteria

- `sibu mcp use github` adds GitHub MCP selection when the workflow is clean.
- The command creates or updates expected MCP config files for supported selected agents.
- The command updates `.sibu/state.json` with selected MCP state and managed-file hashes.
- Running the command again reports that GitHub is already selected without rewriting unnecessarily.
- The command refuses to mutate when Workflow Mutation Readiness reports actionable drift.
- Unknown ids are rejected with guidance to run `sibu mcp list`.

## Validation

- Unit tests for successful use, duplicate no-op, unknown id, and drift-blocked paths.
- Tests asserting rendered file/state/hash updates after use.
- `pnpm run build`.
- `pnpm run validate:packed-runtime`.
