# Step: Validate the first-story template state

## Goal

Verify that the new Deep Module Map writer and routing are present, the old Product Context Map writer is gone from active templates, and the changed template metadata remains valid.

## Scope

- Search active templates and local routing files for `product-context-map-writer` and confirm no active first-story references remain.
- Confirm `templates/manifest.json` includes the new skill entry and no old writer entry.
- Run repository validation commands from the technical design where practical.
- Capture any remaining Product Context Map references as expected downstream work only if they are in skills intentionally reserved for later stories.
- Do not fix downstream pipeline or architecture skill references in this validation step unless they directly break the first story's acceptance criteria.

## Files

- `templates/manifest.json`
- `templates/AGENTS.md`
- `AGENTS.md`
- `templates/skills/deep-module-map-writer/SKILL.md`
- `.agents/skills/deep-module-map-writer/SKILL.md`

## Done when

- A search confirms `product-context-map-writer` is absent from active routing and manifest files changed by this story.
- `pnpm verify` passes, or any failure is documented with a clear follow-up reason.
- `sibu doctor` runs and its result is documented for the user.
- The story acceptance criteria are satisfied without implementing downstream skill updates from later stories.
