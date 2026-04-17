# Review and Repair Workflow Drift

## Epic
[Workflow Lifecycle](./epic_brief.md)

## User Story
As a developer with an Ekko-enabled repository, I want to run `ekko sync`, so that I can review and safely resolve workflow drift, missing files, and template updates while preserving local edits.

## Context
The feature brief positions `ekko sync` as the post-init maintenance command. The technical design says `sync` already previews missing files, local edits, template updates, new expected templates, and generated `AGENTS.md` routing changes.

## Scope
- `ekko sync` reviews and repairs missing managed workflow files when safe.
- `ekko sync` identifies template changes and new expected templates.
- `ekko sync` protects local edits from silent overwrites.
- `ekko sync` tells users about new selectable skills and new required skills to consider.
- The minimum acceptable experience leaves the project in a good workflow state whenever it runs.

## Out of Scope
- A marketplace or remote registry for skills.
- Detailed project-management features for assigning follow-up work.
- Replacing `ekko skills use <skill_name>` as the explicit post-init single-skill command.

## Acceptance Criteria
- A repository with missing managed files can be guided through repair.
- A repository with local edits is not overwritten silently.
- A repository with available template changes receives clear review/update options.
- The user is told when new selectable or required skills are available or expected.
- After safe sync actions complete, `ekko doctor` can report a healthy workflow state.

## Validation
- Run `pnpm build` and `pnpm check`.
- Smoke test repositories with missing files, local edits, older templates, and new expected templates.
