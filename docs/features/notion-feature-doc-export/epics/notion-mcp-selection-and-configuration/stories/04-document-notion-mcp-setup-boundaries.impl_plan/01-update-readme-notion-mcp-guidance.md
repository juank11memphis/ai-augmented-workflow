# Step: Update README Notion MCP guidance

## Goal

Update the README MCP setup section so users understand how Notion MCP selection works and which Notion setup responsibilities remain outside Sibu.

## Scope

- Add Notion MCP guidance to `README.md` near existing MCP setup instructions.
- Explain Notion can be selected during `sibu init` or with `sibu mcp use notion`.
- Explain Sibu asks for and stores a Notion docs destination parent page in `.sibu/state.json`.
- Explain Sibu configures supported agent MCP files but does not manage Notion OAuth/login, workspace selection, integration authorization, page permissions, credentials, or live connectivity.
- Explain the Notion MCP connection must be authenticated separately and able to access the configured parent page.
- Explain feature docs remain local Markdown first and Notion is optional export only.
- Link to Notion MCP setup docs.
- Do not add a full provider walkthrough, Notion database guidance, or bidirectional sync documentation.

## Files

- `README.md`

## Done when

- README clearly documents Notion MCP selection and parent page configuration.
- README clearly states Sibu-owned vs user-owned Notion setup responsibilities.
- README states local Markdown remains canonical.
- README links to Notion MCP documentation.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:54:13Z
