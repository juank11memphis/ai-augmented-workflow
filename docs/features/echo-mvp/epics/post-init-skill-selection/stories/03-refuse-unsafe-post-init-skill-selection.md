# Refuse Unsafe Post-Init Skill Selection

## Epic
[Post-Init Skill Selection](../epic_brief.md)

## User Story
As a developer with a drifted or ambiguous Echo-enabled repository, I want `echo skills use <skill_name>` to refuse unsafe changes, so that my local workflow files stay under my control.

## Context
The feature brief requires post-init skill selection to proceed only when the existing workflow state is clean enough. The technical design requires all-or-nothing preflight behavior and clear direction to `echo sync` when cleanup is needed.

## Scope
- Detect missing or invalid `.echo/state.json` before mutation.
- Detect actionable workflow drift before mutation.
- Stop when a would-be-created skill target already exists but is unrecorded.
- Stop when `AGENTS.md` changed since the recorded hash.
- Stop safely when architecture skill selection would conflict with an existing architecture skill.
- Tell the user when `echo sync` or another explicit action is needed first.

## Out of Scope
- Repairing the dirty state inside `skills use`.
- Automatically adopting unrecorded files.
- Silently replacing architecture choices.

## Acceptance Criteria
- If the workflow state is dirty, `echo skills use <skill_name>` exits without file or state changes.
- If `echo sync` is needed first, the command says so clearly.
- If the new skill file already exists but is unrecorded, the command refuses to overwrite or adopt it silently.
- If another architecture skill is already selected, selecting a different architecture skill fails safely.
- Preflight checks complete before any write occurs.

## Validation
- Run `pnpm build` and `pnpm check`.
- Smoke test a dirty repo by modifying a managed file, running `echo skills use typescript`, and confirming no files change and the output points to `echo sync`.
