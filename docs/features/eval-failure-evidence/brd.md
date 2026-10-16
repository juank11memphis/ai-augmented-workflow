# Eval Failure Evidence Business Requirements Document

## Executive Summary and Business Need

An engineer or coding agent can locate a failed Sibu eval assertion but may see only a paraphrased actual value, a threshold, and a path to a larger artifact. That is not enough to determine whether the Model Under Evaluation failed, a Judge Model disagreed, a tool or runner failed, or the run was incomplete. Sibu should keep full-suite reporting compact while making the evidence for one selected case, attempt, and assertion directly inspectable from the CLI.

## Objectives and Measurable Success

- OBJ-01 — Enable evidence-grounded diagnosis: in a failed multi-turn acceptance scenario, an engineer or coding agent using only the run locator and selected result can quote the relevant assistant reply, identify the context and tool data available at that turn, see the actual score and judge rationale, and name any remaining evidence gap without opening bulk artifacts or guessing.
- OBJ-02 — Keep runs navigable and honest: full-suite output identifies the case, attempt, and failed assertion reliably without carrying detailed transcripts; selected results distinguish evaluated behavior from judge, tool, runner, and incomplete-run problems.

## Stakeholders and Needs

- **Engineer running local evals:** needs a compact account of the run and a reliable route to one failure without searching large artifacts.
- **Engineer or coding agent diagnosing a failure:** needs source evidence, not only a judge's summary, to decide whether to propose a repair or report uncertainty.
- **Engineer responsible for eval quality:** needs to tell an assertion failure from a grading or execution problem before changing prompts, fixtures, assertions, or rubrics.

## Scope and Exclusions

**First useful scope:** CLI run and result reporting for existing local eval suites, including single-turn, multi-turn, and mocked-tool cases. Full-suite run output supplies case/attempt/assertion locators. A selected result exposes the relevant raw assistant response, evaluated context, grading evidence, and execution diagnostics. Detailed evidence remains in local run artifacts excluded from Git tracking. CLI documentation and deterministic fake-based coverage are part of this scope.

**Excluded:** dashboard changes; changing eval rubrics or assertions to improve pass rates; automated repair or approval changes; live-model integration evals as routine unit tests; new redaction and broader customer-data privacy policy, which will be addressed separately. This exclusion does not waive the existing rule against committing secrets or sensitive data. Git exclusion limits accidental source-control tracking but is not a complete privacy control.

## Requirements

- REQ-01 — Type: functional; Objectives: OBJ-01, OBJ-02. Report stable suite, run, case, attempt, and failed-assertion locators in compact run output, preserving the order needed to select the intended failure. (RULE-01)
- REQ-02 — Type: functional; Objectives: OBJ-01. For a selected failed assertion, show the exact raw Model Under Evaluation response for the relevant turn, including text and structured tool calls, alongside any normalized response used for evaluation. Do not substitute a paraphrase for the raw response. (RULE-02)
- REQ-03 — Type: functional; Objectives: OBJ-01. Show the input messages and preceding conversation relevant to that turn, including tool requests, tool results, and approved facts actually available to the model, with their order and timing or sequence markers. (RULE-02)
- REQ-04 — Type: functional; Objectives: OBJ-01. Show the assertion or rubric as evaluated, its threshold, numeric score when scoring applies, the exact request sent to the Judge Model (including instructions, evaluated response, and reference context actually supplied), and the judge's exact response and rationale when a judge was used. Identify deterministic checks without implying that a judge scored them. (RULE-02)
- REQ-05 — Type: functional; Objectives: OBJ-01, OBJ-02. Identify the actual Model Under Evaluation and Judge Model used, attempt number, relevant errors, and run/case/assertion states so the reader can distinguish model behavior failure, judge disagreement or failure, tool/runner failure, and incomplete execution. Do not claim a cause the evidence cannot establish. (RULE-03)
- REQ-06 — Type: quality; Objectives: OBJ-01, OBJ-02. If selected-result output is bounded, explicitly identify each truncated or unavailable evidence field and provide a direct way to retrieve omitted retained evidence. Never silently discard or replace the raw response with a summary. (RULE-02, RULE-04)
- REQ-07 — Type: quality; Objectives: OBJ-01. Keep detailed run evidence in local artifacts protected by the existing effective Git-ignore and untracked-artifact checks; do not commit secrets, credentials, tokens, or other sensitive data. State that additional redaction and customer-data handling are outside this BRD. (RULE-04)
- REQ-08 — Type: transition; Objectives: OBJ-01, OBJ-02. Document the CLI locator-to-selected-result workflow and verify it with deterministic fake model, judge, and tool responses covering multi-turn, tool-calling, failure classification, redaction markers where existing behavior produces them, and truncation or missing evidence. Do not use live models in routine unit tests.

