# Include Companion Export Skills During Init

## Epic
[MCP-Linked Selection Flows](../epic_brief.md)

## User Story
As a developer initializing Sibu in a clean repo, I want export skills implied by my MCP selections to be explained and included automatically, so that setup feels helpful without making me answer redundant prompts.

## Context

The clarified UX recommendation says that if a user selects Notion MCP during `sibu init`, `export-to-notion` should not later appear as a pre-selected optional workflow skill. Sibu should explain the companion addition near MCP selection and include it in final setup output.

## Scope

- Complete MCP-implied exporter skill selection before asking for optional workflow skills.
- Exclude already implied exporter skills from the optional workflow skill prompt.
- Print concise companion-addition messaging when GitHub or Notion MCP implies an exporter skill.
- Record completed MCP and workflow skill selections in `.sibu/state.json`.
- Include selected MCP servers and companion exporter skills in setup output.
- Preserve Notion docs parent page prompting when the completed MCP selection includes Notion.
- Add tests for the clarified init UX and final state.

## Out of Scope

- Targeted `sibu mcp use` or `sibu skills use` dependency handling.
- Sync adoption for existing projects.
- Exporting artifacts to GitHub or Notion.

## Acceptance Criteria

- Selecting Notion MCP during init includes `export-to-notion` in the final workflow without showing it as a pre-selected optional workflow skill.
- Selecting GitHub MCP during init includes `export-to-github` in the final workflow without showing it as a pre-selected optional workflow skill.
- Init output clearly explains each companion exporter skill addition.
- `.sibu/state.json` records both the selected MCP server and implied exporter workflow skill.
- Notion docs parent page is requested when Notion is included through the completed MCP selection.

## Validation

- Run `sibu init` handler tests for GitHub and Notion MCP selections.
- Run prompt/dependency tests for optional workflow skill filtering.
- Run `pnpm run test`.
