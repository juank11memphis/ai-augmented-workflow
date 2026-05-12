# Notion Feature Doc Export Feature Brief

## Summary

Sibu should let users export generated feature-level planning docs to Notion while keeping local Markdown files as the canonical workflow artifacts. The MVP adds Notion as a selectable MCP server and, when configured with a stored Notion parent page, lets the feature brief, technical design, and UX design stages offer a create-only Notion export immediately after each local document is generated.

## Product Vision Fit

This feature supports Sibu's promise to turn scattered AI-assisted workflow pieces into a reliable, practical development loop. Many users want planning docs to live where teammates already read product and design work, but Sibu should not give up its repo-grounded, version-controlled workflow to do that.

The feature preserves user control: Sibu always writes local docs first, asks before exporting to Notion, uses a user-selected parent page, and treats Notion as a convenience destination rather than a source of truth or sync engine. It also fits Sibu's MCP direction by making Notion a first-class selectable MCP integration alongside GitHub instead of relying on ad hoc agent setup.

## Deep Module

- **MCP Server Selection Management**: owns making Notion selectable during `sibu init` and through post-init MCP lifecycle commands, including collecting and storing the Notion parent page destination.
- **Workflow State Registry**: owns recording selected MCP servers and the configured Notion docs parent page in Sibu state.
- **Workflow Target Planning**: owns recognizing Notion as a selectable MCP server and determining any managed MCP config targets needed for selected agents.
- **Template Catalog and Rendering**: owns the generated MCP config templates and the pipeline skill template updates that teach agents when and how to offer Notion export.
- **Sync Review** and **Workflow Health Diagnosis**: support this feature by continuing to detect drift in managed MCP config files and state-driven workflow targets.

No new Deep Module is needed. The feature extends existing MCP selection, state, template, and pipeline guidance responsibilities.

## User / Customer Problem

Sibu-generated feature docs currently live in the current repository. That is good for version control and agent handoffs, but some teams discuss and review product/design docs in Notion. Without an export path, users have to manually copy feature briefs, technical designs, and UX specs into Notion after each stage.

Users need a lightweight bridge from Sibu's repo-first planning workflow to Notion without turning Notion into the canonical workflow store or adding a complex synchronization model.

## Business Goal

Increase the usefulness of Sibu's planning pipeline for teams that use Notion for shared documentation, while preserving Sibu's trust model: local files remain canonical, external mutations are explicit, and credentials/workspace access remain user-owned through MCP configuration.

## Target User / Scenario

This feature is for solo engineers and teams who use Sibu's AI development pipeline and also keep product, design, or planning docs in Notion.

The target scenario is:

1. The user selects Notion MCP during `sibu init` or later with `sibu mcp use notion`.
2. Sibu asks for a Notion parent page to use as the docs destination and stores it in Sibu state.
3. The user asks a pipeline skill to create a feature brief, technical design, or UX design.
4. The skill writes the local Markdown file as usual.
5. If Notion MCP is available and the Notion parent page is configured, the skill asks whether to export the newly generated doc to Notion.
6. If the user accepts, the skill creates Notion pages under the configured destination using a repo → feature → document organization.

## Proposed Experience

Sibu adds Notion MCP as a selectable MCP server. Users can select it during init or add it later with `sibu mcp use notion`. When Notion is selected, Sibu asks for a Notion parent page that the configured MCP server can access. This parent page is the user's **Notion docs destination page**.

Sibu does not ask users to select a Notion workspace. Workspace and permission access are determined by the user's Notion MCP authentication and Notion integration permissions. Sibu only stores the destination parent page reference needed for exports.

After each supported pipeline doc is created locally, the responsible skill checks whether Notion export is available:

- Notion MCP is selected/configured for the project.
- A Notion docs destination parent page is stored in Sibu state.
- The agent has callable Notion MCP capabilities in the current session.

If export is unavailable, the skill ends normally after reporting the local file path.

If export is available, the skill asks a concise opt-in question such as:

> Notion export is available. Export this document to the configured Notion docs page?

If the user declines, nothing else happens. If the user accepts, the skill creates or reuses an organization shape like:

```txt
<Configured Notion docs destination page>
└── <Repo Name>
    └── Features
        └── <Feature Name>
            ├── Feature Brief
            ├── Technical Design
            └── UX Design
```

Each exported Sibu artifact becomes a Notion child page under the relevant feature page. Local Markdown remains unchanged and remains the source of truth for downstream Sibu pipeline stages.

## MVP Scope

