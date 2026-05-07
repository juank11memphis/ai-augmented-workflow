# Step: Run validation and review diff

## Goal

Validate the template metadata change and confirm the final story diff stays inside the approved template-guidance scope.

## Scope

- Run `pnpm verify`.
- Review the focused diff for `templates/manifest.json`, `templates/skills/scrum-master-planner/SKILL.md`, `.agents/skills/scrum-master-planner/SKILL.md`, and this feature's planning docs.
- Confirm no runtime modules, CLI commands, MCP lifecycle files, or unrelated templates changed.
- Do not run live GitHub MCP export validation in this story.
- Do not update release notes or publish anything.

## Files

- `templates/manifest.json`
- `templates/skills/scrum-master-planner/SKILL.md`
- `.agents/skills/scrum-master-planner/SKILL.md`
- `docs/features/scrum-planning-github-issue-export/epics/scrum-planner-github-export-guidance/stories/02-update-template-metadata-and-validate-scrum-planner-export.impl_plan/`

## Done when

- `pnpm verify` passes.
- The focused diff confirms the change is limited to approved template metadata/guidance and planning artifacts.
- Any unexpected changed file is either reverted if unrelated or reported as a stop-and-ask item.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T03:27:34Z
