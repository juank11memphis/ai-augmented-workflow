# Technical Design: Selectable MCP Servers

## Inputs

- Product vision: `docs/product-vision.md`
- Deep Module Map: `docs/deep-module-map.md`
- Feature brief: `docs/features/selectable-mcp-servers/feature_brief.md`
- External references:
  - GitHub MCP Server: `https://github.com/github/github-mcp-server`
  - Codex config reference: `https://developers.openai.com/codex/config-reference`
  - Claude Code MCP docs: `https://code.claude.com/docs/en/mcp`
  - Gemini CLI MCP docs: `https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html`
- Delegated skills for implementation: `clean-code`, `typescript`, `command-pattern`, `sibu-template-change`

## Summary

Add selectable MCP server support as a parallel lifecycle to selectable skills. The first selectable server is GitHub with id `github`, backed by GitHub's official `github/github-mcp-server` Docker image. Sibu renders fully managed MCP config files from selected MCP state, detects local edits through existing hash-based drift behavior, and blocks targeted `sibu mcp use/stop` when broader workflow drift needs `sibu sync` first.

## Existing Context

- CLI command routing is centralized in `src/entrypoints/cli/*` and currently exposes `init`, `doctor`, `sync`, and `skills` commands.
- Selectable skill metadata lives in `src/modules/workflow-target-planning/catalog.ts`, with selection state in `src/shared/types.ts` and `.sibu/state.json`.
- Project adoption already prompts for selected agents and optional skills, then renders workflow targets and writes initial state.
- Skill lifecycle commands under `src/modules/skill-selection-management/` provide the closest behavior model for list/use/stop, clean-workflow preflight, duplicate no-ops, AGENTS routing refresh, unmanaged status, and keep/delete prompts.
- Template rendering and manifest metadata live under `templates/` and `src/modules/template-catalog-rendering/`.
- Doctor and sync already compare expected targets, template versions, and file hashes for managed files.

## Proposed Design

### MCP catalog and state

Add MCP server selection as its own catalog and state category, not as a skill category.

- Add shared types:
  - `McpServerId = 'github'`
  - `SelectableMcpServer`
  - `ResolvedSelectableMcpServer`
  - `SelectableMcpServerResolutionResult`
  - optional `selectedMcpServers?: McpServerId[]` on `SibuState`
- Add `SELECTABLE_MCP_SERVERS` to Workflow Target Planning with:
  - `id`: `github`
  - `name`: `GitHub MCP Server`
  - `description`: configure GitHub's official MCP server; prerequisites/auth are user-owned
  - `source`: `github/github-mcp-server` or equivalent catalog metadata if useful
- Add `resolveSelectableMcpServerById(serverId)` instead of overloading `resolveSelectableSkillById`.
- Validate `selectedMcpServers` in Workflow State Registry as a backward-compatible optional string array.

### GitHub MCP configuration shape

Use local Docker-based server launch config so Sibu never stores credentials and never owns provider authentication.

Shared launch intent:

```txt
command: docker
args: run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server
env/token source: user's GITHUB_PERSONAL_ACCESS_TOKEN environment variable, expressed in each agent's supported config syntax
```

This aligns with GitHub's local server guidance while keeping Docker, token creation, and auth outside Sibu's responsibility. Do not configure the remote hosted GitHub MCP server in MVP because OAuth/PAT header handling differs by host and would blur the “configure only, user owns auth” boundary.

### MCP targets and rendering

Extend target planning from “selected agents + skills” to “selected agents + skills + MCP servers.” Keep MCP targets separate from skill targets internally.

Recommended target model changes:

- Extend `WorkflowTarget` with optional target metadata such as:
  - `targetKind: 'agent-support' | 'skill' | 'mcp-config'`
  - `scope: 'project' | 'home'`
  - `managedKey` for state display/storage when the target is outside the project root
- Preserve current project-relative behavior for existing files.
- Add helpers:
  - `getSelectedMcpServersFromState(state)`
  - `getSelectedMcpTargetsForAgents(selectedAgents, selectedMcpServers)`

Agent config targets:

- **Codex**: update Sibu-owned `.codex/config.toml` to include GitHub MCP under Codex's `[mcp_servers.github]` TOML structure while preserving `model_instructions_file = "../AGENTS.md"`.
- **Claude**: add a project-scoped `.mcp.json` template using the standard `mcpServers` object.
- **Gemini**: add `.gemini/settings.json` using the `mcpServers` object supported by Gemini CLI project settings.

Do not support Windsurf MCP configuration in this feature. The MVP should avoid home-scoped MCP config files and only manage project/repo files for Codex, Claude, and Gemini.

Generated MCP config files are fully Sibu-owned while managed. `sibu mcp stop github` should regenerate managed MCP config from remaining selected MCP servers. If a generated MCP-only file has no remaining servers, mark it unmanaged and ask whether to keep/delete it. If the target file is also used for non-MCP agent support, such as Codex `.codex/config.toml`, keep managing the file and render it without the MCP section.

