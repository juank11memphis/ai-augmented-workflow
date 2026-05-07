# Step: Add MCP Config Renderer

## Goal

Add a small deterministic renderer for the GitHub MCP server config so supported agent config files can be generated without storing secrets or duplicating ad hoc JSON/TOML string assembly across modules.

## Scope

- Add MCP rendering helpers in `src/modules/template-catalog-rendering/`.
- Render GitHub MCP using the approved local Docker launch shape: `docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server`.
- Express credential usage as environment-variable references only; do not embed real tokens or credential values.
- Produce stable output for Codex TOML and Claude/Gemini JSON config shapes.
- Keep renderer scope limited to GitHub and the three supported agents.
- Do not add custom MCP server rendering or remote hosted GitHub MCP support.

## Files

- `src/modules/template-catalog-rendering/templates.ts`
- `src/modules/template-catalog-rendering/index.ts`
- `src/modules/template-catalog-rendering/templates.test.ts` or another focused test file in the same module

## Done when

- Renderer output is deterministic for repeated GitHub MCP renders.
- Codex output preserves `model_instructions_file = "../AGENTS.md"` and includes `[mcp_servers.github]` config.
- Claude and Gemini output include a stable `mcpServers.github` object.
- Tests prove rendered output contains the official GitHub MCP server launch command and no real credentials.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:23:20Z
