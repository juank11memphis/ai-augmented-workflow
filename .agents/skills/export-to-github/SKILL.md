---
name: export-to-github
description: Export a named feature's Epics and User Stories from local Markdown to GitHub issues and native sub-issues using configured GitHub MCP capabilities.
---

# Export to GitHub

Use this skill when the user asks to export a feature's Epics and User Stories to GitHub.

## Required input

- A feature name or feature slug.
- Local planning artifacts under `docs/features/<feature-slug>/epics/`.
- Configured GitHub MCP capabilities for issue creation, issue ID access, and native sub-issue mutation.

If the feature name is ambiguous, inspect `docs/features/` and ask one focused clarification question.

## Workflow

1. Resolve the feature slug from the user's feature name.
2. Read the feature's Epic briefs and User Story Markdown files under `docs/features/<feature-slug>/epics/**`.
3. Resolve the target repository from the current local repo's GitHub `origin` remote only. Do not ask for or use another repository.
4. Verify GitHub MCP can create issues, return issue IDs, and attach native sub-issues.
5. Ask one explicit opt-in question before any GitHub mutation.
6. If the user accepts, create a fresh issue set every time:
   - one issue per Epic, with no labels
   - one issue per User Story, with no labels
   - each User Story issue attached as a native sub-issue of its parent Epic issue
7. Report created issue numbers or URLs.

## Export rules

- Keep issue bodies concise and source-grounded.
- Include the source local doc path and relevant summary, scope, acceptance criteria, or validation notes.
- Preserve each created User Story issue's GitHub issue `id`; native sub-issue APIs need the child issue ID, not only its issue number.
- Do not search for duplicates or update existing issues.
- Do not use labels, milestones, projects, assignees, status tracking, Markdown checklists, or loose links as a substitute for native sub-issues.
- Do not modify local Markdown files with GitHub URLs.
- If issue creation, issue ID access, or native sub-issue attachment is unavailable, fail clearly and do not fall back to another structure.