### Template catalog and manifest

Add MCP config templates under `templates/` and register them in `templates/manifest.json` with user-facing change notes.

Suggested template paths:

```txt
templates/.codex/config.toml              # existing template gains MCP rendering support
templates/mcp/claude/.mcp.json
templates/mcp/gemini/settings.json
```

Rendering should avoid string-splicing arbitrary JSON/TOML where possible. Prefer a small MCP config renderer in Template Catalog and Rendering that builds deterministic config objects/sections from selected MCP server definitions, then serializes stable JSON/TOML. If adding a TOML dependency is not worth it, keep Codex rendering as a tightly tested template section because the required shape is small.

### Project adoption

During `sibu init`:

- Ask for MCP servers after agent selection and before/near optional skill selections.
- Use Interactive Guidance to make the boundary explicit: Sibu configures selected MCP servers only; prerequisites/auth are user-owned.
- Pass selected MCP servers into target planning, rendering, and `writeSibuState`.
- Existing behavior is unchanged when no MCP server is selected.

### `sibu mcp` command lifecycle

Add a new command group through CLI Command Surface:

```txt
sibu mcp list
sibu mcp use <mcp_server_id>
sibu mcp stop <mcp_server_id>
```

Implement behavior in a new `src/modules/mcp-server-selection-management/` module. Mirror Skill Selection Management where behavior is analogous, but do not share skill-specific naming or architecture-skill rules.

- `list`: show available MCP servers and selected markers from `selectedMcpServers`.
- `use`: block when Workflow Mutation Readiness reports actionable drift; no-op if already selected; otherwise add MCP selection, render affected managed config files, and update state/hashes.
- `stop`: block on drift; no-op if not selected; otherwise remove MCP selection, regenerate or unmanage affected MCP config files, update hashes, and prompt keep/delete for MCP-only files that are no longer expected.
- Unknown MCP ids should say to run `sibu mcp list`.

### Sync and doctor behavior

Doctor and sync should remain generic:

- Workflow Health Diagnosis includes selected MCP targets in expected-target checks.
- Sync Review previews missing/modified/stale MCP config files through existing statuses.
- Local edits to managed MCP config files are hash drift, just like edited skill files.
- `sibu mcp use/stop` uses Workflow Mutation Readiness and must not try to resolve unrelated drift itself.

### Module boundaries

- **CLI Command Surface** owns only command definitions and dispatch for `sibu mcp`.
- **MCP Server Selection Management** owns list/use/stop orchestration and MCP lifecycle decisions.
- **Workflow Target Planning** owns the selectable MCP catalog and selected MCP target resolution.
- **Template Catalog and Rendering** owns MCP config rendering and manifest/template metadata.
- **Project Adoption** owns initial MCP selection wiring.
- **Workflow State Registry** owns selected MCP state validation and persistence semantics.
- **Sync Review / Workflow Health Diagnosis** consume selected MCP targets through generic drift mechanisms.
- **Interactive Guidance** owns MCP prompts and user-facing copy.
- **Workflow Mutation Readiness** owns clean-state preflight for targeted MCP mutations.

## Validation

- Unit tests:
- MCP catalog resolves `github` and rejects unknown ids with `sibu mcp list` guidance.
- state validation accepts missing `selectedMcpServers` and valid `['github']` arrays.
- target planning includes agent-specific MCP config targets for selected Codex, Claude, and Gemini agents.
  - project adoption passes selected MCP servers into target planning/rendering/state writing.
  - `sibu mcp list` shows GitHub and selected state.
  - `sibu mcp use github` creates/renders expected config, records state, and blocks on drift.
  - `sibu mcp stop github` removes selected MCP state, regenerates or unmanages config, and protects local edits.
  - doctor/sync detect missing, modified, and stale MCP config files via generic preview/diagnosis paths.
- Template validation:
  - `templates/manifest.json` includes new/changed MCP config templates and version bumps.
  - rendered JSON/TOML snapshots are stable and contain no real credentials.
- Runtime validation:
  - `pnpm run build`
  - `pnpm test`
  - `pnpm run validate:packed-runtime`
  - `sibu doctor`
- Manual smoke checks when practical:
  - temporary repo `sibu init` with GitHub MCP selected
  - `sibu mcp list`
  - `sibu mcp use github` no-op after already selected
  - edit a managed MCP config file and verify `sibu doctor`/`sibu sync` report drift

## Risks / Open Questions

- Windsurf MCP support is intentionally excluded for now. Revisit it only through a later feature/design update.
- Agent MCP config formats may change. Keep MCP config rendering isolated and covered by focused tests so template updates remain reviewable through sync.
- Codex, Claude, and Gemini do not use identical environment-variable syntax. Do not reuse one config blob across agents.
- The GitHub MCP server can expose powerful GitHub actions. Sibu should avoid enabling extra tool filters, auth flows, or live checks in MVP; users remain responsible for token scope and provider-side permissions.
