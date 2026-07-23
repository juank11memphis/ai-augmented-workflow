---
name: export-to-github
description: Export a named feature's Epics and User Stories from local Markdown to GitHub issues and native sub-issues using configured GitHub MCP capabilities.
---

# Export to GitHub

Use this skill when the user asks to export a feature's Epics and User Stories to GitHub.

## Non-blocking delegation requirement

Before reading planning artifacts or calling GitHub mutation tools, check whether the configured `github-exporter` sub-agent is available for the current AI target.

If available, you must delegate the export to `github-exporter`. Do not perform the export inline and do not call GitHub issue or sub-issue mutation tools from the main agent.

The delegation is fire-and-notify:

- Start the `github-exporter` sub-agent in the background.
- Do not call `wait_agent`, poll for completion, spawn a status-checking agent, or otherwise block the main thread.
- Immediately return control to the user after spawning the exporter.
- Tell the user the export is running in the background and that completion will arrive via sub-agent notification.
- Only inspect the final result if the user explicitly asks for status/results later, or after a sub-agent completion notification is received.

Pass only a clean, narrow export packet:

- feature slug or explicit planning artifact paths
- target repository resolved from the current local repo's GitHub `origin` remote
- the no-local-write rule
- whether user opt-in for GitHub mutation has already been granted
- expected final output format: created issue URLs or numbers, sub-issue relationship results, and errors

Do not fork or pass the main agent's full conversation context. The exporter does not need implementation, planning, or unrelated discussion context.

Inline export is allowed only when sub-agent execution is unavailable, the configured `github-exporter` is not installed, or the user explicitly asks for inline fallback after the background exporter is unavailable or failed. Before any inline mutation, clearly tell the user why delegation cannot be used.

## Required input

- A feature name or feature slug.
- Local planning artifacts under `docs/features/<feature-slug>/epics/`.
- Configured GitHub MCP capabilities for issue creation, issue ID access, and native sub-issue mutation.

If the feature name is ambiguous, inspect `docs/features/` and ask one focused clarification question.

## Workflow

### Delegated workflow

When `github-exporter` is available:

1. Resolve only the feature slug or explicit planning artifact paths needed for the export packet.
2. Resolve the target repository from the current local repo's GitHub `origin` remote only. Do not ask for or use another repository.
3. Ask one explicit opt-in question before any GitHub mutation, unless the user has already granted export mutation approval in the current request.
4. Spawn `github-exporter` in the background with the clean, narrow export packet.
5. Immediately report that the export is running in the background. Do not wait for created issue numbers or URLs in the same turn.

### Inline fallback workflow

Use inline fallback only when delegation is unavailable or has failed and the user explicitly accepts inline fallback. In that case:

1. Resolve the feature slug from the user's feature name.
2. Read the feature's Epic briefs and User Story Markdown files under `docs/features/<feature-slug>/epics/**`.
3. Resolve the target repository from the current local repo's GitHub `origin` remote only. Do not ask for or use another repository.
4. Verify GitHub MCP can create issues, return issue IDs, and attach native sub-issues.
5. Ask one explicit opt-in question before any GitHub mutation.
6. If the user accepts, create a fresh issue set every time:
   - one issue per Epic, with no labels
   - one issue per User Story, with no labels
   - each User Story issue attached as a native sub-issue of its parent Epic issue

## Delegation self-check

Before finalizing, verify:

- Did I use `github-exporter` when it was available?
- Did I avoid `wait_agent`, status polling, and duplicate status-checking agents?
- If not, did I explicitly report why before any inline GitHub mutation?
- Did I avoid local file writes and preserve native sub-issue requirements?

## Export rules

- Keep issue bodies concise and source-grounded.
- Include the source local doc path and relevant summary, scope, acceptance criteria, or validation notes.
- Preserve each created User Story issue's GitHub issue `id`; native sub-issue APIs need the child issue ID, not only its issue number.
- Do not search for duplicates or update existing issues.
- Do not use labels, milestones, projects, assignees, status tracking, Markdown checklists, or loose links as a substitute for native sub-issues.
- Do not modify local Markdown files with GitHub URLs.
- If issue creation, issue ID access, or native sub-issue attachment is unavailable, fail clearly and do not fall back to another structure.
