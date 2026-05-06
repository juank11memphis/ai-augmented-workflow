# Step: Support database skills in stop command

## Goal

Allow users to stop managing PostgreSQL Expert through `sibu skills stop postgresql-expert` while preserving existing safe file lifecycle behavior.

## Scope

- Replace the temporary stop-handler database no-op guards with real selected-state checks and removal logic.
- Include selected database skills when rendering updated `AGENTS.md` after stopping a skill.
- Include selected database skills in any target/state reconstruction needed by the stop flow.
- Add helper resolution for database skill ids from state if needed.
- Update stop tests to cover PostgreSQL Expert removal, unmanaged managed-file state, and existing keep/delete behavior where practical.
- Do not change deletion prompt semantics or architecture replacement behavior.

## Files

- `src/modules/skill-selection-management/stop-managing-file/handler.ts`
- `src/modules/skill-selection-management/stop-managing-file/handler.test.ts`

## Done when

- `sibu skills stop postgresql-expert` recognizes selected PostgreSQL Expert.
- Stopping PostgreSQL Expert removes it from `selectedDatabaseSkills`.
- The stopped skill file follows existing unmanaged/keep/delete behavior.
- Updated `AGENTS.md` routing no longer includes PostgreSQL Expert after stop.
- Existing stop tests still pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:27:02-06:00
