# Step: Cover init and MCP use rendering paths

## Goal

Extend integration-style tests around initialization and post-init MCP use so the Notion catalog and rendering changes work through real Sibu flows, not only isolated helper tests.

## Scope

- Add or update project adoption tests for selecting Notion during init and writing supported-agent MCP config files.
- Add or update `sibu mcp use` handler tests for using Notion after init.
- Cover Notion-only behavior and GitHub+Notion composition where practical.
- Assert generated config files contain Notion MCP URL and no credentials.
- Keep parent-page prompting/state out of this story; if test helpers need a placeholder for future state, stop and ask before adding it.
- Do not change CLI command routing; existing `mcp use <mcp_server_id>` routing should already cover arbitrary resolved ids.

## Files

- `src/modules/project-adoption/handler.test.ts`
- `src/modules/mcp-server-selection-management/use-mcp-server/handler.test.ts`
- `src/modules/workflow-target-planning/workflow-targets.test.ts` if init-style rendering coverage already lives there

## Done when

- Init tests prove selected Notion MCP creates/updates Codex, Claude, and Gemini config for supported selected agents.
- MCP use tests prove `sibu mcp use notion` can add Notion MCP config after init.
- Tests prove combining GitHub and Notion keeps both server entries in relevant config files.
- Tests prove Notion config contains no credential value.
- No parent page state, Notion export behavior, or live Notion connectivity is introduced.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:41:02Z
