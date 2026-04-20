# Step: Validate the Windsurf workflow loop

## Goal

Run automated and smoke validation proving a fresh repo can select Windsurf with the other supported agents and that `doctor` and `sync` handle the resulting workflow state.

## Scope

- Run the required automated validation commands.
- Smoke test a fresh repo selecting Codex, Claude, Gemini, and Windsurf through `ekko init` or an equivalent scripted initialization using the same catalog and target/state writers when interactive automation is impractical.
- Smoke test `ekko doctor` against the Windsurf-selected repo and confirm it does not reject `windsurf`.
- Smoke test `ekko sync` against the Windsurf-selected repo and confirm it does not expect a Windsurf-specific support file.
- Confirm generated/managed files include common `AGENTS.md`, existing agent files for Codex/Claude/Gemini, and shared `.agents/skills/` files, but no `.windsurf/skills` files.
- Do not add product scope beyond validation fixes required to satisfy the story.

## Files

- package.json
- bin/ekko.js
- src/shared/catalog.test.ts
- src/shared/workflow-targets.test.ts
- src/shared/workflow-mutation-readiness.test.ts
- AGENTS.md
- .ekko/state.json
- .agents/skills/<skill>/SKILL.md

## Done when

- `pnpm build` passes.
- `pnpm check` passes.
- `pnpm test` passes.
- The fresh-repo Windsurf smoke test records `windsurf` in `.ekko/state.json` with Codex, Claude, and Gemini.
- `ekko doctor` passes for the Windsurf-selected repo.
- `ekko sync` does not report a missing Windsurf-specific file.
- The validation output or final implementation notes explicitly confirm no `.windsurf/skills` files were generated.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-20T02:43:14Z
