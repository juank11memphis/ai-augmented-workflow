# Step: Add Init MCP Selection Prompt

## Goal

Add an optional interactive prompt for selecting MCP servers during `sibu init`, with copy that makes Sibu's config-only boundary explicit.

## Scope

- Add `askForMcpServers()` to `src/modules/interactive-guidance/prompts.tsx`.
- Use `SELECTABLE_MCP_SERVERS` and return `SelectableMcpServer[]`.
- The prompt must be optional and allow no MCP servers selected.
- Prompt text or hints must state that Sibu configures files only and users own prerequisites/authentication.
- Export `askForMcpServers()` from `src/modules/interactive-guidance/index.ts`.
- Add focused prompt/helper tests only where practical without trying to automate the full terminal multiselect.
- Do not add `sibu mcp` post-init commands.

## Files

- `src/modules/interactive-guidance/prompts.tsx`
- `src/modules/interactive-guidance/index.ts`
- `src/modules/interactive-guidance/prompts.test.ts`

## Done when

- `sibu init` can call a dedicated MCP selection prompt.
- The prompt has clear config-only, prerequisites/auth user-owned copy.
- Cancelling the prompt follows existing initialization cancellation behavior.
- Existing prompt exports and tests still pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:29:12Z
