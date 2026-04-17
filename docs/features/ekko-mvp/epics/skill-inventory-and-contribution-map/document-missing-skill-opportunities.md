# Document Missing Skill Opportunities

## Epic
[Skill Inventory and Contribution Map](./epic_brief.md)

## User Story
As a team member looking for a concrete way to contribute to Ekko, I want missing required and selectable skills documented clearly, so that I can claim a useful follow-up task without needing extensive verbal onboarding.

## Context
The feature brief requires human-identified missing skills to become assignable work. The technical design proposes `docs/features/ekko-mvp/missing_skills.md` as a lightweight contributor-oriented artifact.

## Scope
- Create `docs/features/ekko-mvp/missing_skills.md`.
- Include entries for human-identified missing required and selectable skills.
- For each entry, capture skill id, name, category, reason, routing/trigger instruction, intended template path, status, and owner when known.
- Keep the artifact simple enough to maintain manually during the MVP.

## Out of Scope
- Automatically generating assignments.
- Making the CLI read from this artifact in the MVP.
- Building a marketplace, registry, or analytics view for skills.

## Acceptance Criteria
- `docs/features/ekko-mvp/missing_skills.md` exists.
- Missing required skills and missing selectable skills can be documented separately or clearly categorized.
- Each missing-skill entry is specific enough for a contributor to understand the expected skill and where it would live.
- The document can represent statuses such as missing, planned, in progress, and available.

## Validation
- Review the missing-skill inventory for enough detail to support contributor ownership.
- Confirm the artifact remains documentation-only for the MVP.
