# Step: Validate Notion export guidance

## Goal

Validate the template guidance changes and review them for scope boundaries.

## Scope

- Run repository validation.
- Run Sibu workflow health check.
- Manually review changed guidance for accidental claims that Notion is canonical, required, synced, or handled by Sibu runtime code.
- Confirm no CLI/runtime Notion export implementation was added.
- Do not update manifest metadata in this story; that belongs to the next story.

## Files

- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `.agents/skills/feature-brief-writer/SKILL.md`
- `.agents/skills/technical-design-writer/SKILL.md`
- `.agents/skills/ux-expert/SKILL.md` if present

## Done when

- `pnpm verify` passes.
- `sibu doctor` reports a healthy workflow or any drift is explicitly understood before continuing.
- Story acceptance criteria are satisfied by template/local guidance.
## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-12T00:56:55Z
