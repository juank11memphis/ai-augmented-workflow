# Step: Add MCP Shared Types

## Goal

Introduce the shared TypeScript contracts that make selectable MCP servers and selected MCP state first-class without changing rendering, init, or command behavior yet.

## Scope

- Add `McpServerId = 'github'` to `src/shared/types.ts`.
- Add `SelectableMcpServer`, `ResolvedSelectableMcpServer`, and `SelectableMcpServerResolutionResult` types to `src/shared/types.ts`.
- Add optional `selectedMcpServers?: McpServerId[]` to `SibuState` in `src/shared/types.ts`.
- Keep MCP server types separate from selectable skill types.
- Do not add MCP target planning, templates, init prompts, or CLI routing in this step.

## Files

- `src/shared/types.ts`

## Done when

- Shared MCP server types are exported from `src/shared/types.ts`.
- `SibuState` can represent selected MCP servers as an optional backward-compatible field.
- Existing selectable skill type contracts remain unchanged.
- `pnpm run build` passes after the full story implementation.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:11:42Z
