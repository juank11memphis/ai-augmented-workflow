# Expose Database Skills in Init and Skill Commands

## Epic
[Database Skill Selection](../epic_brief.md)

## User Story
As a Sibu user, I want to select PostgreSQL Expert during setup or later skill management, so that PostgreSQL projects can opt into database guidance only when they need it.

## Context

The technical design adds an optional database multiselect during `sibu init`, a Databases group in `sibu skills list`, and database support in `sibu skills use` and `sibu skills stop`. Existing projects should use `sibu skills use postgresql-expert`; sync should not ask unrelated database questions.

## Scope

- Add `askForDatabaseSkills()` and wire it into `sibu init` after framework selection and before architecture selection.
- Pass selected database skills through init target planning, rendering, and state writing.
- Show a **Databases** group in `sibu skills list` with selected markers.
- Support `sibu skills use postgresql-expert` as a multi-select category addition.
- Support `sibu skills stop postgresql-expert` with existing stop/delete behavior.
- Add or update command tests for list/use/stop/init database behavior.
- Run final validation from the technical design.

## Out of Scope

- Changing command names, arguments, or existing skill semantics.
- Supporting architecture replacement changes.
- Adding sync-time database prompts for existing projects.
- Adding database skills other than PostgreSQL Expert.

## Acceptance Criteria

- `sibu init` can select PostgreSQL Expert under a database-related category.
- `sibu skills list` shows a Databases group and marks PostgreSQL Expert selected when present in state.
- `sibu skills use postgresql-expert` installs/records the skill and is a no-op if already selected.
- `sibu skills stop postgresql-expert` removes the database selection while preserving existing safe file lifecycle behavior.
- Existing sync/doctor behavior remains generic and safe with selected database skills.

## Validation

- Relevant command and prompt tests pass.
- `pnpm run build`
- `pnpm run validate:packed-runtime`
- `sibu doctor`
