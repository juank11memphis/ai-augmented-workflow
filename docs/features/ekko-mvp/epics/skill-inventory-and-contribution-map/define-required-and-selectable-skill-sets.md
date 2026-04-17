# Define Required and Selectable Skill Sets

## Epic
[Skill Inventory and Contribution Map](./epic_brief.md)

## User Story
As a contributor planning Ekko's baseline workflow, I want required and selectable skills to be clearly distinguished, so that the team knows what is essential versus project-specific.

## Context
The feature brief requires an engineer-defined minimal set of required skills and an engineer-defined set of selectable skills. The technical design identifies the current required skills and selectable skill categories in the shared catalog.

## Scope
- Keep required baseline skills explicit in the catalog or source of truth used by Ekko.
- Keep selectable language, framework, and architecture skills explicit.
- Ensure user-facing commands can communicate the distinction between required and selectable skills.
- Keep the distinction compatible with `init`, `sync`, and `skills use` behavior.

## Out of Scope
- Guaranteeing that every selectable skill is complete by MVP completion.
- Supporting a remote marketplace or registry.
- Letting users add required skills through `ekko skills use <skill_name>` as if they were selectable.

## Acceptance Criteria
- The MVP baseline required skills are identifiable by the team.
- Selectable skills are identifiable by category.
- Ekko can present the distinction between required and selectable skills to a user.
- The distinction is consistent with post-init skill selection rules.

## Validation
- Run `pnpm build` and `pnpm check`.
- Review `ekko skills list` output or equivalent catalog presentation for required/selectable clarity.
