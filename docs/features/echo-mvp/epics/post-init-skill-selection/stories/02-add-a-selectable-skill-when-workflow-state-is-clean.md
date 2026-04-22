# Add a Selectable Skill When Workflow State Is Clean

## Epic
[Post-Init Skill Selection](../epic_brief.md)

## User Story
As a developer with a clean Echo-enabled repository, I want `echo skills use <skill_name>` to add an available selectable skill, so that I can extend the project workflow without rerunning init.

## Context
The feature brief requires explicit post-init skill selection. The technical design says the command should create the selected skill's `.agents/skills/<skill>/SKILL.md`, refresh `AGENTS.md` routing, and update `.echo/state.json` only after clean-state validation.

## Scope
- Register and dispatch `echo skills use <skill_name>`.
- Verify the current workflow state is clean before mutation.
- Apply one selected language, framework, or architecture skill according to catalog rules.
- Create the selected skill file from its template.
- Refresh generated routing in `AGENTS.md`.
- Update `.echo/state.json` with selected skill metadata and current hashes/template versions.

## Out of Scope
- Adding multiple skills in one command.
- Replacing an existing architecture skill.
- Handling broad drift repair inside the command.

## Acceptance Criteria
- In a clean Echo repo, `echo skills use typescript` creates and records the TypeScript skill when it is available and not already selected.
- `AGENTS.md` routing includes the newly selected skill after the command completes.
- `.echo/state.json` reflects the new selection and managed file metadata.
- The command output explains what changed.
- Running the command for an already selected skill exits successfully without changing files.

## Validation
- Run `pnpm build` and `pnpm check`.
- Smoke test an existing clean repo with `echo skills use typescript`.
- Smoke test the already-selected case and confirm it is a no-op success.
