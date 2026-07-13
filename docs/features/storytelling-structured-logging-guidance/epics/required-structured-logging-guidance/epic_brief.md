# Required Structured Logging Guidance Epic Brief

## Summary

Deliver required structured logging guidance across Sibu's code-writing workflow. This Epic adds a canonical `structured-logging` skill, makes it available through Sibu-managed templates and this repo's active workflow files, and wires code-writing guidance to apply it whenever implementation work touches meaningful operational behavior.

## Source Context

- Feature brief: `../../feature_brief.md`
- Technical design: `../../technical_design.md`

## Scope

- Add a canonical required `structured-logging` skill template and active dogfood copy.
- Register the new required skill in template manifest metadata with user-facing sync notes.
- Wire AGENTS, clean-code, implementation executor, and relevant language/architecture skill guidance to reference `structured-logging` instead of duplicating its full policy.
- Add or update focused tests and manifest version expectations for the new required skill and routing guidance.
- Validate template behavior through the repository's existing build/test and Sibu health-check flows.

## Out of Scope

- Selecting a universal logging library or helper API for every project.
- Building log collection, dashboards, tracing, alerting, or runtime observability infrastructure.
- Changing CLI runtime behavior, workflow state schema, sync orchestration, or tool configuration behavior unless existing tests reveal a required template-catalog adjustment.
- Rewriting existing project application logging implementations.

## User Stories

- [Add the required structured logging skill](./stories/01-add-required-structured-logging-skill.md)
- [Wire structured logging into code-writing guidance](./stories/02-wire-structured-logging-into-code-writing-guidance.md)

## Acceptance Criteria

- Sibu includes a required canonical `structured-logging` skill in templates and this repo's active skill workspace.
- The new skill defines application triggers, non-trigger cases, library selection, structured/storytelling metadata expectations, sensitive-data safety, and project-local helper guidance.
- Code-writing guidance routes agents to use `structured-logging` for observability-relevant implementation work.
- Template manifest metadata and tests reflect the new required skill and changed templates.
- Validation confirms the template catalog remains coherent after the change.

## Dependencies / Risks

- Template updates must follow `sibu-template-change`: bump global and changed template versions, write current sync notes, and avoid unrelated version changes.
- Active dogfood updates may leave this repo reporting expected Sibu drift until reviewed through normal maintenance flows.
- Routing language must be explicit enough that agents apply the skill without causing noisy logging in trivial pure code.
