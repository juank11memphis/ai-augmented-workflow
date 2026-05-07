# Add GitHub Export Contract to Scrum Planner Skill

## Epic

[Scrum Planner GitHub Export Guidance](../epic_brief.md)

## User Story

As a Sibu user creating Scrum planning artifacts, I want the Scrum planner skill to offer GitHub issue creation when GitHub MCP is available, so that I can move from local Epics and User Stories to GitHub Issues without manual copy/paste.

## Context

The feature brief and technical design define this as a Scrum planner skill behavior, not a Sibu CLI feature. The skill should write local planning docs first, then optionally create GitHub Issues in the current repository using available GitHub MCP tools.

## Scope

- Update `templates/skills/scrum-master-planner/SKILL.md` with a concise post-planning GitHub export section.
- Update `.agents/skills/scrum-master-planner/SKILL.md` with the same behavior for this repository's installed skill copy.
- Instruct the agent to check for GitHub MCP issue-writing and sub-issue-writing capabilities after writing local Epics and User Stories.
- Instruct the agent not to offer export when required GitHub MCP tools are unavailable.
- Require resolving the current repository from the local GitHub `origin` remote.
- Require one explicit user opt-in question before GitHub mutation.
- Define create-only issue behavior, labels, issue body expectations, and native sub-issue attachment.
- Require clear failure when required label creation, issue creation, or native sub-issue attachment cannot be performed.

## Out of Scope

- Implementing a Sibu runtime command or module.
- Detecting duplicate GitHub issues.
- Updating existing GitHub issues.
- Modifying local Epic or Story files.
- Adding GitHub Projects, milestones, assignees, or status tracking.
- Changing MCP server configuration behavior.

## Acceptance Criteria

- Given the Scrum planner writes local Epics and User Stories, the skill text tells agents to check for GitHub MCP export capability afterward.
- Given GitHub MCP tools are unavailable, the skill text tells agents to end normally without offering export.
- Given GitHub MCP tools are available, the skill text tells agents to ask whether to create GitHub Issues in the current repo before mutating GitHub.
- Given the user declines, the skill text tells agents to perform no GitHub mutation.
- Given the user accepts, the skill text tells agents to create fresh GitHub issues every time.
- Epic issues are specified with `epic` and `sibu-generated` labels.
- User Story issues are specified with `user-story` and `sibu-generated` labels.
- User Story issues must be attached as native sub-issues of their parent Epic issue.
- The skill text says to fail clearly if native sub-issues cannot be created.
- The skill text says local Markdown files remain unchanged.

## Validation

- Inspect both Scrum planner skill files for matching post-planning GitHub export guidance.
- Run `pnpm verify` after template metadata is updated.

## Notes

- Keep the added prompt guidance short and operational; do not turn the skill into full GitHub API documentation.
