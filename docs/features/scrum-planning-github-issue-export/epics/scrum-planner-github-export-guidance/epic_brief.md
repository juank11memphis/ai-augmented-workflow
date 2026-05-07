# Scrum Planner GitHub Export Guidance Epic Brief

## Summary

Update the Scrum planner skill so that, after writing local Epics and User Stories, it can optionally create matching GitHub Issues through available GitHub MCP tools. The Epic delivers the create-only GitHub export guidance, native sub-issue relationship rules, and template metadata needed for Sibu users to receive the behavior through sync.

## Source Context

- Feature brief: `../../feature_brief.md`
- Technical design: `../../technical_design.md`

## Scope

- Add post-planning GitHub export guidance to the Scrum planner skill template.
- Update the repository's installed Scrum planner skill copy so this repo can use the behavior immediately.
- Require explicit user opt-in before any GitHub mutation.
- Define current-repo-only issue export behavior.
- Define Epic/User Story issue mapping, required labels, native sub-issue attachment, and fail-fast behavior.
- Update template manifest metadata and user-facing sync notes.
- Validate the template and prompt changes.

## Out of Scope

- Adding a new `sibu` CLI command.
- Adding runtime Sibu modules for GitHub issue export.
- Updating, syncing, deduplicating, or tracking GitHub issues.
- Modifying local planning Markdown files with GitHub URLs.
- Falling back to Markdown links/checklists when native sub-issues fail.
- Changing MCP server setup or catalog behavior.

## User Stories

- [Add GitHub export contract to Scrum planner skill](./stories/01-add-github-export-contract-to-scrum-planner-skill.md)
- [Update template metadata and validate Scrum planner export guidance](./stories/02-update-template-metadata-and-validate-scrum-planner-export.md)

## Acceptance Criteria

- The Scrum planner skill instructs agents to offer GitHub issue export only after local planning docs are written and only when GitHub MCP issue/sub-issue tools are available.
- The export guidance requires explicit user opt-in and current local repository targeting.
- The guidance maps Epics to parent issues and User Stories to native sub-issues with the required labels.
- The guidance is create-only and excludes duplicate detection, updates, tracking, and local doc mutation.
- Template manifest metadata is updated for the changed Scrum planner template.
- Validation passes.

## Dependencies / Risks

- GitHub MCP tool availability differs by environment; the guidance must tell agents to fail clearly when required issue, label, or sub-issue capabilities are unavailable.
- Native sub-issue attachment requires the child issue ID, not only its issue number.
