# Add Notion Export Guidance to Feature Doc Skills

## Epic
[Notion Feature Doc Export Guidance](../epic_brief.md)

## User Story
As a Sibu pipeline user, I want feature docs to offer Notion export after they are saved locally, so that I can share planning documents in Notion without losing the repo as the source of truth.

## Context

The MVP supports Notion export for feature briefs, technical designs, and UX designs only. The technical design keeps export as template/agent guidance rather than Sibu runtime code.

## Scope

- Update `feature-brief-writer` template guidance to offer Notion export after writing `feature_brief.md`.
- Update `technical-design-writer` template guidance to offer Notion export after writing `technical_design.md`.
- Update `ux-expert` template guidance to offer Notion export after writing `ux.md`.
- Require each skill to read `.sibu/state.json` only after the local artifact is complete.
- Require export to be offered only when Notion is selected, `mcpServerConfigs.notion.docsParentPage` exists, and Notion MCP tools are available.
- Require explicit user opt-in before any Notion mutation.
- Describe repo → Features → feature → document organization under the configured parent page.
- Keep local Markdown unchanged and canonical after export.
- Update local `.agents/skills` copies where matching mandatory/current repo skills exist.

## Out of Scope

- Implementing Notion MCP tool calls in CLI code.
- Exporting Epics, User Stories, or implementation plans.
- Updating existing Notion document pages as sync.
- Writing Notion URLs into local Markdown files.

## Acceptance Criteria

- Each supported skill says local Markdown must be written before Notion export is considered.
- Each supported skill checks selected Notion state, configured parent page, and current-session Notion MCP tool availability before offering export.
- Each supported skill asks for explicit opt-in before creating Notion pages.
- Each supported skill treats unavailable or declined export as a normal local-only completion.
- Each supported skill reports a clear Notion export success or failure when export is attempted.
- Guidance does not imply Notion is canonical or required for downstream pipeline stages.

## Validation

- Manual template review for `feature-brief-writer`, `technical-design-writer`, and `ux-expert`.
- Template tests or grep-style checks if existing test patterns support them.
- `pnpm verify`
