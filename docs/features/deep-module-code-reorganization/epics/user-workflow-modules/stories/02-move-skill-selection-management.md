# Move Skill Selection Management Workflows

## Epic
[User Workflow Modules](../epic_brief.md)

## User Story
As a Sibu maintainer, I want skill list, use, and stop workflows to live in Skill Selection Management, so that selectable skill lifecycle behavior is owned by one coherent module.

## Context
Current skill handlers are split across `src/features/list-skills`, `src/features/use-skill`, and `src/features/stop-managing-file`. The Deep Module Map assigns these behaviors to Skill Selection Management.

## Scope
- Move skill list, use, and stop handlers into Skill Selection Management.
- Preserve selected-skill resolution, duplicate-selection no-ops, architecture-skill exclusivity, clean-workflow preflight, `AGENTS.md` routing refresh, unmanaged status recording, and keep/delete prompts.
- Move related tests with equivalent assertions.

## Out of Scope
- Adding new selectable skills.
- Supporting architecture skill replacement beyond current behavior.
- Changing deletion prompt behavior.

## Acceptance Criteria
- Skill Selection Management owns all current `sibu skills` behavior.
- Existing skill use and stop tests pass.
- Skill use remains blocked when broader workflow drift exists.
- Skill stop still marks files unmanaged before optional deletion.

## Validation
- `pnpm build`
- Moved use-skill and stop-managing-file tests.
