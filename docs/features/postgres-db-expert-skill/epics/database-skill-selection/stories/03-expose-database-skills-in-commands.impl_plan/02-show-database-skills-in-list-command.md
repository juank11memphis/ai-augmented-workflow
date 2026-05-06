# Step: Show database skills in list command

## Goal

Make database skills visible in `sibu skills list` so users can discover PostgreSQL Expert and see whether it is already selected.

## Scope

- Import `SELECTABLE_DATABASE_SKILLS` in the list-skills handler.
- Add a **Databases** group to `sibu skills list` output.
- Mark PostgreSQL Expert selected based on `state.selectedDatabaseSkills`.
- Add focused list behavior coverage if existing test seams support it without broad output harness changes.
- Do not change existing language, framework, architecture, or workflow group semantics.

## Files

- `src/modules/skill-selection-management/list-skills/handler.ts`
- `src/modules/skill-selection-management/list-skills/handler.test.ts` if a focused test seam is introduced or already practical

## Done when

- `sibu skills list` includes a Databases group.
- PostgreSQL Expert appears with id `postgresql-expert`.
- PostgreSQL Expert is marked selected when `selectedDatabaseSkills` contains `postgresql-expert`.
- Existing skill groups still render as before.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-06T14:27:02-06:00
