# Post-Init Skill Selection Epic Brief

## Summary
Deliver `sibu skills use <skill_name>` as a narrow, safe command for adding one available selectable skill after a repository has already adopted Sibu.

## Source Context
- Feature brief: ../../feature_brief.md
- Technical design: ../../technical_design.md

## Scope
- CLI command registration and dispatch for `sibu skills use <skill_name>`.
- Exact selectable-skill resolution through shared catalog logic.
- Clean workflow-state checks before any mutation.
- Safe creation of the selected skill file, refresh of generated routing, and state updates.
- Clear handling for unknown, already selected, conflicting, unrecorded, or dirty-state cases.

## Out of Scope
- Multiple-skill selection in one command.
- Architecture skill replacement.
- A second interactive sync flow inside `skills use`.
- A remote skill registry or marketplace.

## User Stories
- [Resolve a selectable skill by name](./stories/01-resolve-a-selectable-skill-by-name.md)
- [Add a selectable skill when workflow state is clean](./stories/02-add-a-selectable-skill-when-workflow-state-is-clean.md)
- [Refuse unsafe post-init skill selection](./stories/03-refuse-unsafe-post-init-skill-selection.md)

## Acceptance Criteria
- A user can run `sibu skills use <skill_name>` after `sibu init` to add an available selectable skill.
- The command only changes files when the existing Sibu workflow state is clean.
- Unknown and unsafe cases produce concise, actionable messages.
- Adding a skill preserves Sibu's local-control expectations and updates workflow state transparently.

## Dependencies / Risks
- This Epic depends on shared catalog and workflow-health logic to avoid duplicating drift rules.
- If clean-state checks are weak, users may lose trust that Sibu protects managed workflow files.
