# Step: Cover managed target and state registration

## Goal

Add focused tests proving the required skill appears as a normal managed workflow target for supported agents and is recorded in Sibu state when installed.

## Scope

- Update workflow target tests to assert `.agents/skills/product-context-map-writer/SKILL.md` is included for supported agents through mandatory skills.
- Add or keep an assertion that `docs/product-context-map.md` is not included in workflow targets.
- Extend the state-writing test to render installed workflow files and assert `.sibu/state.json` records `.agents/skills/product-context-map-writer/SKILL.md` as a managed file with the skill template path.
- Keep coverage focused on lifecycle registration; do not test Product Context Map content generation.
- If compiled tests live under `bin/**`, regenerate them with `pnpm build` instead of editing generated JavaScript by hand.

## Files

- `src/shared/workflow-targets.test.ts`
- `bin/shared/workflow-targets.test.js`

## Done when

- Tests show the installed Product Context Map writer skill target is included for supported agents.
- Tests show Sibu state records `.agents/skills/product-context-map-writer/SKILL.md` as a managed file when present.
- Tests show `docs/product-context-map.md` remains outside workflow targets.
- `pnpm build` and `pnpm test` include the updated workflow target coverage.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-01T13:33:17-06:00
