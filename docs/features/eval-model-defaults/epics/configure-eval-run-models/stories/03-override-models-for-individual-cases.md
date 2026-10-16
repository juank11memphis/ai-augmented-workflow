# Override Models for Individual Cases

**Story ID:** EMD-S03

## Epic

[Configure Eval Run Models](../epic_brief.md)

**Status:** in-progress

## User Story

As an engineer running a full eval suite, I want selected test cases to use their own evaluation or judge model while the others inherit suite defaults, so that I can evaluate granular scenarios without repeated setup or misleading results.

## Context and Source Traceability

- BRD: [Eval Model Defaults](../../../brd.md), REQ-02, REQ-03, REQ-05, REQ-06 and AC-03, AC-05, AC-06.
- SDD: [Software Design](../../../sdd.md), Project-Owned Suite Format and Persistence, Main Flow and Runner Coordination, Run Evidence, and Quality Strategy.
- Domain and capability: [Business Domain Model](../../../../../business-domain-model.md), Test-Case Model Override, Eval Run, and unavailable choice rules; [Capabilities Map](../../../../../capabilities-map.md), Manage test-case model overrides, Resolve models for eval runs, and Resolve unavailable eval model choices.
- UX: [UX Spec](../../../ux.md), selected-case context, Test-case models dialog, blocked choice, and case-first results at all breakpoints.

## In Scope

- Let users select one test case, set/change either model override, and reset it to suite inheritance through the Test-case models dialog; keep the saved suite default required.
- Resolve all selected cases before paid execution, pause for unavailable overrides, and offer explicit replacement or reset to inheritance in both UI and agent-guided flow.
- Extend the ordered model-pair batching established in EMD-S02 to case-specific tested or Judge overrides under one logical run without changing the project runner protocol, and retain honest partial outcomes.
- Persist actual per-case tested/judge models, preserve old run-history reads, and show actual choices in the case-first results from EMD-S01 and the run preview.

## Out of Scope

- Bulk override editing, same-case multi-model comparison, a full-suite temporary override, live-model routine tests, and UI automation.

## Acceptance Criteria

- **AC-01 — Independent inheritance:** A case may override Model or Judge model separately; resetting either returns that choice to the suite default without changing the other choice. Source: BRD REQ-02, AC-03. Verification: test.
- **AC-02 — Mixed full-suite run:** With suite Model X and one of nine cases overridden to Y, one full-suite run executes eight cases on X and one on Y, with applicable independent judge choices and case order preserved. Source: BRD REQ-03, AC-03. Verification: test.
- **AC-03 — Unavailable override:** An unavailable case override stops before paid execution and offers explicit replacement or inheritance; it is never silently ignored. Source: BRD REQ-05, AC-05. Verification: test.
- **AC-04 — Truthful evidence:** New results show the actual per-case Model and optional Judge model; existing single-model histories remain readable, and a partial runner failure keeps completed-case evidence. Source: BRD REQ-06, AC-06. Verification: test.
- **AC-05 — Surface parity and binding UX:** The UI and agent-guided flow use the same override rules; the selected-case Models action, dialog, blocked state, and case-first results follow the binding phone/tablet/desktop mockups for the user's later QA. Source: BRD REQ-02, REQ-06, AC-03, AC-06. Verification: deterministic Node contract tests plus later user QA.

## Verification Expectations

- Fake-port and suite-file tests prove independent inheritance/reset, saved-choice write safety, missing suite default despite a case override, and no accidental change from run-only choices.
- Runner/artifact integration with disposable fixtures proves eight-X/one-Y batch execution, independent judge choices, preview/start recheck, interruption with partial evidence, and backward reading of old run history. No live LLM, headless-browser UI test, or automated visual/accessibility review.
- The user performs post-implementation QA of selected-case controls, Test-case models dialog, unavailable-override recovery, and actual model labels across phone/tablet/desktop mockups.

## Validation

- `pnpm run build`; focused deterministic selection, runner/artifact, history-compatibility, UI contract, and agent-guidance tests; `pnpm run validate:packed-runtime` after changes stabilize. Do not run headless-browser UI tests or automated visual/accessibility review.

## Domain Context

Primary context: Local Evals Workbench. Each Eval Test Case inherits suite defaults unless it has an explicit override; one logical Eval Run may contain different effective model pairs across cases. The runner and provider remain external.

## Technical Context

Extend the module's saved-choice, preview/start, runner-execution, and run-history contracts described in the SDD. Keep ordered batch orchestration and backward-compatible result reads inside Local Evals Workbench; Template Catalog distributes any necessary authoring/agent-guided guidance.

## UX References

`docs/features/eval-model-defaults/ux.md`: Phone selected case and temporary choice, Phone persistent model dialogs (Test-case models), Phone blocked choice and case-first result, Tablet, Desktop, and Interaction States.

## Non-Functional Criteria

No silent model substitution, skipped case, destructive artifact rewrite, or automatic retry of paid calls; interrupted runs retain honest partial evidence. Source: BRD REQ-05 and SDD Security, Failure, and Operational Behavior.

## Deployability and Feature Flag

**Behind flag:** no. The override UI is exposed only with complete save, resolve, execute, and per-case evidence behavior. Existing suites and histories remain readable; this Story does not rely on an unmerged sibling to make overrides work.

## Dependencies

Depends on EMD-S02; no later Story required.

## Open Questions and Assumptions

Accepted assumption: model-homogeneous consecutive batches preserve case order and the existing one-pair runner protocol, as specified in the SDD. No unresolved questions.
