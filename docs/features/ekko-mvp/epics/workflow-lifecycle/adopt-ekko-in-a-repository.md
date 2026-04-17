# Adopt Ekko in a Repository

## Epic
[Workflow Lifecycle](./epic_brief.md)

## User Story
As a developer adopting AI workflow support in a repository, I want to run `ekko init`, so that I can start with shared workflow files, selected agents, selected skills, and recorded Ekko state.

## Context
The feature brief defines `ekko init` as the one-time adoption command. The technical design notes that `init` already selects agents and skills, writes missing workflow files, and records `.ekko/state.json` through `writeEkkoState`.

## Scope
- `ekko init` creates initial workflow support files for the selected agents and skills.
- Existing user-owned files are not overwritten unexpectedly.
- Ekko records workflow metadata needed to understand what it manages.
- The user can understand what was created and what Ekko now manages.

## Out of Scope
- Adding selectable skills after init.
- Repairing drift after adoption.
- Deep editor automation for any agent target.

## Acceptance Criteria
- Running `ekko init` in a repository without Ekko creates the expected initial workflow files.
- `.ekko/state.json` records managed workflow metadata for the selected setup.
- If a target file already exists, Ekko protects local ownership and does not silently overwrite it.
- The command output explains the created and managed workflow files clearly.

## Validation
- Run the automated checks from the technical design: `pnpm build` and `pnpm check`.
- Smoke test a fresh repo by running `ekko init` and confirming the expected workflow files and state are present.