- Add Notion as a first-class selectable MCP server with id `notion`.
- Show Notion in `sibu mcp list`.
- Allow Notion selection during `sibu init`.
- Allow post-init Notion selection with `sibu mcp use notion`.
- Allow post-init Notion removal with `sibu mcp stop notion`.
- When selecting Notion, ask once for a Notion docs destination parent page and store it in Sibu state.
- Treat Notion authentication, workspace access, integration installation, and page permissions as user-owned through the Notion MCP server.
- Always write supported docs to local Markdown first.
- Offer Notion export after each generated supported doc when Notion MCP is selected, a parent page is configured, and Notion MCP tools are available to the agent.
- Support Notion export for:
  - feature briefs
  - technical designs
  - UX designs
- Organize exported pages under the configured parent page by repo, then feature, then document type.
- Make Notion export create-only or create/reuse-container-only for MVP: container pages may be reused for organization, but exported document pages should not become a bidirectional sync mechanism.
- Report the created Notion page or a clear failure after an attempted export.
- Update user-facing README documentation for Notion MCP setup, including what Sibu configures and what remains user-owned.

## Out of Scope

- Making Notion the canonical destination for Sibu pipeline artifacts.
- Skipping local Markdown file creation.
- Exporting Epics or User Stories to Notion in the MVP.
- Exporting implementation plans to Notion.
- Bidirectional sync between Markdown and Notion.
- Updating existing Notion document pages as an ongoing sync behavior.
- Importing Notion docs back into the repo.
- Selecting or managing Notion workspaces inside Sibu.
- Managing Notion authentication, integration installation, credentials, or permissions.
- Supporting arbitrary custom Notion schemas or databases.
- Letting users choose a different Notion destination per document in the MVP.
- Tracking Notion page IDs inside generated Markdown docs.
- Turning Sibu into a general Notion knowledge-base manager.
- Documenting provider-specific Notion setup beyond the minimum Sibu needs users to understand: MCP auth/workspace access, page permissions, and destination parent page selection.

## Success Signals

- Users can select Notion MCP during init or with `sibu mcp use notion`.
- Users configure a Notion docs destination parent page once and do not have to repeat it for every document.
- Feature briefs, technical designs, and UX docs continue to be saved locally first.
- When Notion export is available, users receive an explicit opt-in prompt after each supported doc is generated.
- Users can decline Notion export without any Notion mutation.
- Accepted exports create understandable Notion pages under the configured parent page.
- Downstream Sibu pipeline stages continue to rely on local Markdown artifacts.
- Failures are clear when Notion MCP tools, permissions, or the configured parent page are unavailable.

## Business-Level Acceptance Criteria

- Given a user runs `sibu init`, when MCP server selection is shown, then Notion is available as a selectable MCP server.
- Given a user runs `sibu mcp list`, then Notion appears with clear user-facing guidance that auth and permissions are user-owned.
- Given a user selects Notion during init or with `sibu mcp use notion`, then Sibu asks for a Notion docs destination parent page and stores it in Sibu state.
- Given Notion is not selected or no Notion parent page is configured, when a supported doc is generated, then the skill writes only the local Markdown file and does not offer Notion export.
- Given Notion is selected, a parent page is configured, and Notion MCP tools are available, when a supported doc is generated, then the skill asks whether to export that doc to Notion.
- Given the user declines export, then no Notion page is created or modified.
- Given the user accepts export for a feature brief, technical design, or UX design, then a Notion page is created under the configured parent page using repo → feature → document organization.
- Given Notion export succeeds, then the skill reports the created Notion page reference.
- Given Notion export fails because of missing tools, permissions, or inaccessible parent page, then the skill reports a clear failure and the local Markdown file remains the completed artifact.
- Given a downstream pipeline stage runs after export, then it continues to use the local Markdown artifact as its source of truth.
- Given a user reads the README, then Notion MCP setup explains that Sibu writes config and stores the destination parent page, but does not manage Notion auth, workspace access, integration permissions, OAuth login, or live connectivity.

## Risks / Tradeoffs

- Notion MCP server capabilities may vary by agent environment, so the guidance must be clear about graceful fallback when tools are unavailable.
- Storing a Notion parent page in Sibu state adds provider-specific configuration to the workflow state model; the shape should stay simple and extensible.
- Create-only export avoids sync complexity, but users may expect later edits in Markdown to update Notion automatically.
- Reusing repo and feature container pages improves organization, but matching existing pages by title could be imperfect.
- Asking after each document preserves user control, but frequent prompts could feel repetitive for users who always want export.
