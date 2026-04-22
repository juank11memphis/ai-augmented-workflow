# Step: Preflight skill application before writing

## Goal

Make the selected-skill application path prove every touched file is safe before creating the skill file, refreshing `AGENTS.md`, or updating `.sibu/state.json`.

## Scope

- Keep all mutation preflight checks inside the `skills use` feature slice after clean readiness and before any `fs.writeFileSync` call.
- Refuse when the would-be-created selected skill target already exists but is not recorded for this selection.
- Refuse when `AGENTS.md` is missing, not recorded in state, or has a current hash different from the recorded hash.
- Return concise failure output that points to `sibu sync` for workflow drift cleanup.
- Do not overwrite existing skill files, silently adopt unrecorded files, partially update state, or attempt rollback after writing.

## Files

- src/features/use-skill/handler.ts
- src/features/use-skill/handler.test.ts
- src/shared/hash.ts
- src/shared/workflow-targets.ts
- AGENTS.md
- .sibu/state.json
- .agents/skills/<selected-skill>/SKILL.md

## Done when

- For a clean repo with an unrecorded existing `.agents/skills/typescript/SKILL.md`, `sibu skills use typescript` exits non-zero and leaves all files unchanged.
- For a repo where `AGENTS.md` changed since the recorded hash, `sibu skills use typescript` exits non-zero and leaves all files unchanged.
- The handler computes the full application plan and runs preflight before the first write operation.
- Failure output clearly says the command cannot safely proceed and tells the user to run `sibu sync` when cleanup is needed.
- `pnpm build` and `pnpm check` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-20T02:16:25Z