## Business Rules

- RULE-01 — A run locator identifies the actual case, attempt, and assertion evaluated; a selected result must not silently substitute evidence from another attempt or turn.
- RULE-02 — Raw response, normalized response, context, tool evidence, and grading evidence are distinct. Summaries and excerpts may supplement them but must not be presented as exact source evidence.
- RULE-03 — A failed check, a judge disagreement or error, a tool/runner error, and an incomplete run are different outcomes. Where attribution is uncertain, report the uncertainty and available evidence rather than guessing.
- RULE-04 — Detailed evidence belongs in local run artifacts that pass Sibu's existing Git-exclusion safeguards. Any truncation, redaction already present in evidence, or missing record must be visible to the reader; Git-ignore alone is not a privacy guarantee.

## Business Acceptance Criteria

- AC-01 (REQ-01) — A failing full-suite run gives an unambiguous run ID and ordered case/attempt/assertion locators while omitting detailed transcripts from the run summary.
- AC-02 (REQ-02, REQ-03, REQ-04) — Given a failed multi-turn assertion with a tool call, the selected result lets a reader quote the exact relevant assistant text and structured tool call, identify the messages, approved facts, request, and result the model received, and see the evaluated rubric, threshold, score, exact judge request, and exact judge rationale without opening a bulk artifact.
- AC-03 (REQ-05) — Selected results distinguish a model response that failed an assertion from a judge disagreement or error, a tool/runner failure, and a partial or interrupted run; absent evidence is not described as a model failure.
- AC-04 (REQ-06) — When a field exceeds the selected-result limit, the output names the affected field, marks it truncated, and gives a direct retrieval path for the retained remainder. Missing or redacted evidence is marked rather than silently replaced with a paraphrase.
- AC-05 (REQ-07) — A run does not write detailed artifacts when Sibu's existing checks find that the artifact directory is not effectively ignored or contains tracked run artifacts. Documentation does not imply that Git-ignore solves all privacy risks.
- AC-06 (REQ-08) — Deterministic fake-based tests exercise multi-turn context, tool calls and results, model and judge failures, pre-existing redaction markers, truncation, and incomplete evidence; CLI documentation shows how to move from a run locator to one selected assertion.

## Product Vision Fit

The feature makes AI-assisted diagnosis faster without asking the engineer to trust an opaque summary. Compact runs preserve a usable CLI workflow; exact, attributable evidence and explicit uncertainty preserve the engineer's judgment and Sibu's standard of visible, reviewable work.

## Business Domain Model Fit

This uses the existing **Local Evals Workbench**, **Eval Suite**, **Eval Test Case**, **Eval Run**, **Eval Result**, **Assertion / Grader**, **Model Under Evaluation**, **Judge Model**, **Tool Interaction Expectation**, and **Failure Analysis** concepts in `docs/business-domain-model.md`. It strengthens the existing run-to-selected-failure inspection step without changing eval definitions or the repair approval lifecycle.

## Capability Coverage

The **Local Evals Workbench** capabilities in `docs/capabilities-map.md` already include **Run focused eval scope**, **Execute real AI behavior**, **Show eval result status**, **Preserve isolated run evidence**, **Inspect failure evidence**, **Analyze one failed assertion at a time**, **Classify likely failure cause**, and **Guide agent-based eval sessions**. This feature makes those capabilities reliable in the CLI selected-result path.
