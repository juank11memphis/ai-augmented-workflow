# Add the Required Structured Logging Skill

## Epic

[Required Structured Logging Guidance](../epic_brief.md)

## User Story

As a Sibu user writing code with AI assistance, I want a canonical required structured logging skill to exist in the workflow, so that agents have one consistent source of truth for safe, useful, storytelling logs.

## Context

The feature brief requires structured logging guidance to be mandatory for code-writing contexts. The technical design names `structured-logging` as the canonical skill and places it in both Sibu templates and this repo's active `.agents/skills` workspace for immediate dogfooding.

## Scope

- Add `templates/skills/structured-logging/SKILL.md`.
- Add `.agents/skills/structured-logging/SKILL.md` with the same active guidance for dogfooding.
- Define when the skill applies and when agents should avoid adding logs.
- Define guidance for project conventions, ecosystem-standard logger selection, structured logs, storytelling metadata, sensitive-data exclusions, and concise project-local logging helpers.
- Register the required skill in `templates/manifest.json` with the appropriate template version metadata and user-facing change note.
- Add or update focused template tests that prove the skill exists and contains the required high-level guidance.

## Out of Scope

- Wiring every code-writing skill to use `structured-logging`; that is covered by the next story.
- Choosing language-specific logging libraries.
- Defining a universal logging helper API.
- Changing runtime CLI behavior, state schemas, or sync orchestration.

## Acceptance Criteria

- `templates/skills/structured-logging/SKILL.md` exists with `name: structured-logging`.
- `.agents/skills/structured-logging/SKILL.md` exists for immediate repo dogfooding.
- The skill explains observability-relevant triggers and explicitly avoids noisy logging in trivial or pure code.
- The skill tells agents to follow existing project logging conventions before adding a new logger.
- The skill requires safe structured logs that tell an operational story with useful metadata.
- The skill forbids logging secrets, credentials, tokens, raw personal data, full prompts/responses, and large user payloads.
- The skill encourages small project-local logging helpers/wrappers to keep log calls concise.
- `templates/manifest.json` includes the new required skill with current-version sync notes.
- Focused tests or checks cover the new template and manifest entry.

## Validation

- Run focused template-catalog tests for manifest/template expectations when available.
- Run `pnpm run test` if focused test coverage is uncertain.
- Run `pnpm run build` if tests depend on built output.

## Notes

- Use `sibu-template-change` during implementation because this story changes `templates/` and `templates/manifest.json`.
- Keep assertions high-level rather than checking the full prose of the skill.
