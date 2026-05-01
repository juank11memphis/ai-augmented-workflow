# Step: Run lifecycle validation

## Goal

Run automated and practical lifecycle checks that prove the story is complete across build output, tests, and a temporary initialized project when feasible.

## Scope

- Run the repository validation commands after code and test changes.
- When practical, create a temporary project and run `sibu init`, `sibu doctor`, and `sibu sync` or the local built CLI equivalents.
- In the temp project, confirm `.agents/skills/product-context-map-writer/SKILL.md` is installed and recorded in `.sibu/state.json`.
- In the temp project, confirm `docs/product-context-map.md` is not created by `sibu init` and is not recorded in `.sibu/state.json`.
- Remove or modify the installed skill in the temp project and confirm `sibu doctor` reports normal managed-file drift.
- Do not keep temporary lifecycle artifacts in the repository.

## Files

- `package.json`
- `bin/sibu.js`
- `.sibu/state.json`
- `.agents/skills/product-context-map-writer/SKILL.md`
- `docs/product-context-map.md`

## Done when

- `pnpm build` passes.
- `pnpm check` passes.
- `pnpm test` or `pnpm verify` passes.
- Manual temp-project lifecycle check is completed when practical, or any skipped manual check is documented with the reason.
- The story acceptance criteria are all covered by automated tests, manual lifecycle notes, or both.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-01T13:44:22-06:00
