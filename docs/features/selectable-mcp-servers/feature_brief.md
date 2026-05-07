# Selectable MCP Servers Feature Brief

## Summary

Add selectable MCP server support to Sibu, starting with the official GitHub MCP Server (`github/github-mcp-server`). Users should be able to choose MCP servers during `sibu init` and manage them later with `sibu mcp list`, `sibu mcp use`, and `sibu mcp stop`. Sibu's role is intentionally narrow: configure selected MCP servers in the workflow files for supported agents, while users remain responsible for prerequisites, installation/runtime availability, credentials, and provider authentication. Generated MCP config files are Sibu-managed files: users can edit them, but Sibu will treat those edits as local drift that must be reviewed through doctor/sync before targeted MCP changes continue.

## Product Vision Fit

Sibu helps developers assemble a reliable AI-augmented workflow without turning the tool into an IDE, package manager, or external account manager. MCP servers fit that promise because they make agents more useful in real development workflows, but they also introduce setup and trust complexity. Keeping Sibu focused on safe configuration preserves user control: Sibu records what it manages, protects local edits, and leaves auth/runtime responsibility with the developer.

The feature reinforces Sibu's flexibility. Teams that want GitHub-aware agents can opt in; teams that do not use MCP or do not want provider integrations stay unchanged.

## Deep Module

- **CLI Command Surface**: owns the `sibu mcp list`, `sibu mcp use`, and `sibu mcp stop` command contracts and routing.
- **MCP Server Selection Management**: owns post-init MCP lifecycle behavior, selected MCP state changes, duplicate-selection no-ops, clean-workflow preflight, and MCP-specific managed-file lifecycle decisions.
- **Workflow Target Planning**: owns the selectable MCP server catalog and resolves selected MCP servers into expected agent config targets.
- **Template Catalog and Rendering**: owns MCP configuration templates and rendering selected MCP server config content.
- **Project Adoption**: includes optional MCP server selection during `sibu init` and records initial selected MCP servers.
- **Workflow State Registry**: records selected MCP servers and managed config file metadata.
- **Sync Review / Workflow Health Diagnosis**: preserve existing drift review and read-only health behavior for MCP-managed files.
- **Interactive Guidance**: owns prompt/list presentation for selecting and managing MCP servers.
- **Workflow Mutation Readiness**: blocks targeted MCP mutations when broader workflow drift needs sync review first.

## User / Customer Problem

Developers want agents to connect to useful project tools such as GitHub, but MCP setup is easy to make inconsistent across repos and agents. Without Sibu support, every team has to remember where each agent expects MCP configuration, how to keep those files aligned, and how to safely update or remove that configuration later.

## Business Goal

Make Sibu more useful as the setup and maintenance layer for AI-augmented development by adding a managed, opt-in path for MCP server configuration while preserving the product's lightweight, user-owned philosophy.

## Target User / Scenario

This is for solo engineers and teams that use Sibu-supported agents and want those agents configured with MCP servers. The first scenario is a GitHub-backed project where the user wants selected agents to know about the official GitHub MCP server, but wants to handle prerequisites and authentication outside Sibu.

## Proposed Experience

During `sibu init`, users can optionally select MCP servers alongside agents and other workflow options. If they select GitHub, Sibu creates or updates the managed agent configuration needed for the supported agents included in the MCP server MVP.

After initialization, users can manage MCP servers with a focused command group:

- `sibu mcp list` shows available MCP servers and selected state.
- `sibu mcp use <mcp_server_id>` adds a selected MCP server when the workflow is clean enough to mutate safely.
- `sibu mcp stop <mcp_server_id>` stops managing a selected MCP server and protects local edits the same way other managed workflow files are protected.

Sibu should be explicit that it configures MCP files only. It should own generated MCP config files entirely while they remain managed. If a user manually edits a managed MCP config file, doctor/sync should report local modification and `sibu mcp use/stop` should wait until the user reviews that drift. Sibu should not install MCP runtimes, check Docker/npm availability, configure `gh`, create tokens, or validate provider authentication.

## MVP Scope

- Add a selectable MCP server category.
- Add the official GitHub MCP Server (`github/github-mcp-server`) as the first selectable MCP server with id `github`.
- Support MCP server selection during `sibu init`.
- Add `sibu mcp list`, `sibu mcp use <mcp_server_id>`, and `sibu mcp stop <mcp_server_id>`.
- Configure selected MCP servers for Codex, Claude, and Gemini.
- Treat generated MCP config files as fully Sibu-managed files derived from selected MCP server state.
- Record selected MCP servers and managed config files in Sibu state.
- Preserve sync/doctor drift behavior for MCP-managed files.
- Keep Sibu's role to configuration only.

## Out of Scope

- Installing MCP servers or runtimes.
- Checking or installing Docker, npm, `gh`, or other prerequisites.
- Creating, storing, or validating credentials, tokens, or provider authentication.
- Testing live connectivity to GitHub or any MCP server.
- Supporting arbitrary custom MCP servers in the first version.
- Adding MCP servers beyond GitHub in the first version.
- Supporting Windsurf MCP configuration in the first version.
- Preserving arbitrary manual edits inside managed MCP config files during targeted MCP use/stop; users should review drift through sync or unmanage the file first.
- Turning Sibu into a general external-tool installer or account setup wizard.

## Success Signals

- A user can initialize a repo with the GitHub MCP server selected and see the expected agent config files managed by Sibu.
- A user can add and stop the GitHub MCP server after init through `sibu mcp use` and `sibu mcp stop`.
- `sibu mcp list` clearly shows GitHub and whether it is selected.
- Doctor and sync treat MCP-managed files consistently with other managed workflow files, including warning when a managed MCP config file has local edits.
- Users understand that Sibu configured MCP entries but did not install prerequisites or authenticate GitHub for them.

## Business-Level Acceptance Criteria

- GitHub appears as an optional selectable MCP server with id `github`, clear naming, and description.
- `sibu init` allows selecting MCP servers and records the selected GitHub MCP server when chosen.
- `sibu mcp list` shows available MCP servers and selected status.
- `sibu mcp use` can add GitHub MCP configuration after init without overwriting local edits silently.
- `sibu mcp stop` regenerates Sibu-managed MCP config from remaining selected MCP servers, or stops managing the generated config file when no selected MCP servers remain, while preserving local edit protection.
- Sibu configures selected MCP servers for Codex, Claude, and Gemini.
- Sibu does not install prerequisites, manage credentials, or validate external authentication.

## Risks / Tradeoffs

- MCP config formats may differ across agents, so even the initial Codex, Claude, and Gemini support should keep agent-specific rendering isolated and reviewable.
- Provider docs and recommended MCP launch commands may change over time; Sibu should keep config templates easy to update through sync.
- Users may expect Sibu to handle authentication because it configures GitHub MCP; copy must clearly state that prerequisites and auth remain user-owned.
- Agent config files can be sensitive or locally customized; local edit protection must stay strict. Targeted MCP changes should be blocked when managed MCP config files have unresolved local edits.

## Open Questions

- None currently.
