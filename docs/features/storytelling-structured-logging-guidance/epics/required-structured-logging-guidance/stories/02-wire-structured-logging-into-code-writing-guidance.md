# Wire Structured Logging into Code-Writing Guidance

## Epic

[Required Structured Logging Guidance](../epic_brief.md)

## User Story

As a Sibu user relying on AI-generated code, I want code-writing workflows to automatically reference the canonical structured logging skill, so that agents apply the logging policy whenever implementation work affects meaningful operational behavior.

## Context

The canonical skill alone is not enough; agents must be routed to it from the normal code-writing paths. The technical design requires AGENTS routing, clean-code delegation, implementation executor packet guidance, and short references from relevant language and architecture skills without duplicating the full logging policy.

## Scope

- Update `templates/AGENTS.md` and root `AGENTS.md` with a skill-routing rule for `structured-logging`.
- Update `templates/skills/clean-code/SKILL.md` and `.agents/skills/clean-code/SKILL.md` with a compact observability/logging principle that delegates details to `structured-logging`.
- Update implementation execution guidance templates and active copies so executor packets include `structured-logging` when stories touch observability-relevant code.
- Add minimal references in relevant language and architecture skill templates, including TypeScript, Golang, and command-pattern guidance, without duplicating the canonical logging policy.
- Update dogfood copies for relevant installed skills when they exist under `.agents/skills/`.
- Update `templates/manifest.json` versions and current change notes for every changed template.
- Add or update focused tests that protect the routing and delegation behavior.

## Out of Scope

- Repeating the full structured logging policy in every skill.
- Adding `structured-logging` to exporter or non-code-writing workflows.
- Changing implementation execution semantics beyond skill packet/routing guidance.
- Running `sibu sync` or modifying Sibu state metadata as part of the story.

## Acceptance Criteria

- AGENTS skill routing instructs agents to use `structured-logging` for code-writing tasks involving logs, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes, or observability-relevant behavior.
- Clean-code guidance delegates logging details to `structured-logging` while preserving clean-code's general purpose.
- Implementation executor guidance can pass `structured-logging` to worker packets when a story involves observability-relevant code.
- Relevant language and architecture guidance references `structured-logging` only briefly and does not duplicate the canonical policy.
- Template manifest versions and change notes are updated for all changed templates and no unrelated template versions are bumped.
- Focused tests assert the presence of key routing/delegation hooks without brittle full-prose checks.

## Validation

- Run focused template-catalog tests for AGENTS, skill templates, manifest versions, and changed-template expectations.
- Run `pnpm run test` if focused coverage is uncertain.
- Run `pnpm run build` if needed by the repository test flow.
- Run `sibu doctor` and treat any reported drift from dogfood/template changes as an expected maintenance signal, not as permission to auto-sync.

## Notes

- Use `sibu-template-change` during implementation because this story changes managed templates and manifest metadata.
- The desired result is explicit routing plus one canonical policy source, not policy duplication across every code-writing skill.
