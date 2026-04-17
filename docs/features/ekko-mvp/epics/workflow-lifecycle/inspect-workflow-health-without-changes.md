# Inspect Workflow Health Without Changes

## Epic
[Workflow Lifecycle](./epic_brief.md)

## User Story
As a developer maintaining an Ekko-enabled repository, I want to run `ekko doctor`, so that I can understand whether the workflow setup is healthy without changing project files.

## Context
The feature brief defines `ekko doctor` as a read-only health check. It should report whether managed workflow files are healthy, missing, modified, unrecorded, or generated from older templates.

## Scope
- `ekko doctor` validates the current Ekko state and managed workflow files.
- The command reports healthy, missing, modified, unrecorded, and older-template conditions.
- The command clearly tells the user whether `ekko sync` is the next step.

## Out of Scope
- Applying repairs or template updates.
- Selecting new skills.
- Writing or changing workflow files.

## Acceptance Criteria
- Running `ekko doctor` on a healthy Ekko repository reports that the workflow is healthy.
- Running `ekko doctor` on a repository with actionable drift identifies the relevant condition.
- The command does not modify files or `.ekko/state.json`.
- The user can understand whether they should run `ekko sync` next.

## Validation
- Run `pnpm build` and `pnpm check`.
- Smoke test healthy and drifted repositories and confirm no file changes are produced by `ekko doctor`.
