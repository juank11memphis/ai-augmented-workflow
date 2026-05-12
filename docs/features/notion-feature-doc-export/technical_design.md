# Technical Design: Notion Feature Doc Export

## Inputs

- Product vision: `docs/product-vision.md`
- Deep Module Map: `docs/deep-module-map.md`
- Feature brief: `docs/features/notion-feature-doc-export/feature_brief.md`
- Notion MCP reference: `https://developers.notion.com/guides/mcp/get-started-with-mcp`
- Delegated skills for implementation: `clean-code`, `typescript`, `command-pattern`, `sibu-template-change`, `ai-prompt-engineer-master`

## Summary

Implement this feature in two parts: first-class Notion MCP selection/configuration in the CLI workflow, and template guidance that lets doc-writing pipeline skills optionally export each generated document to Notion. Local Markdown remains the canonical artifact; Notion export is an opt-in agent action after the local file is written.

## Existing Context

Sibu already has a selectable MCP server lifecycle centered on GitHub:

- `src/modules/workflow-target-planning/catalog.ts` defines `SELECTABLE_MCP_SERVERS`.
- `src/modules/interactive-guidance/prompts.tsx` asks for MCP servers during `sibu init`.
- `src/modules/project-adoption/handler.ts` stores selected MCP servers during init.
- `src/modules/mcp-server-selection-management/use-mcp-server/handler.ts` implements `sibu mcp use <id>`.
- `src/modules/mcp-server-selection-management/stop-mcp-server/handler.ts` implements `sibu mcp stop <id>`.
- `src/modules/template-catalog-rendering/templates.ts` renders MCP config into `.codex/config.toml`, `.mcp.json`, and `.gemini/settings.json`.
- `src/shared/types.ts` currently limits `McpServerId` to `github` and stores only `selectedMcpServers?: McpServerId[]` in `SibuState`.

The pipeline doc-writing skills that need Notion export guidance are:

- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`

Local copies exist for mandatory/current repo skills where applicable:

- `.agents/skills/feature-brief-writer/SKILL.md`
- `.agents/skills/technical-design-writer/SKILL.md`

Notion's current hosted MCP setup uses the remote MCP URL `https://mcp.notion.com/mcp` and OAuth-based authentication. Notion's docs state that Codex can configure `[mcp_servers.notion] url = "https://mcp.notion.com/mcp"`, and that user OAuth/permissions determine access. Sibu should configure MCP files only and should not store Notion credentials.

## Proposed Design

### 1. Add Notion to the selectable MCP catalog

Update shared MCP types and catalog entries:

- `src/shared/types.ts`
  - Change `McpServerId` from `'github'` to `'github' | 'notion'`.
  - Add an optional state config object for provider-specific MCP settings:

```ts
mcpServerConfigs?: {
  notion?: {
    docsParentPage: string;
  };
};
```

Use `docsParentPage` as the raw user-provided Notion page URL or page ID. Keep it opaque to Sibu; the Notion MCP tools can validate/access it during export.

- `src/modules/workflow-target-planning/catalog.ts`
  - Add `notion` to `SELECTABLE_MCP_SERVERS` with source `makenotion/notion-mcp-server` or Notion's hosted MCP docs URL metadata.
  - Description should say Sibu configures Notion MCP and stores a docs parent page, while OAuth, workspace access, and permissions remain user-owned.

Update catalog tests for list order and resolution.

### 2. Render MCP config for any selected supported MCP server

Update target planning so selecting Notion creates/updates the same agent MCP config targets as GitHub for supported agents:

- `.codex/config.toml` for Codex
- `.mcp.json` for Claude
- `.gemini/settings.json` for Gemini

Change `getSelectedMcpTargetsForAgents` so it returns MCP targets when at least one selected MCP server has renderable config, not only when GitHub is selected.

Update `renderMcpConfig` in `src/modules/template-catalog-rendering/templates.ts` to compose multiple selected MCP servers into the same config file:

- Codex:

```toml
[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
bearer_token_env_var = "GITHUB_PERSONAL_ACCESS_TOKEN"

[mcp_servers.notion]
url = "https://mcp.notion.com/mcp"
```

- Claude/Gemini JSON config should include both `github` and `notion` keys when both are selected.
- For Notion JSON config, use the current remote URL shape from Notion docs:

```json
{
  "mcpServers": {
    "notion": {
      "url": "https://mcp.notion.com/mcp"
    }
  }
}
```

Preserve existing GitHub render output and tests. Add tests for:

- Notion-only rendering.
- GitHub + Notion rendering in the same files.
- Deterministic output.
- No Notion token or credential values are written.

### 3. Store Notion docs parent page during init and MCP use

Add one prompt in `interactive-guidance`:

```ts
askForNotionDocsParentPage(): Promise<string>
```

Prompt copy should ask for a Notion parent page URL or page ID and mention that the configured Notion MCP connection must be able to access it. It should not ask for workspace selection.

Wire it into:

- `src/modules/project-adoption/handler.ts`
  - After MCP server selection, if `notion` is selected, ask for the Notion docs parent page.
  - Pass the value into `writeSibuState`.

- `src/modules/mcp-server-selection-management/use-mcp-server/handler.ts`
  - When `sibu mcp use notion` selects Notion, ask for the Notion docs parent page before writing state.
  - When selecting a non-Notion MCP server, do not ask.

Update `writeSibuState` to accept and preserve `mcpServerConfigs`. Preserve existing Notion config if unrelated workflow changes rewrite state.

Update state validation in `src/modules/workflow-state-registry/state.ts` so optional `mcpServerConfigs.notion.docsParentPage` is accepted when present.

