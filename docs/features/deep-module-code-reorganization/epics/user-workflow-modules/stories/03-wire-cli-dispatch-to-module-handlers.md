# Wire CLI Dispatch to Module Handlers

## Epic
[User Workflow Modules](../epic_brief.md)

## User Story
As a Sibu CLI user, I want the same commands to keep working after handlers move, so that internal reorganization does not change the command experience.

## Context
`src/entrypoints/cli` should remain the driving adapter. After user workflow handlers move into modules, command dispatch must import from module entrypoints instead of `src/features/*`.

## Scope
- Update CLI command dispatch imports to use module handlers.
- Preserve command names, descriptions, arguments, and `SibuCliCommand` discriminants unless equivalent behavior is fully preserved.
- Confirm no runtime imports depend on removed `src/features` paths.

## Out of Scope
- Redesigning the CLI command tree.
- Adding new commands.
- Moving admin command scripts.

## Acceptance Criteria
- CLI dispatch calls the module-owned handlers.
- Current CLI command contracts remain unchanged.
- The build has no stale imports from removed feature paths.

## Validation
- `pnpm build`
- `pnpm verify`
