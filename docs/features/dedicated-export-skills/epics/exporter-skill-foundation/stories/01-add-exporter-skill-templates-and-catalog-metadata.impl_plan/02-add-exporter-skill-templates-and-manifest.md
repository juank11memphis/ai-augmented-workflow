# Step: Add exporter skill templates and manifest entries

## Goal

Create the two dedicated exporter skill templates and register them in the template manifest with user-facing change notes.

## Scope

- Add `templates/skills/export-to-github/SKILL.md` with feature-name-driven GitHub export guidance for Epics and User Stories.
- Add `templates/skills/export-to-notion/SKILL.md` with feature-name-driven Notion export guidance for feature brief, UX design, and technical design files only.
- Update `templates/manifest.json` with entries for both templates and bump the global template version.
- Add template tests proving both templates are registered, readable, and contain the required guidance.
- Do not remove export guidance from authoring skills in this story.

## Files

- `templates/skills/export-to-github/SKILL.md`
- `templates/skills/export-to-notion/SKILL.md`
- `templates/manifest.json`
- `src/modules/template-catalog-rendering/templates.test.ts`

## Done when

- Both exporter templates exist and are registered in `templates/manifest.json`.
- `export-to-github` guidance accepts a feature name and covers exporting Epics and User Stories to GitHub.
- `export-to-notion` guidance accepts a feature name and covers only feature brief, UX design, and technical design export to Notion.
- Template tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-19T13:28:59-06:00
