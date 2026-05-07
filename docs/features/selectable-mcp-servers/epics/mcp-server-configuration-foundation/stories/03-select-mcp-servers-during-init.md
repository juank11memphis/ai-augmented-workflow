# Select MCP Servers During Init

## Epic

[MCP Server Configuration Foundation](../epic_brief.md)

## User Story

As a Sibu user initializing a project, I want to optionally select GitHub MCP setup during `sibu init`, so that my new workflow starts with managed MCP configuration when I choose it.

## Context

Project adoption already gathers workflow choices and writes managed files plus `.sibu/state.json`. MCP server selection should join that flow while making the config-only boundary clear.

## Scope

- Add an optional MCP server selection step to `sibu init`.
- Show clear copy that Sibu configures MCP files only and does not install prerequisites or authenticate GitHub.
- Pass selected MCP servers into target planning, rendering, and state writing.
- Keep init behavior unchanged when no MCP server is selected.
- Record selected MCP servers and managed-file hashes in initial Sibu state.

## Out of Scope

- Post-init MCP selection commands.
- Runtime checks for Docker, npm, `gh`, tokens, or GitHub connectivity.
- Windsurf MCP support.

## Acceptance Criteria

- `sibu init` can complete with no MCP servers selected and produce the existing baseline behavior.
- `sibu init` can complete with GitHub selected and records `github` in selected MCP state.
- Generated MCP config files are recorded as managed files with hashes.
- User-facing init copy clearly states prerequisites and authentication are user-owned.
- Init only creates MCP targets for supported selected agents in the MVP.

## Validation

- Unit tests for init flow wiring with no MCP selection and with GitHub selected.
- Tests or fixtures proving selected MCP servers reach target planning/rendering/state writing.
- Manual smoke check in a temporary repo when practical.
- `pnpm run build`.
