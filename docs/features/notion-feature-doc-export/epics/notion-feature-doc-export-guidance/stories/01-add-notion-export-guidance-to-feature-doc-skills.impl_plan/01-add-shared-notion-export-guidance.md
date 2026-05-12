# Step: Add shared Notion export guidance

## Goal

Add concise post-write Notion export guidance to the supported feature-doc pipeline skills while preserving local Markdown as canonical.

## Scope

- Update feature brief, technical design, and UX skill templates with a post-write Notion export section.
- Require local Markdown to be written before reading `.sibu/state.json` or offering Notion export.
- Require export availability checks for selected Notion MCP, configured `mcpServerConfigs.notion.docsParentPage`, and current-session Notion MCP tools.
- Require explicit user opt-in before any Notion page creation.
- Describe parent page → repo → Features → feature → document organization.
- Make unavailable or declined export a normal local-only completion.
- Do not add CLI/runtime Notion export code.

## Files

- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`

## Done when

- Each supported template says local Markdown is written first.
- Each supported template checks Notion selection, parent page config, and MCP tool availability before offering export.
- Each supported template says Notion is optional and not canonical.
- Each supported template forbids writing Notion URLs back into local Markdown.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:56:55Z
