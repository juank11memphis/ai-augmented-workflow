# Offer Exporter Skill Adoption During Sync

## Epic
[MCP-Linked Selection Flows](../epic_brief.md)

## User Story
As a maintainer of an existing Sibu project with GitHub or Notion MCP already selected, I want `sibu sync` to offer the matching exporter skill, so that my workflow can adopt the new capability safely.

## Context

The feature brief requires `sibu sync` to support users that already have one of the MCPs installed. The technical design says sync should complete implied exporter selections in memory before preview generation and rely on normal sync review actions for adoption.

## Scope

- During sync, derive implied exporter workflow skills from selected MCP servers before generating previews.
- Surface missing exporter skill files as normal `new-template` sync previews.
- Surface `AGENTS.md` routing refresh when implied exporter skills change routing output.
- Persist implied workflow skill selection only when sync actions leave managed files and state consistent.
- Avoid writing state that claims an exporter skill is selected when the user skipped corresponding adoption/review actions.
- Add tests for GitHub and Notion MCP states without matching exporter skills.

## Out of Scope

- Init or targeted command behavior.
- Creating exporter templates or removing authoring export guidance.
- Automatically applying sync updates without user review.

## Acceptance Criteria

- A project with Notion MCP selected and no `export-to-notion` skill sees sync review items for the matching exporter skill and any routing refresh.
- A project with GitHub MCP selected and no `export-to-github` skill sees sync review items for the matching exporter skill and any routing refresh.
- Applying the sync adoption records the exporter skill and managed files consistently in `.sibu/state.json`.
- Skipping exporter adoption does not persist state that claims the exporter skill is selected.
- Local edits remain protected by existing sync actions and statuses.

## Validation

- Run sync preview and sync handler tests for implied exporter adoption.
- Run state consistency tests around skipped and applied sync actions.
- Run `pnpm run test`.