### 4. Remove Notion config when Notion is stopped

Update `stopSelectedMcpServer` so `sibu mcp stop notion` removes `mcpServerConfigs.notion` from the next state.

Existing MCP file behavior should continue:

- If GitHub remains selected, rewrite MCP config files without Notion but keep them managed.
- If no MCP servers remain, mark MCP-only config files unmanaged as today.
- `.codex/config.toml` remains managed for Codex agent support and is rendered without Notion MCP config.

Add stop tests for Notion-only and GitHub+Notion states.

### 5. Teach pipeline skills to offer Notion export after local writes

Update the template guidance for:

- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`

Add a short post-write export section to each skill:

1. Always write the local Markdown artifact first.
2. Read `.sibu/state.json` only after the local file is complete.
3. If `selectedMcpServers` includes `notion`, `mcpServerConfigs.notion.docsParentPage` is present, and Notion MCP tools are available in the current agent session, ask whether to export this just-created document.
4. If unavailable or declined, do nothing else.
5. If accepted, create/reuse Notion organization pages:

```txt
<docsParentPage>
└── <repo name>
    └── Features
        └── <feature name>
            └── <document type>
```

6. Create a new document page for the artifact content. Do not update local Markdown with Notion URLs.
7. Report success or a clear failure, while preserving the local file as the completed artifact.

Keep this as instruction/template behavior, not Sibu runtime code. The agent uses available Notion MCP tools directly, similar to the existing Scrum planner GitHub export pattern.

Update local `.agents/skills/...` copies for changed mandatory skills so this repository immediately uses the new behavior.

### 6. Update README documentation

Update `README.md` in the MCP server setup section so end users understand Notion support before selecting it. The README should cover:

- Notion is selectable during `sibu init` and with `sibu mcp use notion`.
- Sibu asks once for a Notion docs destination parent page and stores that page reference in `.sibu/state.json`.
- Sibu configures supported agent MCP files for the Notion MCP server, but does not perform Notion OAuth login, choose a workspace, install/authorize the Notion integration, grant page permissions, manage credentials, or verify live connectivity.
- The Notion MCP connection must be authenticated separately and must have access to the configured parent page.
- Feature brief, technical design, and UX exports always start from local Markdown files; Notion is an optional export destination, not the source of truth.
- If using Codex with the hosted Notion MCP server, users may need to run the agent-specific MCP login flow, such as `codex mcp login notion`, after Sibu writes config.

Keep README guidance concise and provider-safe. Link to Notion MCP setup docs instead of copying long provider instructions that may change.

### 7. Template manifest updates

Because this changes templates, update `templates/manifest.json`:

- bump global `templateVersion`,
- bump each changed template version,
- replace each changed template's `changes` with user-facing notes for this release.

If MCP config template files remain path-stable, do not add new template paths. Only update `templates/.codex/config.toml`, `templates/mcp/claude/.mcp.json`, or `templates/mcp/gemini/settings.json` if their base placeholders need changing; most rendering should remain in `renderMcpConfig`.

## Module Boundary Translation

- **MCP Server Selection Management** owns `sibu mcp use notion`, `sibu mcp stop notion`, prompting for the Notion parent page during post-init selection, and clearing Notion config on stop.
- **Project Adoption** owns asking for the parent page during init because init already owns first-time MCP selection.
- **Workflow State Registry** owns the optional `mcpServerConfigs` state shape and validation.
- **Workflow Target Planning** owns the selectable Notion catalog entry and agent MCP target resolution.
- **Template Catalog and Rendering** owns deterministic MCP config rendering and pipeline skill template updates.
- **Workflow Health Diagnosis** and **Sync Review** should continue using state + expected targets; they do not validate live Notion access.

CLI entrypoints under `src/entrypoints/cli/**` remain thin. They may route `mcp:list`, `mcp:use`, and `mcp:stop` commands to the MCP selection handlers only; they must not render MCP configs, inspect state internals, or handle Notion-specific prompting.

## Validation

Run:

- `pnpm verify`
- `sibu doctor`

Add or update tests for:

- Notion appears in `sibu mcp list` and catalog resolution.
- Init with Notion stores `selectedMcpServers: ['notion']` and `mcpServerConfigs.notion.docsParentPage`.
- `sibu mcp use notion` prompts for and stores the parent page.
- `sibu mcp stop notion` removes Notion config while preserving other selected MCP servers.
- Notion-only and GitHub+Notion config rendering for Codex, Claude, and Gemini.
- State validation accepts optional Notion MCP config and rejects malformed config.
- Pipeline skill templates contain post-write Notion export guidance and still require local Markdown output first.
- README MCP setup documentation explains Notion selection, parent page configuration, optional doc export, and the Notion setup tasks Sibu does not own.
- Manifest versions and change notes are updated for every changed template.

Manual checks:

- `sibu mcp list` shows Notion with clear user-owned auth guidance.
- Generated MCP config uses `https://mcp.notion.com/mcp` and contains no credentials.
- README links to Notion MCP setup docs and clearly states that Sibu does not manage OAuth login, workspace selection, integration permissions, credentials, or live connectivity checks.
- Feature brief, technical design, and UX skill guidance does not imply Notion is canonical.

## Risks / Open Questions

- The exact Notion MCP tool names are agent-dependent, so export guidance should describe the desired Notion operations rather than hard-code tool names.
- Matching/reusing existing repo and feature container pages by title can be imperfect. MVP should tolerate duplicate containers if the agent cannot confidently find an existing page.
- Notion remote MCP uses OAuth and may require interactive login (`codex mcp login notion` for Codex). Sibu should configure files but not attempt live login or connectivity checks.
