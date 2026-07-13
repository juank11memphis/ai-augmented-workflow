# Storytelling Structured Logging Guidance Feature Brief

## Summary

Storytelling Structured Logging Guidance makes structured, useful, safe logging a required part of Sibu's code-writing workflow guidance. Whenever an AI agent writes or modifies code, it should know how Sibu expects logs to work: choose the project's ecosystem-standard logging approach, emit structured machine-readable logs for meaningful operational events, keep sensitive data out, and make logs tell the story of what happened without turning every log call into a noisy block of boilerplate.

## Product Vision Fit

This feature supports Sibu's promise of faster AI-assisted development without lowering engineering standards. Logging is a quality and maintainability concern that AI agents often handle inconsistently unless the workflow makes the expectation explicit. By making structured logging guidance a required code-writing support skill, Sibu helps developers keep AI-generated code observable, reviewable, and easier to troubleshoot while preserving human ownership over project-specific conventions.

The feature fits Sibu's philosophy of strong defaults without a cage: Sibu should define the logging principles and workflow expectation, while each project still chooses the language- and ecosystem-appropriate logger, helper shape, and local conventions.

## Business Domain Model Fit

This feature belongs to **Skill Guidance** within the Sibu domain. It adds a required built-in support skill for code-writing contexts rather than a user-facing application feature or autonomous agent behavior.

Relevant domain concepts and boundaries:

- **Skill**: the structured logging guidance is a focused unit of AI workflow guidance.
- **Workflow**: code-writing skills and implementation workflows should carry the logging expectation as part of the repo-local AI collaboration setup.
- **Artifact / Workflow File**: the guidance is project-owned once installed, even if Sibu manages it.
- **Small Work Loop**: logs should support validation, diagnosis, and review of small code changes.
- **User Control**: Sibu guides logging quality, but the project can still adapt local helper APIs, library choices, and conventions.

This feature does not change Sibu into an observability product. It guides agents on how to write code with better logging; it does not collect logs, operate a logging backend, or prescribe a universal runtime logging stack.

## Capability Coverage

This feature is supported by existing capabilities:

- **Provide focused skills**: Sibu supplies task-specific guidance; structured logging becomes a required support skill for code-writing work.
- **Define skill boundaries**: the logging skill owns logging principles and application triggers, while code-writing skills remain responsible for their broader implementation guidance.
- **Preserve skill handoffs**: code-writing skills reference the canonical logging guidance instead of duplicating full instructions.
- **Route work to the right skill**: when work involves writing code, changing operational workflows, adding error handling, or touching observability-relevant behavior, agents apply the structured logging guidance.
- **Keep AI work reviewable**: structured logs make AI-generated behavior easier to understand, validate, and troubleshoot.
- **Provide workflow templates**: Sibu can ship the required support skill and references through managed workflow templates.

## User / Customer Problem

Developers want AI-generated code to be operationally understandable, not just syntactically correct. Without explicit guidance, agents may invent ad hoc `console.log` or print-style logging, omit important context, leak sensitive data, or create verbose logging code that distracts from the business logic.

The result is code that may work locally but becomes hard to troubleshoot later. Engineers reviewing or operating the code cannot easily reconstruct what happened, where it happened, why it failed, or which workflow/user/request/entity was involved.

## Business Goal

Improve the quality and trustworthiness of AI-generated code by making good logging a consistent default across Sibu's code-writing pipeline. The feature should reduce logging-related review feedback, improve troubleshooting readiness, and reinforce Sibu's position as a workflow that protects engineering craft while accelerating development.

## Target User / Scenario

This feature serves engineers and teams using Sibu-guided agents to write or modify code.

Typical scenarios include:

- implementing a workflow, command handler, job, integration, or operation with meaningful runtime behavior
- adding or changing error handling, retries, validation, or external service calls
- modifying existing code that already emits logs
- creating project-local logging helpers or wrappers when a project needs a logging convention
- reviewing AI-generated code for observability and operational quality

## Proposed Experience

