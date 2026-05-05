# Step: Update product vision and UX boundary language

## Goal

Remove Product Context Map boundary wording from adjacent pipeline skills that only mention the artifact as a downstream or prohibited artifact.

## Scope

- Update `templates/skills/product-vision-writer/SKILL.md` to refer to Deep Module Map as the downstream artifact.
- Update `templates/skills/ux-expert/SKILL.md` to say it must not create or update Deep Module Maps.
- Update matching local copies where present.
- Keep changes limited to boundary/routing language; do not change those skills' core workflows.

## Files

- `templates/skills/product-vision-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `.agents/skills/product-vision-writer/SKILL.md`
- `.agents/skills/ux-expert/SKILL.md`

## Done when

- Product vision and UX skill guidance no longer mentions Product Context Maps as active artifacts.
- Local copies are updated where they exist.
- No unrelated skill behavior is changed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:56:43-06:00
