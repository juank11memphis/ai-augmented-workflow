# Step 2: Add targeted export skill MCP dependencies

## Objective
When `sibu skills use export-to-github` or `sibu skills use export-to-notion` is requested without the required MCP server selected, install and record the required MCP server in the same guarded mutation.

## Tasks
- Derive required MCP servers from selected workflow skills.
- Prompt for Notion docs parent page when export-to-notion causes Notion MCP selection.
- Render/export skill files, required MCP config files, and AGENTS.md together.
- Preserve readiness and local-edit protections for all affected files.

## Verification
- Targeted skill tests cover export-to-github, export-to-notion, dependency messaging, state, and generated files.

## Review Status
Approved on 2026-05-19T13:59:00-06:00.
