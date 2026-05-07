# Step: Review prompt scope and story coverage

## Goal

Review the Scrum planner skill wording against the story acceptance criteria and technical design before the manifest/validation story runs, catching prompt bloat, missing constraints, or accidental scope expansion early.

## Scope

- Compare the changed Scrum planner guidance against the first story's acceptance criteria.
- Confirm the prompt remains concise and does not over-document GitHub API mechanics.
- Confirm the prompt does not add duplicate detection, issue updates, status sync, local Markdown edits, GitHub Projects, milestones, assignees, or a new Sibu command.
- Confirm the prompt preserves the native sub-issue requirement and child issue ID warning from the technical design.
- Do not edit `templates/manifest.json`; that belongs to the next User Story.

## Files

- `templates/skills/scrum-master-planner/SKILL.md`
- `.agents/skills/scrum-master-planner/SKILL.md`
- `docs/features/scrum-planning-github-issue-export/technical_design.md`
- `docs/features/scrum-planning-github-issue-export/epics/scrum-planner-github-export-guidance/stories/01-add-github-export-contract-to-scrum-planner-skill.md`

## Done when

- Every acceptance criterion in the first User Story is covered by the skill guidance.
- The guidance remains inside the approved Template Catalog and Rendering scope.
- No runtime Sibu module, CLI command, MCP lifecycle, or unrelated template behavior was introduced.
- Any issue that would require changing the feature brief or technical design is identified as a stop-and-ask item instead of being implemented ad hoc.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T03:25:43Z
