# Step: Wire MCP List CLI Routing

## Goal

Expose the new list command through the CLI as `sibu mcp list` while keeping CLI entrypoints thin.

## Scope

- Add `ListMcpServersCommand` to the `SibuCliCommand` union in `src/entrypoints/cli/command.ts`.
- Add a `mcp` command group to `src/entrypoints/cli/create-program.ts` with `list` subcommand.
- Dispatch `mcp:list` to the MCP list handler in `src/entrypoints/cli/execute-command.ts`.
- Add CLI routing tests for `sibu mcp list` if the repo has a suitable pattern; otherwise add focused tests around the command builder.
- Do not add `use` or `stop` subcommands yet.

## Files

- `src/entrypoints/cli/command.ts`
- `src/entrypoints/cli/create-program.ts`
- `src/entrypoints/cli/execute-command.ts`
- `src/entrypoints/cli/create-program.test.ts`

## Done when

- `sibu mcp list` routes to command type `mcp:list`.
- Existing `init`, `doctor`, `sync`, and `skills` commands still route as before.
- No post-init MCP mutation commands are introduced.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:46:01Z
