# Conversational Eval Loop Epic Brief

**Epic ID:** AGE-EP-01

## Summary
Enable a developer to run, diagnose, repair, and verify repo-local evals in Codex or Claude Code without switching to the Sibu Evals UI, while retaining explicit approval for each concrete fix.

## Source Context
- BRD: `docs/features/agent-guided-evals/brd.md`, Scope and Exclusions, Requirements `REQ-01`–`REQ-10`, and Business Rules `RULE-01`–`RULE-04`.
- Technical design: `docs/features/agent-guided-evals/sdd.md`, Architecture and responsibilities, Command contracts and boundaries, Main interaction and verification loop, Safety, state, and failure behavior, and Quality strategy.
- Domain and capabilities: `docs/business-domain-model.md`, Local Evals Workbench and Agent-Guided Eval Session; `docs/capabilities-map.md`, Local Evals Workbench capabilities for suite discovery, agent-based sessions, one-failure analysis, approved repair, and automatic verification.
- UX: not applicable; the existing Evals UI is unchanged, and the conversation uses external coding-agent interfaces.

## Scope
- A non-UI Sibu eval path using the existing suite, runner, and artifact contracts.
- A mandatory agent-guided troubleshooting workflow available in Codex and Claude Code, separate from eval authoring.
- User-approved harness edits, automatic focused verification, sequential failure handling, and final full-suite validation when the suite was selected.

## Out of Scope
- Evals UI redesign, replacement, or a parallel eval engine; automatic unapproved repairs; cost controls; headless CI, hosted evals, multi-model comparison, and real external-tool side effects.

## User Stories and Sequence
1. [AGE-US-01 — Run and inspect evals without the UI](./stories/01-run-and-inspect-evals-without-ui.md) — deliver a complete headless run-and-evidence path; no Story dependency.
2. [AGE-US-02 — Troubleshoot one case in a coding agent](./stories/02-troubleshoot-one-case-in-agent.md) — depends on AGE-US-01; deliver the approval-gated conversational repair loop for one selected case in both agents.
3. [AGE-US-03 — Resolve a full suite sequentially](./stories/03-resolve-full-suite-sequentially.md) — depends on AGE-US-02; extend the proven loop to multiple failures and final suite verification.

## Feature Flags
- none. Each Story leaves a working, safely bounded increment; incomplete guided scope is explicitly unavailable until the Story that delivers it.

## Acceptance Criteria
- A developer can complete the failing-run-to-approved-fix-to-verified-rerun path in one Codex or Claude Code conversation without opening the UI (`REQ-01`–`REQ-08`).
- Multiple failures are addressed one at a time; a full-suite session claims success only after its final suite rerun (`REQ-03`, `REQ-05`–`REQ-07`).
- Existing Evals UI and authoring behavior remain usable, and blocked or uncertain outcomes never become success claims (`REQ-09`, `REQ-10`).

## Dependencies / Risks
- Uses the existing Local Evals Workbench suite, runner, and artifact operations; the headless CLI must await a terminal run outcome rather than abandon queued work.
- Conversational approval is governed by agent instructions and host permissions, not a Sibu mutation gate. Disposable live-agent evaluations are needed to observe behavior but cannot guarantee future compliance.
