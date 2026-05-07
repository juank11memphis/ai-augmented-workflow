# Step: Bump Scrum planner template metadata

## Goal

Update `templates/manifest.json` so Sibu sync can report the Scrum planner GitHub issue export guidance as a reviewed template update.

## Scope

- Bump the global `templateVersion` in `templates/manifest.json`.
- Bump only `skills/scrum-master-planner/SKILL.md` from version `7` to the next version.
- Replace the Scrum planner `changes` array with a current-version user-facing note about optional GitHub issue export after planning.
- Do not edit metadata for unrelated templates.
- Do not change Sibu runtime code, CLI behavior, MCP catalog behavior, or release notes.

## Files

- `templates/manifest.json`
- `templates/skills/scrum-master-planner/SKILL.md`
- `docs/features/scrum-planning-github-issue-export/epics/scrum-planner-github-export-guidance/stories/02-update-template-metadata-and-validate-scrum-planner-export.md`

## Done when

- `templates/manifest.json` has a bumped global `templateVersion`.
- `skills/scrum-master-planner/SKILL.md` has a bumped template version.
- The Scrum planner change note clearly says users get optional GitHub issue export guidance after Epics and User Stories are created.
- No unrelated manifest entries are changed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T03:27:34Z
