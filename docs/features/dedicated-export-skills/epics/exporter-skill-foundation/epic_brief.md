# Exporter Skill Foundation Epic Brief

## Summary

Create the dedicated exporter skill artifacts and catalog foundation that let Sibu treat GitHub and Notion export as focused workflow skills instead of behavior embedded in authoring skills.

## Source Context

- Feature brief: `../../feature_brief.md`
- Technical design: `../../technical_design.md`

## Scope

- Add `export-to-github` and `export-to-notion` as selectable workflow skills.
- Add exporter skill templates for GitHub and Notion export workflows.
- Add catalog-level MCP/export-skill relationship helpers.
- Remove destination-specific export guidance from authoring skill templates.
- Update template manifest metadata for new and changed templates.

## Out of Scope

- Implementing the `sibu init`, `sibu mcp use`, `sibu skills use`, or `sibu sync` selection-flow behavior.
- Validating external GitHub or Notion authentication.
- Automatically exporting any artifacts.

## User Stories

- [Add exporter skill templates and catalog metadata](./stories/01-add-exporter-skill-templates-and-catalog-metadata.md)
- [Move export guidance out of authoring skills](./stories/02-move-export-guidance-out-of-authoring-skills.md)

## Acceptance Criteria

- `export-to-github` and `export-to-notion` exist as selectable workflow skills.
- Exporter skill templates define the feature-name-driven GitHub and Notion export workflows from the technical design.
- Catalog helpers expose the relationship between GitHub/Notion MCP servers and their matching exporter skills.
- Authoring skills no longer own GitHub or Notion export gates or optional export sections.
- `templates/manifest.json` includes new exporter templates and accurate change notes for all changed templates.

## Dependencies / Risks

- Template changes must follow `sibu-template-change` so existing projects see clear sync notes.
- Removing export guidance before exporter skills exist would create a discoverability gap, so the exporter templates and catalog metadata should land first.
