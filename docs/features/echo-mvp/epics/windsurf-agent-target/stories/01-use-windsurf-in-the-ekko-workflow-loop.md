# Use Windsurf in the Echo Workflow Loop

## Epic
[Windsurf Agent Target](../epic_brief.md)

## User Story
As a developer who uses Windsurf, I want Echo to support Windsurf as an agent target, so that I can participate in the same managed AI workflow loop as Codex, Claude, and Gemini users.

## Context
The feature brief requires Windsurf as a first-class MVP agent target. The technical design grounds Windsurf support in root `AGENTS.md` instructions and shared `.agents/skills/` discovery, not deep editor integration.

## Scope
- Add `windsurf` to `AgentId` and supported-agent catalog entries.
- Allow supported agents to omit agent-specific target and template paths.
- Include workflow targets only when an agent has both target and template paths.
- Add Windsurf target mappings for skill templates using shared `.agents/skills/.../SKILL.md` paths.
- Ensure state reading, `doctor`, and `sync` accept selected Windsurf state.

## Out of Scope
- Generating Windsurf-only workspace skill templates in `.windsurf/skills`.
- Automating Windsurf editor behavior.
- Changing the common Echo skill layout away from `.agents/skills/`.

## Acceptance Criteria
- A fresh repo can select Codex, Claude, Gemini, and Windsurf during `echo init`.
- A Windsurf-selected repo records `windsurf` as a supported selected agent.
- `echo doctor` does not reject a valid state file because it includes Windsurf.
- `echo sync` handles Windsurf-selected workflow targets without expecting an unnecessary Windsurf-specific file.
- Skill routing for Windsurf uses the shared `.agents/skills/` files.

## Validation
- Run `pnpm build` and `pnpm check`.
- Smoke test a fresh repo selecting Codex, Claude, Gemini, and Windsurf.
- Smoke test `doctor` and `sync` against a Windsurf-selected repo.
