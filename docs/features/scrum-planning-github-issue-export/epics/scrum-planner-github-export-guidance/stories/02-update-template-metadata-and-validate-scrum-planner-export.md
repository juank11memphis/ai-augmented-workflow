# Update Template Metadata and Validate Scrum Planner Export Guidance

## Epic

[Scrum Planner GitHub Export Guidance](../epic_brief.md)

## User Story

As a Sibu maintainer, I want the Scrum planner template metadata and validation updated with the new GitHub export guidance, so that users can discover the template change safely through Sibu sync.

## Context

Changing `templates/skills/scrum-master-planner/SKILL.md` requires updating `templates/manifest.json` according to Sibu template-change rules. The feature should remain template/skill-only and avoid runtime Sibu changes.

## Scope

- Update `templates/manifest.json` global `templateVersion`.
- Bump `skills/scrum-master-planner/SKILL.md` template version.
- Replace the Scrum planner template `changes` entries with user-facing notes for this version.
- Verify the manifest describes the Scrum planner GitHub issue export behavior clearly.
- Run repository validation.
- Review git diff to confirm no unrelated runtime, CLI, MCP catalog, or state-management changes were introduced.

## Out of Scope

- Editing template metadata for unrelated templates.
- Changing Sibu CLI behavior.
- Adding automated live GitHub integration tests.
- Updating release notes or publishing a release.

## Acceptance Criteria

- `templates/manifest.json` has a bumped global template version.
- `skills/scrum-master-planner/SKILL.md` has a bumped template version.
- The Scrum planner template change note explains the new optional GitHub issue export guidance in user-facing language.
- `pnpm verify` passes.
- The final diff is limited to the Scrum planner skill template, installed skill copy, manifest metadata, and planning docs for this feature.

## Validation

- `pnpm verify`
- Focused diff review of Scrum planner skill files and `templates/manifest.json`.

## Notes

- Live GitHub MCP export validation is useful later but optional and outside this story's required automated validation.
