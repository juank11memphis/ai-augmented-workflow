# Step: Validate implementation context preservation

## Goal

Verify that the implementation planner and executor skill updates satisfy the story without introducing template or TypeScript build regressions.

## Scope

- Review the changed implementation skill templates for concise, non-duplicative Product Context guidance.
- Confirm every acceptance criterion in `02-preserve-contexts-during-implementation.md` is covered by the template changes.
- Run repository validation commands required by the story.
- If validation reveals that implementation must change source TypeScript or generated `bin/**` parity, stop and ask because that exceeds the expected implementation-skill template scope for this story.

## Files

- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/manifest.json`
- `package.json`

## Done when

- Manual review confirms planner instructions require reading and applying Product Context guidance when present.
- Manual review confirms generated step guidance must preserve approved context boundaries and call out explicit cross-context work.
- Manual review confirms executor instructions prevent silent movement into unrelated contexts unless justified by the approved step or technical design.
- Manual review confirms context guidance remains concise and does not duplicate the full Product Context Map concept.
- `pnpm build` passes.
- `pnpm check` passes.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-04T16:33:23Z
