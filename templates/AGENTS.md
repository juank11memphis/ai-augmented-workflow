# AGENTS.md

## Project overview

{{PROJECT_OVERVIEW}}

## Security and safety

- Do not commit secrets, credentials, tokens, or other sensitive data.
- Avoid destructive operations unless the user explicitly requests them or confirms the plan.
- Keep changes focused on the requested scope; do not introduce unrelated refactors or enhancements.
- If an implementation becomes materially more complex or risky than expected, stop and ask for explicit approval before continuing.

## Agent-specific instructions

- Before any task that requires code changes, propose a brief plan and wait for user confirmation once per requested task.
- After confirmation, proceed with all agreed in-scope changes without re-asking.
- Ask again only if the scope changes materially, the approach becomes materially more complex or risky, or the user explicitly asks to review before continuing.
- Use Conventional Commits 1.0.0 for commit messages.

## Ekko maintenance

This repository uses Ekko to manage AI workflow setup.

- `ekko init` safely initializes or repairs missing workflow files. It creates missing agent support files, keeps existing files unchanged, and refreshes `.ekko/state.json` metadata.
- `ekko doctor` is intended to be the read-only health check for this workflow. It should be used to inspect whether Ekko-managed files are missing, modified, or generated from older templates.

If workflow files appear missing, ask the user to run `ekko init`.
If workflow files may be outdated or drifted from the recorded Ekko state, ask the user to run `ekko doctor`.
