# Step: Validate authoring export removal

## Goal

Run focused and full validation for removing export guidance from authoring templates.

## Scope

- Search authoring templates for removed export section headings and gate language.
- Run template catalog tests.
- Run the full test suite when practical.
- Fix failures directly caused by this story's changes.
- Stop and report unrelated or ambiguous failures.

## Files

- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/scrum-master-planner/SKILL.md`
- `src/modules/template-catalog-rendering/templates.test.ts`

## Done when

- Search confirms removed export sections are absent from authoring templates.
- Targeted template tests pass.
- Full test suite passes, or any failure is clearly reported with scope impact.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-19T13:32:30-06:00
