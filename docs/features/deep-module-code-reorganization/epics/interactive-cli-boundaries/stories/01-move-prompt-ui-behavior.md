# Move Prompt UI Behavior into Interactive Guidance

## Epic
[Interactive CLI Boundaries](../epic_brief.md)

## User Story
As a Sibu maintainer, I want prompt UI behavior to live in Interactive Guidance, so that CLI interaction code has a clear owner separate from workflow business rules.

## Context
Prompt rendering and questions currently live in `src/shared/prompts.tsx`. The Deep Module Map assigns prompt mechanics, intro/outro presentation, selection questions, and consistent CLI communication patterns to Interactive Guidance.

## Scope
- Move intro rendering and prompt helper behavior into `src/modules/interactive-guidance/`.
- Preserve prompt text, cancel handling, validation behavior, multi-select behavior, and terminal presentation.
- Move prompt tests with equivalent assertions.

## Out of Scope
- Rewriting prompt copy.
- Changing question order.
- Changing which module decides what to do with answers.

## Acceptance Criteria
- Interactive Guidance owns the prompt UI code.
- Existing prompt behavior remains equivalent.
- Prompt-related tests pass after the move.

## Validation
- `pnpm build`
- Moved prompt tests.
