# Step: Test init companion exporter UX

## Goal

Add tests proving `sibu init` includes MCP-implied exporter skills, excludes them from the optional workflow prompt, and records completed state.

## Scope

- Add project adoption tests for GitHub MCP implying `export-to-github`.
- Add project adoption tests for Notion MCP implying `export-to-notion` and still asking for the Notion docs parent page.
- Verify `askForWorkflowSkills` receives implied exporter skill exclusions.
- Verify `.sibu/state.json`, managed files, and `AGENTS.md` routing include the implied exporter skill.
- Do not add tests for targeted selection or sync adoption.

## Files

- `src/modules/project-adoption/handler.test.ts`

## Done when

- Tests fail before the behavior exists and pass after implementation.
- Acceptance criteria for init behavior are covered.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-19T13:40:42-06:00
