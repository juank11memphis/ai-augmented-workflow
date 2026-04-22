# Present Required and Selectable Skill Sets

## Epic
[Skill Inventory and Contribution Map](../epic_brief.md)

## User Story
As a developer inspecting an Echo-enabled project, I want `echo skills list` to show both required and selectable skills clearly, so that I understand what Echo considers baseline workflow support versus project-specific additions.

## Context
The catalog already defines required baseline skills and selectable language, framework, and architecture skills. `echo init` already uses that distinction when creating workflow files. The remaining gap is user-facing clarity: `echo skills list` should present required skills as well as selectable skills, and file-management behavior should preserve user control even for required skills.

## Scope
- Show required baseline skills in `echo skills list`.
- Keep selectable language, framework, and architecture skills grouped separately from required skills.
- Make the output clear about which skills are always part of Echo's baseline and which are optional project-specific selections.
- Ensure selected/available state remains visible for selectable skills.
- Confirm `echo skills stop <file>` can stop managing required skill files as well as selectable skill files, because Echo should not prevent users from taking control of their own workflow files.

## Out of Scope
- Adding selectable skills after init; that belongs to the separate `echo skills use <skill_name>` user story.
- Guaranteeing that every selectable skill is complete by MVP completion.
- Supporting a remote marketplace or registry.
- Letting users add required skills through `echo skills use <skill_name>` as if they were selectable.
- Automatically deleting required skill files without explicit user confirmation.

## Acceptance Criteria
- `echo skills list` includes a required/baseline skill section.
- `echo skills list` includes selectable skill sections by category.
- Required skills are visually or textually distinguished from selectable skills.
- Selectable skills still show whether they are currently selected for the project.
- A user can run `echo skills stop <required-skill-file>` to mark a required skill file as unmanaged, with the same explicit keep/delete prompt used for other managed files.
- Stopping a required skill does not remove unrelated selected skill state.

## Validation
- Run `pnpm build` and `pnpm check`.
- Review `echo skills list` output for required/selectable clarity.
- In a temporary Echo project, run `echo skills stop <required-skill-file>` and confirm the file is marked `unmanaged` in `.echo/state.json`.
