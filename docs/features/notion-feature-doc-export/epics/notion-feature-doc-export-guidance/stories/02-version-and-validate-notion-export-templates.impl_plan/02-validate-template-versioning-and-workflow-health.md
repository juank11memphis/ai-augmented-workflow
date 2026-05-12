# Step: Validate template versioning and workflow health

## Goal

Validate the final template metadata story and confirm changed templates/local copies remain intentional and understandable.

## Scope

- Run repository validation.
- Run Sibu workflow health check.
- Manually review manifest entries for changed templates and sync-facing notes.
- Confirm local installed skill copies remain aligned with changed templates where present.
- Do not publish a release.

## Files

- `templates/manifest.json`
- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `.agents/skills/feature-brief-writer/SKILL.md`
- `.agents/skills/technical-design-writer/SKILL.md`

## Done when

- `pnpm verify` passes.
- `sibu doctor` reports healthy or only intentional local workflow-copy drift is explicitly understood.
- Manifest changed-template entries are clear and current.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:58:08Z
