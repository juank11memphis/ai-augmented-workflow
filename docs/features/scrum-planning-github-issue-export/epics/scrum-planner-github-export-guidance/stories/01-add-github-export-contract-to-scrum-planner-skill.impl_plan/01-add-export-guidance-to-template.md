# Step: Add export guidance to Scrum planner template

## Goal

Add concise post-planning GitHub issue export guidance to the reusable Scrum planner template so generated agents know when and how to offer create-only GitHub issue export after local Epics and User Stories are written.

## Scope

- Update `templates/skills/scrum-master-planner/SKILL.md` only for the Scrum planner post-write behavior.
- Add the guidance after the coverage/boundary check workflow and before final response behavior.
- Include when to ask, when not to ask, current-repo-only targeting, explicit opt-in, create-only behavior, required labels, issue mapping, native sub-issue requirement, no local Markdown modification, and fail-clear behavior.
- Keep the wording operational and compact; do not add full GitHub API documentation.
- Do not update `templates/manifest.json` in this step.
- Do not change Sibu runtime modules, CLI commands, MCP catalog/config behavior, or unrelated skill guidance.

## Files

- `templates/skills/scrum-master-planner/SKILL.md`
- `docs/features/scrum-planning-github-issue-export/technical_design.md`
- `docs/features/scrum-planning-github-issue-export/epics/scrum-planner-github-export-guidance/stories/01-add-github-export-contract-to-scrum-planner-skill.md`

## Done when

- The template tells agents to write local Epics and User Stories before considering GitHub export.
- The template tells agents not to offer export when required GitHub MCP issue/sub-issue capabilities are unavailable.
- The template requires one explicit user opt-in question before any GitHub mutation.
- The template specifies current local GitHub `origin` repository only.
- The template specifies Epic issues, User Story issues, labels, and native sub-issue attachment.
- The template says to create a fresh issue set every accepted run and not detect duplicates or update existing issues.
- The template says local Markdown files remain unchanged.
- The template says to fail clearly if label creation, issue creation, or native sub-issue attachment cannot be performed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T03:25:43Z