Sibu provides a canonical required structured logging guidance skill. Code-writing guidance, including general clean-code guidance, language-specific guidance, implementation execution guidance, and workflow/command-pattern guidance, references that canonical skill instead of duplicating the full logging policy.

When an agent writes or modifies code, it should apply the logging guidance whenever the change introduces or affects meaningful operational behavior. The guidance should lead the agent to:

- follow existing project logging conventions when present
- otherwise choose a widely accepted logging library for the language, framework, and ecosystem
- prefer structured JSON logs for important good and bad events
- use clear event names and consistent fields
- include useful troubleshooting metadata such as workflow/request/correlation identifiers, entity identifiers, outcomes, timings, counts, states, and safe error context
- make logs tell a coherent story of what happened before, during, and after important decisions or failures
- avoid secrets, credentials, tokens, raw personal data, full prompts/responses, and large user payloads
- create or use a small first-party project-local logging helper that wraps the third-party logger and centralizes conventions
- keep individual log calls concise so adding a useful log does not become a 10-line block of boilerplate

## MVP Scope

- Add a required built-in structured logging guidance skill or equivalent canonical guidance module.
- Wire all Sibu-managed code-writing guidance to reference the canonical logging guidance when code changes involve logging, operational workflows, handlers, jobs, external calls, errors, retries, or other observability-relevant behavior.
- Define when agents should proactively add logs: meaningful workflows, state changes, external interactions, failures, retries, long-running operations, and important outcomes.
- Define when agents should avoid logs: trivial pure logic, noisy implementation details, or places where logs would add clutter without operational value.
- Require structured, searchable logs for meaningful events.
- Require logs to tell an operational story with useful metadata.
- Require sensitive-data-safe logging practices.
- Encourage a project-local logging helper/wrapper while avoiding a globally prescribed helper API.
- Instruct agents to follow existing repo logging conventions before introducing new ones.

## Out of Scope

- Choosing one universal logging library for every project or language.
- Defining a universal logging helper API that every project must use.
- Building log collection, storage, dashboards, tracing infrastructure, alerting, or observability backends.
- Rewriting existing project logging systems unless a specific code task calls for it.
- Forcing logs into tiny pure functions or trivial code paths where logging would create noise.
- Making structured logging an optional selectable skill; this feature treats it as required code-writing guidance.

## Success Signals

- AI-generated code stops inventing ad hoc print-style logging for important workflows.
- Important operational events use structured, machine-readable fields.
- Logs tell a coherent troubleshooting story across workflows and failures.
- Log entries include useful metadata without leaking secrets or sensitive user data.
- Logging calls remain concise because project-local helpers centralize conventions.
- Code reviews contain fewer comments about missing, noisy, unsafe, or low-value logging.
- Developers can more quickly understand what happened when troubleshooting AI-generated or AI-modified code.

## Business-Level Acceptance Criteria

- When Sibu-guided agents write or modify code with meaningful operational behavior, they are instructed to apply the canonical structured logging guidance.
- Code-writing skills reference one canonical logging guidance source rather than duplicating the full policy independently.
- The guidance tells agents to follow existing project logging conventions first, then choose a widely accepted ecosystem-standard logger when a project lacks a convention.
- The guidance requires structured logs for important operational events.
- The guidance requires logs to include useful troubleshooting metadata and safe error context.
- The guidance explicitly prevents logging secrets, credentials, tokens, raw personal data, full prompts/responses, or large user payloads.
- The guidance encourages first-party project-local logging helpers to keep individual log calls concise.
- The guidance distinguishes meaningful operational logging from noisy logging in trivial or pure code.

## Risks / Tradeoffs

- If the guidance is too broad, agents may over-log and make code noisy.
- If the guidance is too abstract, agents may continue producing inconsistent logging choices.
- If the guidance is duplicated across skills, it may drift over time; a canonical support skill reduces this risk.
- If agents choose libraries without checking existing repo conventions, they may introduce unnecessary dependencies or inconsistency.
- If metadata expectations are too rigid, they may not fit every language, framework, or runtime environment.
