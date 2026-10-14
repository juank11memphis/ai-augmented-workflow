---
name: agent-guided-evals
description: Guide one Sibu eval case through bounded failure diagnosis, an explicitly approved host edit, and one focused verification rerun in Codex or Claude Code.
---

# Agent-Guided Evals

Use this shared workflow when a developer asks to work on, run, troubleshoot, or fix existing Sibu evals in Codex or Claude Code. Eval authoring is separate; do not create or rewrite suites merely to make a failing run pass. The coding agent's own model is not the Model Under Evaluation (MUE) or Judge Model.

## Choose and run one case

1. From the project root run `sibu evals suites`. Use its JSON `suites[].id` and `testCases[].id` to show the available choices; do not discover by reading suite JSON independently. Ask the developer to choose one suite and one case. Guided full-suite or multi-case troubleshooting is not available until AGE-US-03; decline that request. AGE-US-01's independent CLI full-suite run-and-inspect path remains available (`sibu evals run <suite> --model <model_id>` without `--case`), but do not present it as a guided repair session.
2. Run `sibu evals describe <suite> --case <case_id>`. Show its compatible `models`, `judgeModels`, and `rubricRequired`; ask for a compatible MUE and, only when required, a separate judge. Do not silently use the coding agent's own model as either choice.
3. Run `sibu evals run <suite> --case <case_id> --model <model_id>` with `--judge <model_id>` only when required. It waits for a terminal JSON result. Record its `runId`, `status`, `outcome`, `cases[].caseId`, and `attempts[].number`/`outcome`. A nonzero CLI exit may carry useful blocked or failed JSON; inspect the JSON status rather than treating exit code alone as an assertion failure.
4. For a completed failed run, choose only one failed assertion from the selected case's failed attempt `failedAssertionIds`, with `locatorStatus: available`. Keep `(caseId, attempt number, assertionId)` together. The selected result CLI currently accepts attempt **1** only: if the locator is absent, `unavailable`, `truncated` without a suitable ID, or points to another attempt, stop and explain that bounded evidence is unavailable. Do not infer IDs from suite JSON or load bulk artifacts. Run `sibu evals result <suite> <run_id> --case <case_id> --assertion <assertion_id>` and use only its bounded `failure` and `summary`. The `--case` and `--assertion` flags must be paired. An unselected `sibu evals result <suite> <run_id>` may supply the same bounded locator when needed, but not a substitute assertion ID guessed from files.

## Diagnose and propose

Keep one active failed assertion. State the observed run ID and case/attempt/assertion, what the bounded actual/expected/diagnostics show, the likely cause, uncertainty, and concise possible fixes. A failed assertion is distinct from blocked/error/interrupted/partial runs, missing credentials, unavailable runner or judge, invalid configuration, and missing/corrupt/unsafe artifacts. For those states, report the known reason and next user action; do not invent a prompt diagnosis or claim a pass. If the expectation or cause is ambiguous, ask a focused question before proposing an edit.

For one concrete fix, name the exact project-root paths, intended changes, rationale, and expected effect on the active assertion. Wait for explicit developer approval of that fix and those paths. A decline or changed scope stops without edits. Approval is conversational guidance plus native host permissions, **not** a Sibu-enforced authorization guarantee. Never edit secrets or credentials, even if suggested; ask the developer to handle access separately. There is no Sibu CLI mutation shortcut.

## Apply once and verify

Before editing, capture the working-tree baseline including pre-existing changes in and around approved paths. Preserve them. Only after approval, use the coding host's normal edit tools and permissions within the project root, limited to the named fix. Compare the post-edit changed-file list and delta with that baseline and approved scope; report actual changed files and delta, including pre-existing edits left untouched. If any change is unexpected, concurrent, or indistinguishable from your edit, stop before rerunning and request human review. Do not reset, overwrite, or silently absorb it.

After a safely scoped edit, automatically run the same case **once** with the chosen MUE/judge, without another routine approval prompt. Record the fresh run ID and compare the active assertion against the fresh run's attempt locators and bounded result where available. If it still fails, explain the new evidence and possible fixes, then wait for a new decision before any second edit. If it passes, report only that focused observed outcome and any other failed or incomplete checks; do not claim full-suite success. Do not rerun repeatedly to find a pass. A blocked or uncertain rerun is not verification: report the reason and stop.
