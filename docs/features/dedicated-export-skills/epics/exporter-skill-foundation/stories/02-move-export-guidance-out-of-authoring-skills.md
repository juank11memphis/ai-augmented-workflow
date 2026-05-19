# Move Export Guidance Out of Authoring Skills

## Epic
[Exporter Skill Foundation](../epic_brief.md)

## User Story
As a maintainer, I want authoring skills to stop carrying GitHub and Notion export workflows, so that planning and documentation skills stay focused on local Markdown artifacts.

## Context

The feature brief requires export behavior to move into dedicated exporter skills. The technical design identifies existing Notion export sections in feature brief, UX, and technical design writers, plus the GitHub export gate in Scrum planner.

## Scope

- Remove Notion export sections from:
  - `templates/skills/feature-brief-writer/SKILL.md`
  - `templates/skills/ux-expert/SKILL.md`
  - `templates/skills/technical-design-writer/SKILL.md`
- Remove the mandatory GitHub export gate from `templates/skills/scrum-master-planner/SKILL.md`.
- Preserve local-artifact final response behavior for each authoring skill.
- Optionally add a concise pointer that external export belongs to dedicated exporter skills, without provider-specific instructions or gates.
- Update `templates/manifest.json` versions and change notes for changed templates.

## Out of Scope

- Changing current local generated `.agents/skills/**` copies unless a later implementation story explicitly refreshes local managed workflow files.
- Implementing command behavior for auto-selecting exporter skills.
- Altering the product pipeline sequence.

## Acceptance Criteria

- Feature brief, UX, and technical design writer templates no longer offer optional Notion export after local writes.
- Scrum planner template no longer requires a GitHub export gate after writing local Epics and Stories.
- Authoring skills still clearly finish by reporting local artifact paths according to their pipeline contract.
- Changed templates have bumped manifest versions and user-facing sync notes.
- Export guidance now lives in the dedicated exporter skill templates from the prior story.

## Validation

- Search templates for remaining destination-specific export sections in authoring skills.
- Run template/manifest tests.
- Run `pnpm run test`.
