# Troubleshoot One Case in a Coding Agent

**Story ID:** AGE-US-02

## Epic
[Conversational Eval Loop](../epic_brief.md)

**Status:** in-progress

## User Story
As a developer, I want Codex or Claude Code to diagnose a failed eval case, discuss fixes with me, and verify only the fix I approve, so that I can troubleshoot without switching to the Evals UI.

## Context and Source Traceability
- BRD: `docs/features/agent-guided-evals/brd.md`, `REQ-01`–`REQ-06`, `REQ-08`–`REQ-10`, `AC-01`–`AC-04`, `AC-06`, `AC-07`, `RULE-01`–`RULE-04`.
- SDD: `docs/features/agent-guided-evals/sdd.md`, Architecture and responsibilities, Main interaction and verification loop, Safety, state, and failure behavior, Quality strategy and planned verification, Risks and tradeoffs.
- Domain and capability: `docs/business-domain-model.md`, Agent-Guided Eval Session, Failure Analysis, Repair Proposal, and Approved Eval Repair; `docs/capabilities-map.md`, Guide agent-based eval sessions, Explain agent-guided failures plainly, Gate repair mutations by approval, and Verify approved repairs automatically.
- UX: not applicable.

## In Scope
- Mandatory, separate agent-guided-evals skill distributed to Codex and Claude Code and routed from a natural request to work on evals.
- A complete single-case conversation: suite/case/model choice, run, bounded automatic diagnosis, concise possible fixes, explicit approval of one concrete fix, host-harness edit with changed-file report, and automatic focused rerun; a still-failing assertion returns to analysis without another edit.
- Honest stop behavior for declined fixes, unsafe or unexpected edit scope, missing credentials, ambiguous expectations, or runner/judge failures.

## Out of Scope
- Automated progression across multiple cases or a full-suite session; new UI behavior; a Sibu-enforced chat approval or mutation endpoint; live-model calls in the routine unit-test suite.

## Acceptance Criteria
- **AC-01 — Available in both agents:** In Codex and Claude Code, a natural eval request reaches the mandatory troubleshooting workflow and can start a selected single-case run without opening the UI (`REQ-01`, `REQ-02`, `REQ-08`). Verification: needs human/LLM-judge review.
- **AC-02 — Explain one failure:** The agent automatically analyzes the active failed assertion using bounded evidence and presents a short likely cause, uncertainty, and possible fixes; runner, credential, and judge blocks are not mislabeled as prompt failures (`REQ-03`, `REQ-09`). Verification: needs human/LLM-judge review.
- **AC-03 — Respect concrete approval:** Before an edit, the agent names the proposed fix and paths and waits for approval; after approval it uses its normal host editing tools, reports actual changed files, and stops if the edit scope is unexpected (`REQ-04`, `REQ-09`). Verification: needs human/LLM-judge review.
- **AC-04 — Verify, then continue or stop:** An approved edit triggers a fresh focused rerun without another routine prompt. If the assertion still fails, the agent explains the new result and waits for another fix decision; if it passes, it reports only that verified outcome (`REQ-05`, `REQ-06`). Verification: needs human/LLM-judge review.
- **AC-05 — Preserve existing paths:** The mandatory eval-authoring skill and browser workbench remain usable, with the same suites and run evidence (`REQ-10`). Verification: test.

## Verification Expectations
- Static/template and package tests prove installation and routing text, not agent behavior. Isolated, explicitly authorized live-agent evaluations with disposable single-case fixtures should observe approval, edit scope, rerun, and blocked paths in both Codex and Claude Code; report nondeterministic limits.

## Validation
- Planned: `pnpm run check`, `pnpm run test`, `pnpm run validate:packed-runtime`; separate live-agent evaluations only when explicitly in scope and authorized.

## Domain Context
Primary bounded context: Local Evals Workbench. One active Failed Assertion has bounded Failure Analysis; each Repair Proposal and approval is specific to one concrete fix. External coding agents perform the edit after the developer's decision.

## Technical Context
Install mandatory skill guidance via Template Catalog and agent routing. It consumes the headless CLI contract from AGE-US-01, uses host-agent reasoning rather than Sibu's UI assistance provider, and relies on native harness editing permissions rather than a new Sibu mutation API.

## UX References
not applicable.

## Non-Functional Criteria
Bounded evidence, no secret/credential edits, truthful blocked outcomes, and no unapproved file changes per `REQ-04`, `REQ-09`, and the SDD risk boundary.

## Deployability and Feature Flag
**Behind flag:** no. This Story delivers a complete single-case repair loop. Until AGE-US-03, the installed skill must clearly decline guided full-suite troubleshooting rather than start an incomplete multi-case loop; the CLI's complete full-suite run-and-inspect path from AGE-US-01 remains available.

## Dependencies
Depends on AGE-US-01; blocks AGE-US-03.

## Open Questions and Assumptions
- Accepted assumption: user approval in the agent conversation plus native host permissions is the chosen gate; it is not a Sibu-enforced authorization guarantee.
