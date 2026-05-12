# Step: Generalize MCP target planning for renderable servers

## Goal

Update workflow target planning so any selected renderable MCP server, including Notion, creates the supported agent MCP config targets.

## Scope

- Replace GitHub-specific target gating in MCP target planning with a generic check for selected MCP servers that render into agent config.
- Keep supported MCP config targets limited to Codex, Claude, and Gemini.
- Preserve no Windsurf MCP config behavior.
- Ensure GitHub-only, Notion-only, and GitHub+Notion selections produce expected target paths without duplicates.
- Do not add parent-page state, prompts, or Notion export guidance in this step.

## Files

- `src/modules/workflow-target-planning/workflow-targets.ts`
- `src/modules/workflow-target-planning/workflow-targets.test.ts`

## Done when

- Notion-only selection includes `.codex/config.toml`, `.mcp.json`, and `.gemini/settings.json` targets for supported selected agents.
- GitHub+Notion selection produces one target per supported agent config path, not duplicate targets.
- Windsurf still receives no MCP config target.
- Existing no-MCP selection behavior remains unchanged.
- Focused workflow target planning tests pass.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:41:02Z
