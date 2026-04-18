# Present Required and Selectable Skill Sets

## Epic
[Skill Inventory and Contribution Map](../epic_brief.md)

## User Story
As a developer inspecting an Ekko-enabled project, I want `ekko skills list` to show both required and selectable skills clearly, so that I understand what Ekko considers baseline workflow support versus project-specific additions.

## Context
The catalog already defines required baseline skills and selectable language, framework, and architecture skills. `ekko init` already uses that distinction when creating workflow files. The remaining gap is user-facing clarity: `ekko skills list` should present required skills as well as selectable skills, and file-management behavior should preserve user control even for required skills.

## Scope
- Show required baseline skills in `ekko skills list`.
- Keep selectable language, framework, and architecture skills grouped separately from required skills.
- Make the output clear about which skills are always part of Ekko's baseline and which are optional project-specific selections.
- Ensure selected/available state remains visible for selectable skills.
- Confirm `ekko skills stop <file>` can stop managing required skill files as well as selectable skill files, because Ekko should not prevent users from taking control of their own workflow files.

## Out of Scope
- Adding selectable skills after init; that belongs to the separate `ekko skills use <skill_name>` user story.
- Guaranteeing that every selectable skill is complete by MVP completion.
- Supporting a remote marketplace or registry.
- Letting users add required skills through `ekko skills use <skill_name>` as if they were selectable.
- Automatically deleting required skill files without explicit user confirmation.

## Acceptance Criteria
- `ekko skills list` includes a required/baseline skill section.
- `ekko skills list` includes selectable skill sections by category.
- Required skills are visually or textually distinguished from selectable skills.
- Selectable skills still show whether they are currently selected for the project.
- A user can run `ekko skills stop <required-skill-file>` to mark a required skill file as unmanaged, with the same explicit keep/delete prompt used for other managed files.
- Stopping a required skill does not remove unrelated selected skill state.

## Validation
- Run `pnpm build` and `pnpm check`.
- Review `ekko skills list` output for required/selectable clarity.
- In a temporary Ekko project, run `ekko skills stop <required-skill-file>` and confirm the file is marked `unmanaged` in `.ekko/state.json`.
