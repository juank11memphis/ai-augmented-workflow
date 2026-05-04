# Step: Validate architecture context compatibility

## Goal

Verify that the architecture skill updates satisfy the story without introducing template or TypeScript build regressions.

## Scope

- Review the changed architecture skill templates for concise, non-duplicative Product Context guidance.
- Confirm every acceptance criterion in `02-make-architecture-skills-context-compatible.md` is covered by the template changes.
- Run repository validation commands required by the story.
- If validation reveals that implementation must change source TypeScript or generated `bin/**` parity, stop and ask because that exceeds the expected architecture-skill template scope for this story.

## Files

- `templates/skills/architecture/ddd-hexagonal/SKILL.md`
- `templates/skills/architecture/command-pattern/SKILL.md`
- `templates/manifest.json`
- `package.json`

## Done when

- Manual review confirms DDD + Hexagonal guidance respects Product Context boundaries and routes new-context decisions back to the map workflow.
- Manual review confirms Command Pattern guidance places vertical slices within or clearly under Product Context ownership and routes new-context decisions back to the map workflow.
- Manual review confirms both updates are concise and do not duplicate downstream planning instructions.
- `pnpm build` passes.
- `pnpm check` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:15:37Z
