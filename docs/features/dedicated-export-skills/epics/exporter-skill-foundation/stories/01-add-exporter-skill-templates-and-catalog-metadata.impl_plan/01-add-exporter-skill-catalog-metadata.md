# Step: Add exporter skill catalog metadata

## Goal

Add `export-to-github` and `export-to-notion` to the selectable workflow skill model and expose catalog helpers that describe their MCP dependencies and implied skill pairings.

## Scope

- Extend the workflow skill ID type with both exporter skill IDs.
- Add both skills to the selectable workflow skill catalog with target mappings for all feasible supported agents.
- Add catalog helper functions for MCP servers required by workflow skills and workflow skills implied by MCP servers.
- Add catalog tests for skill resolution and pairing helpers.
- Do not change command handlers, init, sync, or targeted selection behavior in this step.

## Files

- `src/shared/types.ts`
- `src/modules/workflow-target-planning/catalog.ts`
- `src/modules/workflow-target-planning/catalog.test.ts`

## Done when

- `export-to-github` and `export-to-notion` resolve as workflow skills.
- Catalog helpers identify GitHub MCP as paired with `export-to-github` and Notion MCP as paired with `export-to-notion`.
- Targeted catalog tests pass.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-19T13:28:59-06:00
