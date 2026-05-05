# Step: Update manifest and validate architecture guidance

## Goal

Record the architecture template changes in the template manifest and validate that active architecture guidance no longer uses Product Context Map terminology.

## Scope

- Update `templates/manifest.json` by bumping the global template version.
- Bump `skills/architecture/command-pattern/SKILL.md` and `skills/architecture/ddd-hexagonal/SKILL.md` template versions.
- Replace the changed architecture templates' `changes` notes with current-version user-facing notes about Deep Module guidance.
- Search architecture skill templates and local architecture copies for old Product Context terminology.
- Run focused validation commands where practical.
- Do not fix downstream pipeline skills in this step; they belong to the separate pipeline story.

## Files

- `templates/manifest.json`
- `templates/skills/architecture/command-pattern/SKILL.md`
- `templates/skills/architecture/ddd-hexagonal/SKILL.md`
- `.agents/skills/command-pattern/SKILL.md`
- `.agents/skills/ddd-hexagonal/SKILL.md`

## Done when

- Manifest versions and change notes are updated for both architecture templates.
- A search confirms architecture templates and local architecture copies no longer use active Product Context Map terminology.
- Path examples match `/src/modules/<module-slug>/<feature-slice>/...` for command-pattern and `/src/modules/<module-slug>/domain|application|infra` for DDD + Hexagonal.
- `pnpm verify` is run, or any failure is documented with a clear follow-up reason.
- `sibu doctor` is run, or any known workflow drift is documented for follow-up.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:41:51-06:00
