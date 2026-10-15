# Resolve a Full Suite Sequentially

**Story ID:** AGE-US-03

## Epic
[Conversational Eval Loop](../epic_brief.md)

**Status:** done

## User Story
As a developer, I want the agent to work through a failing suite one issue at a time and verify the full suite at the end, so that several failures can be resolved without repeated UI handoffs or premature success claims.

## Context and Source Traceability
- BRD: `docs/features/agent-guided-evals/brd.md`, `REQ-03`–`REQ-08`, `REQ-09`, `AC-02`, `AC-04`, `AC-05`, `RULE-01`, `RULE-03`, `RULE-04`.
- SDD: `docs/features/agent-guided-evals/sdd.md`, Main interaction and verification loop, Safety, state, and failure behavior, Quality strategy and planned verification, Risks and tradeoffs.
- Domain and capability: `docs/business-domain-model.md`, Agent-Guided Eval Session lifecycle and one-active-failure invariant; `docs/capabilities-map.md`, Analyze one failed assertion at a time, Verify approved repairs automatically, and Validate selected suite after focused repairs.
- UX: not applicable.

## In Scope
- Guided full-suite selection and execution in Codex and Claude Code using the existing headless eval contract.
- Sequential active-failure handling: verify the current failure after each approved fix, reanalyze it if it persists, confirm later failures against current code when earlier edits could make old evidence stale, and only then advance.
- A final full-suite rerun after known failures are resolved; remaining failures re-enter the same bounded loop, and uncertain or non-converging work stops honestly.

## Out of Scope
- Parallel diagnosis, automatic fix selection, repeated reruns to fish for a pass, multi-model comparison, and changes to the browser UI.

## Acceptance Criteria
- **AC-01 — One active failure:** A multi-failure suite yields diagnosis and fix options for one assertion at a time; the agent does not advance until a fresh focused result shows that assertion passing (`REQ-03`, `REQ-05`). Verification: needs human/LLM-judge review.
- **AC-02 — Reanalyze persistence:** If a focused rerun still fails, the agent uses the new evidence for the same failure and waits for another approved fix rather than editing or moving on silently (`REQ-06`). Verification: needs human/LLM-judge review.
- **AC-03 — Avoid stale repairs:** After an earlier edit, the agent obtains current focused evidence before proposing a fix for a later failure whose only evidence predates that edit (`REQ-03`, `REQ-05`). Verification: needs human/LLM-judge review.
- **AC-04 — Validate the suite:** After resolving known failures, the agent runs the full suite again; it claims suite success only if that run passes, otherwise it addresses remaining failures one at a time or reports a blocker (`REQ-07`, `REQ-09`). Verification: needs human/LLM-judge review.
- **AC-05 — Keep single-case behavior:** The single-case agent loop and existing UI remain usable after full-suite support is added (`REQ-05`, `REQ-08`). Verification: test.

## Verification Expectations
- Disposable fixture suites cover multiple failures in one case and across cases, a persistent failure, a later failure invalidated by an earlier edit, and a final-suite regression. Unit/static checks may verify deterministic state and instruction contracts but cannot prove agent adherence; explicitly authorized live-agent evaluations in both hosts provide observed behavior evidence separately.

## Validation
- Planned: `pnpm run check`, `pnpm run test`, `pnpm run validate:packed-runtime`; separate live-agent evaluations only when explicitly in scope and authorized.

## Domain Context
Primary bounded context: Local Evals Workbench. An Agent-Guided Eval Session may contain multiple Eval Runs but has only one active Failed Assertion. Each approved repair is verified by a new focused run, and full-suite success requires its own final run.

## Technical Context
Extend the mandatory agent-guided-evals workflow from AGE-US-02 using the SDD's selected-failure ordering, freshness, and final-suite rules. Reuse the run/evidence operations from AGE-US-01; do not add a new runner or persistence model.

## UX References
not applicable.

## Non-Functional Criteria
No success claim from an edit alone or a stale run; no new unapproved edits when a failure persists, per `REQ-06`, `REQ-07`, and `REQ-09`.

## Deployability and Feature Flag
**Behind flag:** no. This Story completes the guided full-suite behavior while preserving the already working single-case path and UI; it changes no unrelated execution surface.

## Dependencies
Depends on AGE-US-02; blocks none.

## Open Questions and Assumptions
- Accepted assumption: a focused passing run verifies the current assertion for that run only; the final full-suite rerun is the required suite-wide evidence, not a determinism guarantee.
