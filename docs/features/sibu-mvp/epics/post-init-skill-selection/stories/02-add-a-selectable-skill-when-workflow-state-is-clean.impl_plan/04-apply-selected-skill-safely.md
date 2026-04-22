# Step: Apply the selected skill safely

## Goal
Implement the clean-state mutation path for one newly selected skill: create the selected skill file, refresh generated `AGENTS.md` routing, and record the updated workflow state.

## Scope

- Build the next selected language, framework, and architecture skill objects from the clean current state plus the requested skill.
- Calculate next workflow targets using `getWorkflowTargets` with the next selection.
- Preflight every file that would be touched before writing anything.
- Create the new skill target from its template only when it is missing and safe to create.
- Refresh `AGENTS.md` using generated skill routing for the next selection only when it has no unrecorded local edits.
- Update `.sibu/state.json` through existing state-writing logic so selected skill metadata, managed file hashes, and template versions are current.
- Print concise output explaining the created skill file, refreshed `AGENTS.md`, and updated state file.
- Do not overwrite local edits, adopt an unrecorded existing skill file, add multiple skills, or repair broader drift inside this command.

## Files

- src/features/use-skill/handler.ts
- src/shared/workflow-targets.ts
- src/shared/templates.ts
- src/shared/hash.ts
- src/shared/state.ts
- src/shared/types.ts
- .sibu/state.json
- AGENTS.md
- .agents/skills/<selected-skill>/SKILL.md

## Done when

- In a clean Sibu repo, `sibu skills use typescript` creates `.agents/skills/typescript/SKILL.md` from `templates/skills/typescript/SKILL.md` when TypeScript is available and not already selected.
- `AGENTS.md` includes the TypeScript routing instruction after the command completes.
- `.sibu/state.json` includes `typescript` in `selectedLanguageSkills` and records current managed metadata for the new skill file and refreshed `AGENTS.md`.
- The command output explains what changed.
- If any preflight detects unsafe file state, no partial writes are left behind and the user is directed to `sibu sync`.
- `pnpm build` and `pnpm check` pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-19T03:51:09Z
