# Step: Add and Update MCP Templates

## Goal

Add the managed template files and manifest metadata needed for GitHub MCP config targets while preserving existing non-MCP agent support content.

## Scope

- Update `templates/.codex/config.toml` only if the chosen renderer/template approach requires a placeholder or static baseline for MCP rendering.
- Add Claude and Gemini MCP config templates at the paths selected by the implementation, matching the technical design unless an existing convention requires a small path adjustment.
- Update `templates/manifest.json` for every new or changed template.
- Bump the global template version and each changed template version according to `sibu-template-change` guidance.
- Write user-facing change notes that explain GitHub MCP config support.
- Do not add a Windsurf MCP template.

## Files

- `templates/.codex/config.toml`
- `templates/mcp/claude/.mcp.json`
- `templates/mcp/gemini/settings.json`
- `templates/manifest.json`

## Done when

- All new or changed MCP templates are present under `templates/`.
- `templates/manifest.json` has entries for each managed MCP config template.
- Manifest notes are user-facing and current-version only.
- No Windsurf MCP template exists.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:23:20Z
