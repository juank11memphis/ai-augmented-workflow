# Step: Add GitHub MCP Catalog Resolution

## Goal

Add the Workflow Target Planning catalog entry and resolver for the official GitHub MCP server so code can resolve `github` independently from selectable skills.

## Scope

- Import the new MCP types into `src/modules/workflow-target-planning/catalog.ts`.
- Add `SELECTABLE_MCP_SERVERS` with a single `github` entry named `GitHub MCP Server`.
- Keep the `github` description explicitly config-only: Sibu configures the official server and users own prerequisites/auth.
- Include source metadata for `github/github-mcp-server` if it fits the new `SelectableMcpServer` type.
- Add `resolveSelectableMcpServerById(serverId)` returning a successful GitHub resolution or an unknown-id message that says to run `sibu mcp list`.
- Export the catalog and resolver through `src/modules/workflow-target-planning/index.ts`.
- Do not overload or alter `resolveSelectableSkillById`.

## Files

- `src/modules/workflow-target-planning/catalog.ts`
- `src/modules/workflow-target-planning/index.ts`

## Done when

- `resolveSelectableMcpServerById('github')` returns an ok result with the GitHub MCP server.
- Unknown MCP ids return `Unknown MCP server \`<id>\`. Run \`sibu mcp list\` to see available MCP servers.` or an equivalent message with that guidance.
- Skill resolution behavior and unknown skill messaging are unchanged.
- `pnpm run build` passes after the full story implementation.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:11:42Z
