# Notion Feature Doc Export Guidance Epic Brief

## Summary

Teach Sibu's feature-level doc-writing skills to offer Notion export after each supported document is saved locally. The result is a repo-first pipeline that can optionally create Notion pages for feature briefs, technical designs, and UX specs when Notion MCP is configured and available.

## Source Context

- Feature brief: `../../feature_brief.md`
- Technical design: `../../technical_design.md`

## Scope

- Update feature brief, technical design, and UX skill templates with post-write Notion export guidance.
- Keep local Markdown as the source of truth and require it to be written before any Notion action.
- Add checks for selected Notion MCP, configured parent page, and available Notion MCP tools before offering export.
- Describe the Notion organization shape by parent page → repo → Features → feature → document.
- Update template manifest metadata and local skill copies where applicable.

## Out of Scope

- Exporting Epics, User Stories, or implementation plans to Notion.
- Runtime CLI code that creates Notion pages.
- Updating existing Notion document pages as sync.
- Writing Notion page URLs back into local Markdown artifacts.

## User Stories

- [Add Notion export guidance to feature doc skills](./stories/01-add-notion-export-guidance-to-feature-doc-skills.md)
- [Version and validate Notion export templates](./stories/02-version-and-validate-notion-export-templates.md)

## Acceptance Criteria

- Supported doc-writing skills always save local Markdown before Notion export is considered.
- Supported skills offer Notion export only when Notion is selected, a parent page is configured, and Notion MCP tools are available.
- Declining or lacking Notion export leaves only the local artifact.
- Accepted exports create Notion document pages under the configured repo/feature organization guidance.
- Changed templates have manifest version bumps and user-facing change notes.

## Dependencies / Risks

- The exact Notion MCP tool names are agent-dependent, so skills should describe operations and availability checks rather than hard-code tool names.
- Reusing existing Notion container pages may be imperfect; MVP should allow clear creation behavior without promising sync.
