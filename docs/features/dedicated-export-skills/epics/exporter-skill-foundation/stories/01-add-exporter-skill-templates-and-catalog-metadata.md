# Add Exporter Skill Templates and Catalog Metadata

## Epic
[Exporter Skill Foundation](../epic_brief.md)

## User Story
As a Sibu adopter, I want dedicated GitHub and Notion exporter skills to exist in the workflow catalog, so that export behavior can be selected and maintained separately from authoring skills.

## Context

The feature brief defines `export-to-github` and `export-to-notion` as focused exporter skills. The technical design places the skill definitions, target mappings, and MCP/export relationship metadata in Workflow Target Planning and Template Catalog and Rendering.

## Scope

- Add `export-to-github` and `export-to-notion` to the selectable workflow skill model.
- Add templates at `templates/skills/export-to-github/SKILL.md` and `templates/skills/export-to-notion/SKILL.md`.
- Define normal target mappings for all currently feasible supported agent targets.
- Add catalog helpers for:
  - MCP servers implied by exporter workflow skills.
  - exporter workflow skills implied by MCP servers.
- Update template manifest entries for the new templates.
- Add tests proving the skills resolve, targets are planned, and catalog relationships are correct.

## Out of Scope

- Changing `sibu init`, `sibu mcp use`, `sibu skills use`, or `sibu sync` behavior.
- Removing existing export sections from authoring templates.
- Creating or updating any GitHub or Notion pages/issues.

## Acceptance Criteria

- `export-to-github` resolves as a workflow skill.
- `export-to-notion` resolves as a workflow skill.
- Workflow target planning can produce exporter skill files for supported agent targets.
- Catalog helpers identify GitHub MCP as paired with `export-to-github` and Notion MCP as paired with `export-to-notion`.
- `export-to-github` guidance accepts a feature name and covers exporting Epics and User Stories to GitHub.
- `export-to-notion` guidance accepts a feature name and covers exporting only feature brief, UX design, and technical design files to Notion.
- `templates/manifest.json` contains entries for both new templates.

## Validation

- Run targeted catalog and workflow target tests.
- Run template/manifest tests.
- Run `pnpm run test`.
