# Step: Update local architecture skill copies

## Goal

Keep repository-local installed architecture skill copies aligned with the updated Deep Module architecture templates where those local copies exist.

## Scope

- Update `.agents/skills/command-pattern/SKILL.md` to match the new command-pattern template guidance.
- If `.agents/skills/ddd-hexagonal/SKILL.md` exists, update it to match the new DDD + Hexagonal template guidance.
- If no local DDD + Hexagonal copy exists, do not create one just for this story.
- Do not update unrelated local skills.

## Files

- `.agents/skills/command-pattern/SKILL.md`
- `.agents/skills/ddd-hexagonal/SKILL.md`
- `templates/skills/architecture/command-pattern/SKILL.md`
- `templates/skills/architecture/ddd-hexagonal/SKILL.md`

## Done when

- The local command-pattern skill copy uses Deep Module compatibility language and the approved module-first path shape.
- The local DDD + Hexagonal skill copy is updated only if it already exists.
- No unrelated local skill files are changed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:40:54-06:00
