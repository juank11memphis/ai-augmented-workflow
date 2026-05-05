# Interactive CLI Boundaries Epic Brief

## Summary

Move prompt and terminal interaction behavior into Interactive Guidance while keeping business rules in the modules that own them. This Epic protects Sibu's user-facing voice and avoids dependency cycles during the module reorganization.

## Source Context
- Feature brief: ../../feature_brief.md
- Technical design: ../../technical_design.md

## Scope
- Move shared prompt rendering and prompt helpers into Interactive Guidance.
- Keep prompts mostly dumb: modules pass options/data in and prompts return user choices.
- Preserve existing prompt text, prompt mechanics, intro rendering, cancel handling, and grouped skill output semantics.
- Update prompt-related tests with equivalent assertions.

## Out of Scope
- Redesigning CLI copy, UX, colors, or terminal styling.
- Changing business decisions made from prompt answers.
- Adding new interactive flows.

## User Stories
- [Move prompt UI behavior into Interactive Guidance](./stories/01-move-prompt-ui-behavior.md)
- [Preserve prompt consumers without dependency cycles](./stories/02-preserve-prompt-consumers.md)

## Acceptance Criteria
- Interactive Guidance owns prompt UI behavior.
- Domain modules make business decisions from prompt results instead of prompt files importing domain rules.
- Prompt tests pass with equivalent assertions.
- User-facing prompt behavior remains unchanged.

## Dependencies / Risks
- Prompt code is used by adoption, sync, skills, and health output flows; move it after the main module destinations exist.
- Import cycles are the main risk; context-specific prompt files may be needed.
