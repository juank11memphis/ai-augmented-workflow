# Step: Register product context map writer as mandatory

## Goal

Wire `product-context-map-writer` into Sibu’s mandatory skill catalog so it is installed for every supported agent through the existing workflow target system.

## Scope

- Add `product-context-map-writer` to `MANDATORY_SKILLS` in `src/shared/catalog.ts`.
- Use `templates/skills/product-context-map-writer/SKILL.md` as the template path.
- Use `.agents/skills/product-context-map-writer/SKILL.md` as the target path for Codex, Gemini, Claude, and Windsurf.
- Do not add a selectable skill ID or workflow-skill option; this is required, not optional.
- Do not add `docs/product-context-map.md` to `getWorkflowTargets()` or any managed target list.

## Files

- `src/shared/catalog.ts`
- `bin/shared/catalog.js`

## Done when

- The mandatory skill catalog includes `product-context-map-writer` for Codex, Gemini, Claude, and Windsurf.
- `getWorkflowTargets()` includes `.agents/skills/product-context-map-writer/SKILL.md` through existing mandatory skill behavior.
- No source or generated file registers `docs/product-context-map.md` as a managed workflow target.
- `pnpm build` regenerates `bin/shared/catalog.js` from the TypeScript source.
