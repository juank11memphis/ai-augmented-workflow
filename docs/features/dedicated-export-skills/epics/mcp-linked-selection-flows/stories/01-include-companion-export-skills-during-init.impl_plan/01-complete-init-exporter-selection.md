# Step: Complete init exporter selection

## Goal

Make `sibu init` derive exporter workflow skills from selected MCP servers before target planning and before asking for optional workflow skills.

## Scope

- Use workflow target planning catalog helpers to derive exporter skills implied by selected MCP servers.
- Ask the optional workflow skill prompt with implied exporter skills excluded.
- Merge implied exporter skills with user-selected workflow skills without duplicates.
- Preserve Notion docs parent page prompting when the completed MCP selection includes Notion.
- Do not change targeted `sibu mcp use`, `sibu skills use`, or `sibu sync` behavior.

## Files

- `src/modules/project-adoption/handler.ts`
- `src/modules/interactive-guidance/prompts.tsx`
- `src/modules/interactive-guidance/index.ts`

## Done when

- Init completes with MCP-implied exporter skills in the final workflow selection.
- Optional workflow skills can be prompted while excluding already implied exporter skills.
- Notion docs parent page behavior is preserved.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-19T13:40:42-06:00
