# Step: Update skill template manifest metadata

## Goal

Keep template metadata consistent with every changed skill template so `sibu sync` can explain the targeted skill-guidance updates.

## Scope

- Update `templates/manifest.json` for each skill template changed in this story.
- Bump the global `templateVersion` once for the template set change.
- Bump each changed skill template's `version` once.
- Replace each changed skill template's `changes` entries with concise user-facing notes for the new version only.
- Preserve unchanged template entries, paths, descriptions, versions, and change notes.
- Do not edit generated project files or add unrelated manifest changes.

## Files

- `templates/manifest.json`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `docs/features/token-conscious-ai-workflow/epics/context-budget-discipline/stories/03-tune-skill-guidance-and-validate-template-updates.md`

## Done when

- `templates/manifest.json` has a bumped global `templateVersion` relative to the pre-story value.
- Every skill template changed in this story has a bumped `version` and current user-facing `changes` note.
- No unchanged template entry is modified.
- Manifest metadata reflects all and only the template changes made by this story.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-29T18:50:36-06:00
