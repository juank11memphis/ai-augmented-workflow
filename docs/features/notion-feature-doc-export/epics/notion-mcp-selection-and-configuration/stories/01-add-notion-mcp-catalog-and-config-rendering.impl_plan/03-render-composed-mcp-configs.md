# Step: Render composed Notion MCP configs

## Goal

Teach MCP config rendering to compose GitHub and Notion server entries into each supported agent config while keeping output deterministic and credential-free for Notion.

## Scope

- Update MCP config rendering so selected MCP servers are rendered independently and composed into the same config file.
- Add Notion rendering for Codex using `[mcp_servers.notion]` with `url = "https://mcp.notion.com/mcp"`.
- Add Notion rendering for Claude and Gemini JSON MCP config using the hosted Notion MCP URL.
- Preserve existing GitHub config shape, including Codex `bearer_token_env_var` and JSON authorization header behavior.
- Ensure rendered output is deterministic for Notion-only and GitHub+Notion selections.
- Do not include Notion credentials, OAuth tokens, workspace ids, or parent page ids in generated MCP config.

## Files

- `src/modules/template-catalog-rendering/templates.ts`
- `src/modules/workflow-target-planning/workflow-targets.test.ts`
- `src/modules/template-catalog-rendering/templates.test.ts` if existing rendering tests are better placed there

## Done when

- Codex config can render GitHub and Notion entries together when both are selected.
- Claude config can render GitHub and Notion entries together when both are selected.
- Gemini config can render GitHub and Notion entries together when both are selected.
- Notion-only rendering uses `https://mcp.notion.com/mcp` and contains no token, credential, OAuth, workspace, or parent page value.
- Existing GitHub render assertions continue to pass.
- Deterministic render assertions cover repeated Notion rendering.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:41:02Z
