# Run and Inspect Evals Without the UI

**Story ID:** AGE-US-01

## Epic
[Conversational Eval Loop](../epic_brief.md)

**Status:** ready-for-planning

## User Story
As a developer, I want to discover, run, and inspect my repo-local evals without opening the browser workbench, so that an agent conversation can use the same trustworthy results.

## Context and Source Traceability
- BRD: `docs/features/agent-guided-evals/brd.md`, `REQ-01`, `REQ-02`, `REQ-09`, `REQ-10`, `AC-01`, `AC-06`, `AC-07`.
- SDD: `docs/features/agent-guided-evals/sdd.md`, Architecture and responsibilities, Command contracts and boundaries, Main interaction and verification loop, Safety, state, and failure behavior.
- Domain and capability: `docs/business-domain-model.md`, Local Evals Workbench, Eval Suite, Eval Run, and Eval Result; `docs/capabilities-map.md`, Discover local eval suites, Select compatible evaluation models, Run focused eval scope, Preserve isolated run evidence, and Inspect failure evidence.
- UX: not applicable.

## In Scope
- A structured, non-UI path to list suites/cases, describe compatible evaluation and judge models, run all cases or one case to a terminal state, and read bounded run and selected-failure evidence.
- Reuse of the existing suite format, runner, artifact store, and safety checks; preservation of the current `sibu evals` browser launch.

## Out of Scope
- Agent diagnosis, repair proposals, or project-file edits; mandatory agent workflow installation; automatic repair-loop orchestration.

## Acceptance Criteria
- **AC-01 — Discover and select:** A caller can list valid suites and case IDs, then see compatible evaluation models and judge requirements for a selected scope (`REQ-01`, `REQ-02`). Verification: test.
- **AC-02 — Complete a headless run:** A selected case or whole suite reaches a terminal outcome with a run ID and persisted result without a browser or running HTTP workbench (`REQ-02`, `REQ-10`). Verification: test.
- **AC-03 — Inspect bounded evidence:** A caller can obtain a concise run summary and evidence for one selected failed assertion, without dumping the full run into ordinary agent context (`REQ-09`, `REQ-10`). Verification: test.
- **AC-04 — Preserve existing behavior and failure truth:** `sibu evals` still launches the UI; invalid scope, unavailable model/judge, runner failure, partial run, and unsafe artifacts return truthful blocked or error outcomes rather than false passes (`REQ-09`, `REQ-10`). Verification: test.

## Verification Expectations
- Handler tests with fake ports cover selection, terminal-state waiting, persistence, and bounded evidence. CLI/fixture integration tests compare headless and UI suite/result semantics and exercise blocked and interrupted outcomes. No live LLM belongs in routine tests.

## Validation
- Planned: `pnpm run check`, `pnpm run test`, `pnpm run validate:packed-runtime`; targeted headless CLI fixture checks from the installed package.

## Domain Context
Primary bounded context: Local Evals Workbench. An Eval Run uses one Model Under Evaluation and, when needed, one Judge Model; run artifacts remain project-owned and isolated.

## Technical Context
Add a headless command-oriented slice inside `local-evals-workbench` and thin JSON CLI adapters. Reuse existing module contracts through public boundaries as described in the SDD; do not build a second runner or analysis service.

## UX References
not applicable.

## Non-Functional Criteria
No browser/server dependency for headless runs; bounded evidence and truthful terminal/blocked states per `REQ-09` and the SDD safety boundary.

## Deployability and Feature Flag
**Behind flag:** no. This is a complete optional CLI run-and-inspect capability. The unchanged browser workbench remains the existing default `sibu evals` behavior; no agent skill depends on this Story being merged first to keep current behavior working.

## Dependencies
Blocks AGE-US-02; otherwise none.

## Open Questions and Assumptions
- Accepted assumption: the SDD's shared JSON CLI operations are the agent-facing contract; no separate MCP interface is required for this increment.
