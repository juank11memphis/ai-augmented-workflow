# Technical Design: Storytelling Structured Logging Guidance

## Inputs

- Product vision: `docs/product-vision.md`
- Deep Module Map: `docs/deep-module-map.md`
- Feature brief: `docs/features/storytelling-structured-logging-guidance/feature_brief.md`
- Delegated skills: `clean-code`, `sibu-template-change`

## Summary

Implement this as a required Skill Guidance and Template Catalog change. Add a canonical `structured-logging` skill, wire code-writing guidance to apply it, update this repository's active workflow files to dogfood it immediately, and update template manifest metadata so future `sibu init` and `sibu sync` flows distribute and explain the change. No CLI runtime behavior, state schema, or sync orchestration changes are needed unless existing template tests reveal assumptions that must be updated.

## Existing Context

- `templates/skills/` is the source for Sibu-managed skill templates.
- `.agents/skills/` is this repository's active installed skill workspace and should be updated to dogfood required workflow guidance immediately.
- `templates/AGENTS.md` contains baseline skill-routing rules, including the rule that code-writing tasks use `clean-code`.
- Root `AGENTS.md` is this repository's rendered project-owned copy of the baseline agent instructions.
- `templates/skills/clean-code/SKILL.md` is the mandatory general code-writing skill.
- `templates/skills/typescript/SKILL.md`, `templates/skills/golang/SKILL.md`, architecture skills, and implementation executor/planner skills participate in code-writing flows and should reference the canonical logging skill where relevant instead of duplicating the full policy.
- `templates/manifest.json` owns the global template version, per-template versions, descriptions, and user-facing `changes` notes used by Sibu maintenance flows.
- The Deep Module Map places this work across **Template Catalog** and **Skill Guidance**: the feature adds required skill guidance and distributes it through versioned templates.
- Existing Workflow Installer, Workflow Health Inspector, and Sync Review Orchestrator behavior should naturally install, detect, and explain updated templates through manifest metadata.

## Proposed Design

### Module boundary

This change belongs to **Template Catalog** and **Skill Guidance**.

- Skill Guidance owns the new canonical `structured-logging` skill content and the cross-skill usage contract.
- Template Catalog owns the versioned template files, manifest entries, template version bumps, and sync-facing change notes.
- Workflow Installer should pick up the required skill template through existing required-template selection behavior.
- Workflow Health Inspector should detect older managed skill and instruction files through existing manifest version comparisons.
- Sync Review Orchestrator should present the update using existing manifest change notes.
- No work should be added to Workflow State Ledger, Workflow Configuration Manager, Agent Tool Configuration, or Maintainer Release Support for this feature.

### Canonical skill

Add a required canonical skill named `structured-logging`:

```txt
templates/skills/structured-logging/SKILL.md
.agents/skills/structured-logging/SKILL.md
```

The skill should be concise and operational. It should define:

- when to apply the skill: writing or modifying code that emits logs, implements meaningful workflows/handlers/jobs, touches external calls, errors, retries, long-running operations, state changes, or observability-relevant behavior
- when not to add logs: trivial pure logic, noisy implementation details, or code paths where logs do not improve diagnosis
- library selection rule: follow existing project conventions first; otherwise choose a widely accepted logger for the current language/framework/ecosystem
- structured output rule: important events should use structured, machine-readable logs, preferably JSON when supported by the logger/runtime
- storytelling rule: logs should reveal what happened before, during, and after key decisions, workflow steps, outcomes, and failures
- metadata rule: include useful safe fields such as event name, operation/workflow name, request/correlation identifiers when available, entity identifiers, counts, timings, states, outcomes, and safe error context
- safety rule: never log secrets, credentials, tokens, raw personal data, full prompts/responses, or large user payloads
- helper rule: prefer a small first-party project-local logging helper/wrapper around the chosen logger so individual log calls remain concise
- dependency restraint: do not introduce a new logging dependency when the repository already has a reasonable logging convention

