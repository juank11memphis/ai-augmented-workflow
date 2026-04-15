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
- `ekko doctor` is the read-only health check for this workflow. It inspects whether Ekko-managed files are missing, modified, or generated from older templates.
- `ekko sync` reviews template updates interactively. It explains human-readable template changes, protects local edits from automatic overwrites, and lets the user apply safe updates, mark customized files as reviewed, write side templates, stop managing a file, or skip for later.

At the start of each session in this repository, run `ekko doctor` before making changes or giving workflow guidance. Treat it as a read-only preflight check.

After `ekko doctor` finishes, guide the user based on the outcome:

- If the workflow is healthy, mention that the Ekko check passed and proceed with the requested work.
- If managed workflow files are missing or state metadata needs repair, tell the user to run `ekko init` before continuing.
- If newer template versions are available, tell the user to run `ekko sync` to review and apply or dismiss template updates.
- If `ekko doctor` cannot run because Ekko is unavailable, tell the user how to install or run Ekko for this project before relying on template status.

Ekko records managed workflow file metadata in `.ekko/state.json`, including template versions, file hashes, selected agent support, and whether files are `managed`, `customized`, or `unmanaged`.

If workflow files appear missing, ask the user to run `ekko init`.
If workflow files may be modified or drifted from the recorded Ekko state, ask the user to run `ekko doctor`.
If Ekko-managed workflow files may be generated from older templates, ask the user to run `ekko sync`.
