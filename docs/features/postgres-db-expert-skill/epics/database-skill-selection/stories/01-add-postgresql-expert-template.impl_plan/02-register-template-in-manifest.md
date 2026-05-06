# Step: Register PostgreSQL Expert template in manifest

## Goal

Make the new PostgreSQL Expert template visible to Sibu's template catalog and sync review by adding manifest metadata with user-facing change notes.

## Scope

- Update `templates/manifest.json` in the same change as the new template.
- Increment the global `templateVersion` by one from the current value.
- Add a `skills/postgresql-expert/SKILL.md` entry with version `1`.
- Write a concise description and current-version `changes` note that explains the new optional PostgreSQL Expert database skill template.
- Do not update existing template entries unless required by JSON formatting or validation.
- Do not add selectable catalog metadata here; that belongs to a later story.

## Files

- `templates/manifest.json`
- `templates/skills/postgresql-expert/SKILL.md`

## Done when

- `templates/manifest.json` contains `skills/postgresql-expert/SKILL.md`.
- The new manifest entry has version `1`, a user-facing description, and a user-facing change note.
- The global template version is incremented.
- Existing manifest entries are otherwise preserved.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:01:06-06:00
