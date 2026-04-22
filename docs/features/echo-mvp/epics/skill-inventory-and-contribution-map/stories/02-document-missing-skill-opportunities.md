# Document Missing Skill Opportunities

## Epic
[Skill Inventory and Contribution Map](../epic_brief.md)

## User Story
As a team member looking for a concrete way to contribute to Echo, I want each missing required or selectable skill turned into a ready-to-claim Jira User Story, so that contributors can pick up concrete implementation work without needing extensive verbal onboarding.

## Context
The feature brief requires human-identified missing skills to become assignable work. The technical design proposes `docs/features/echo-mvp/missing_skills.md` as a lightweight contributor-oriented artifact, but the primary output of this story is a set of Jira User Stories: one for each missing skill that the team decides should be implemented.

## Scope
- Create `docs/features/echo-mvp/missing_skills.md` as the source inventory for missing required and selectable skills.
- Include entries for human-identified missing required and selectable skills.
- For each entry, capture skill id, name, category, reason, routing/trigger instruction, intended template path, status, and owner when known.
- Create or prepare a Jira User Story for each missing skill that is ready for someone to take on.
- Ensure each Jira User Story includes enough context, scope, acceptance criteria, and validation guidance for a contributor to implement the missing skill template and catalog updates.
- Keep the inventory simple enough to maintain manually during the MVP.

## Out of Scope
- Automatically assigning Jira stories to contributors.
- Making the CLI read from this artifact in the MVP.
- Building a marketplace, registry, or analytics view for skills.
- Implementing the missing skills within this story.

## Acceptance Criteria
- `docs/features/echo-mvp/missing_skills.md` exists.
- Missing required skills and missing selectable skills can be documented separately or clearly categorized.
- Each missing-skill entry is specific enough for a contributor to understand the expected skill and where it would live.
- The document can represent statuses such as missing, planned, in progress, and available.
- Every missing skill selected for implementation has a corresponding Jira User Story.
- Each Jira User Story is ready for a contributor to take on without additional verbal explanation.

## Validation
- Review the missing-skill inventory for enough detail to support contributor ownership.
- Review the created/prepared Jira User Stories for clear scope, acceptance criteria, and validation steps.
- Confirm the artifact remains documentation-only for the MVP and does not drive CLI behavior.
