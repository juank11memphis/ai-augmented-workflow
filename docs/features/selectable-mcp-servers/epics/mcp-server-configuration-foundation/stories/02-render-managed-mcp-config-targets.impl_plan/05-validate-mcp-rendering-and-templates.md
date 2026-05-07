# Step: Validate MCP Rendering and Templates

## Goal

Prove the MCP rendering foundation is complete, stable, and limited to the approved supported agents before story review.

## Scope

- Run the story validation commands.
- Run template-focused validation required by `sibu-template-change` when practical.
- Review changed files for unintended init prompt, CLI command, custom MCP, credential, live connectivity, or Windsurf MCP scope.
- Keep fixes within this story's rendering/target/template boundary.

## Files

- `src/shared/types.ts`
- `src/modules/workflow-target-planning/workflow-targets.ts`
- `src/modules/workflow-target-planning/index.ts`
- `src/modules/workflow-target-planning/workflow-targets.test.ts`
- `src/modules/template-catalog-rendering/templates.ts`
- `src/modules/template-catalog-rendering/index.ts`
- `src/modules/template-catalog-rendering/templates.test.ts`
- `templates/.codex/config.toml`
- `templates/mcp/claude/.mcp.json`
- `templates/mcp/gemini/settings.json`
- `templates/manifest.json`

## Done when

- `pnpm run build` passes.
- `pnpm test` passes.
- `pnpm run validate:packed-runtime` passes.
- `pnpm verify` passes when practical for the template change.
- No generated config contains real credentials.
- No Windsurf MCP support, init prompt wiring, or `sibu mcp` command lifecycle was added.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:23:20Z
