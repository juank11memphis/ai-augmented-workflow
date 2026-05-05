# Step: Update local workflow copies for the current repository

## Goal

Keep this repository's installed workflow files aligned with the new Deep Module Map routing introduced in the managed templates.

## Scope

- Add `.agents/skills/deep-module-map-writer/SKILL.md` from the new template content.
- Delete `.agents/skills/product-context-map-writer/SKILL.md`.
- Update root `AGENTS.md` routing language to match `templates/AGENTS.md` for the Deep Module Map stage.
- Keep this step limited to the first-story routing and writer-skill change; do not rewrite downstream skills yet.
- Do not manually edit `.sibu/state.json` unless implementation discovers a required reason and the user explicitly approves it.

## Files

- `.agents/skills/deep-module-map-writer/SKILL.md`
- `.agents/skills/product-context-map-writer/SKILL.md`
- `AGENTS.md`
- `templates/AGENTS.md`

## Done when

- The local `.agents/skills` folder contains `deep-module-map-writer` and no `product-context-map-writer` skill file.
- Root `AGENTS.md` routes Deep Module Map requests to `deep-module-map-writer`.
- Root `AGENTS.md` no longer routes active workflow requests to `product-context-map-writer`.
- No downstream skill files are changed as part of this step unless required to keep local routing coherent.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-05T14:30:45-06:00
