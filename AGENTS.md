# AGENTS.md

## Project overview

This repository is the home for establishing an AI-augmented development workflow. The exact shape is still being decided: it may become a CLI, a collection of shared skills and template files, or a combination of both. Generally, the goal is for someone to use this repository to set up their own AI-augmented development workflow on their local machine.

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

## Template changes

When changing files under `templates/`, use the local `ekko-template-change` skill if available and treat the templates as versioned product artifacts.

- Update `templates/manifest.json` in the same change.
- Bump the global `templateVersion` when any template changes.
- Bump each changed template's own `version`.
- Add user-facing change notes that explain what changed and why it matters for `ekko sync` users.
- Avoid renaming template paths unless state migration or backwards compatibility is handled.
- Run `pnpm verify` after template changes.
- When practical, test the lifecycle with `ekko init`, `ekko doctor`, and `ekko sync` in a temporary project.