Do not prescribe one universal logger or one universal helper API.

### Wiring into code-writing guidance

Update the source templates and active dogfood copies for code-writing guidance so they reference `structured-logging` as the canonical source of truth rather than duplicating the full policy.

Required wiring:

- `templates/AGENTS.md` and root `AGENTS.md`
  - Add a skill-routing rule: for code-writing tasks that introduce or modify logging, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes, or other observability-relevant behavior, use `structured-logging`.
- `templates/skills/clean-code/SKILL.md` and `.agents/skills/clean-code/SKILL.md`
  - Add a compact observability/logging principle that delegates detailed rules to `structured-logging`.
- Implementation execution guidance:
  - `templates/skills/ai-implementation-plan-executor/SKILL.md`
  - `.agents/skills/ai-implementation-plan-executor/SKILL.md`
  - `templates/skills/ai-implementation-executor-toolbox/SKILL.md`
  - `.agents/skills/ai-implementation-executor-toolbox/SKILL.md`
  - Include `structured-logging` in required or relevant skill packet guidance when the story involves observability-relevant code.
- Language and architecture skills that commonly participate in code-writing:
  - Add short references where appropriate to TypeScript, Golang, and command-pattern templates and dogfood copies.
  - Keep these references minimal; do not repeat the structured logging policy.

If a selectable skill template does not exist in `.agents/skills/` for this repository, update only its template source.

### Manifest update

Update `templates/manifest.json`:

- increment global `templateVersion`
- add a manifest entry for `skills/structured-logging/SKILL.md`
- mark the skill as required/mandatory consistently with existing required skills such as `clean-code`
- add user-facing `changes` notes for the new skill
- increment each changed template's own `version`
- replace each changed template's `changes` notes with notes for the current template version only

Change notes should explain outcomes, for example:

- Added required structured logging guidance for code-writing workflows.
- Routed code-writing skills to apply structured logging guidance for operational behavior.
- Updated implementation executor guidance to include structured logging when stories touch observability-relevant code.

Do not bump unrelated template versions.

### Tests and version expectations

Update focused tests that assert manifest/template expectations. Useful coverage:

- manifest contains `skills/structured-logging/SKILL.md`
- the structured logging template exists and has `name: structured-logging`
- the structured logging template mentions safe structured logs, project conventions, helper/wrapper guidance, and sensitive-data exclusions
- `templates/AGENTS.md` contains the structured logging routing rule
- `templates/skills/clean-code/SKILL.md` references `structured-logging`
- implementation executor/planner templates include structured logging in relevant skill packet guidance
- global and changed template version expectations match the new manifest values

Prefer high-level assertions over brittle full-prose checks.

### Existing feature idea cleanup

The promoted idea has already been removed from `docs/feature-ideas.md` after creating the feature brief. No further feature-idea migration work is needed.

## Validation

- Run focused template tests, using the repository's existing template-catalog test command if available.
- Run the broader repository test suite when focused coverage is uncertain:
  - `pnpm run test`
- Run build if template tests depend on compiled output:
  - `pnpm run build`
- Run `sibu doctor` after implementation. It may report expected drift because active workflow files and templates changed; do not auto-sync or overwrite local state unless the implementation story explicitly includes maintenance review.
- When practical, validate lifecycle behavior in a temporary project:
  - `sibu init`
  - `sibu doctor`
  - `sibu sync`

## Risks / Tradeoffs

- Making the skill required increases baseline workflow size; keep the skill concise and avoid repeating it in every code-writing skill.
- Weak routing language may let agents miss the skill; use explicit triggers in AGENTS and implementation packet guidance.
- Overly broad logging guidance may cause noisy logs; the skill must clearly distinguish meaningful operational behavior from trivial pure code.
- Updating this repo's active `.agents/skills` and root `AGENTS.md` may leave Sibu reporting workflow drift until reviewed through normal maintenance flows.
