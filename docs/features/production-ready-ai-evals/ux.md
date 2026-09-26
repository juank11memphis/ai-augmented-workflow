# UX Spec: Production-Ready AI Evals

## Input Product Artifact

- Source: `docs/features/production-ready-ai-evals/brd.md`
- Primary coverage: REQ-09 through REQ-14, with supporting visibility for REQ-03 through REQ-08 and safety behavior from REQ-15 and REQ-16.

## Product Vision Implications

- Keep the workbench local, calm, and developer-controlled.
- Make current state, cost, evidence, and file-changing actions explicit.
- Prefer a guided next action over a dense dashboard or autonomous repair.
- Preserve project ownership: Sibu explains and proposes; the developer approves mutations.

## Business Domain Model Grounding

Use the reviewed terms **Eval Suite**, **Eval Test Case**, **Model Under Evaluation**, **Judge Model**, **Coverage Gap**, **Eval Run**, **Failed Assertion**, and **Repair Proposal** consistently.

The dashboard executes and inspects existing suites. Evaluation Target discovery, coverage approval, and suite generation happen in the coding-agent session. The dashboard must not imply that it creates or owns expected product behavior.

## UX Intent

Create one focused workspace where a developer can:

1. choose a suite;
2. configure one local run;
3. review calls and estimated cost;
4. inspect results;
5. move one failure through an AI-guided repair and rerun.

The experience should feel like a test workbench, not an analytics dashboard. Progressive disclosure keeps advanced evidence, coverage details, history, Judge Model choice, and repair details available without competing with the next action.

## Affected Surfaces

- Workbench empty state when no suites exist.
- Suite navigation and suite overview.
- Compact coverage summary and known-gap disclosure.
- Run setup for scope, Model Under Evaluation, optional Judge Model, and repeats.
- Pre-run review and cost confirmation.
- Running, completed, partial, blocked, and failed run states.
- Persisted run history.
- Result list and result detail.
- AI-guided failure analysis, repair proposal, approval, application, and rerun.

## Phone-First User Flow

### Run an eval

1. Open the workbench and land on the latest run for the current suite.
2. Choose a suite from the suite picker.
3. Select **New run**.
4. Choose all cases or one case, the Model Under Evaluation, optional Judge Model, and repeat count.
5. Select **Review run**.
6. Review cases, calls, and estimated cost in a bottom sheet.
7. Select **Start run**.
8. Watch concise progress, then review the result list.

This flow covers `docs/features/production-ready-ai-evals/brd.md` REQ-09, REQ-10, REQ-11, and REQ-12.

### Fix one failure

1. Open a failed test case.
2. If several checks failed, select one Failed Assertion.
3. Review **What happened**, **Expected**, and the smallest useful trace.
4. Select **Analyze failure**.
5. Review the AI explanation and select **Draft repair**.
6. Review affected files, focused diff, rationale, and expected eval impact.
7. Select **Approve and apply** or close without changing files.
8. After application, select **Rerun this case**; the full-suite rerun remains secondary.

This flow covers `docs/features/production-ready-ai-evals/brd.md` REQ-12, REQ-13, and REQ-14.

## Information Architecture

### Primary workspace

1. **Suite context** — suite name, latest status, compact Coverage entry point.
2. **Primary action** — New run or Continue run.
3. **Latest results** — status summary followed by test cases.
4. **Secondary access** — History and Coverage.

### Run setup

Show fields in decision order:

1. Run scope.
2. Test case, only when one-case scope is selected.
3. Model Under Evaluation.
4. Judge Model, only when the suite contains rubric-based graders.
5. Repeats, collapsed under **Repeat cases** and defaulted to once.
6. Review run.

### Result detail

Order content by diagnostic value:

1. status and failed checks;
2. actual and expected behavior;
3. conversation turns or tool trace when relevant;
4. diagnostics and bounded raw evidence;
5. AI-guided repair action.

Never lead with raw artifacts, internal IDs, or long model output.

## Content Rules

- Use the fewest plain words that preserve clarity and trust.
- Use **Model** in compact labels; explain **Model being tested** once in run setup.
- Use **Judge model** only when rubrics require it.
- Prefer **Run all cases**, **Run one case**, **Review run**, and **Start run**.
- Say **Estimated cost**, not price guarantee.
- Say **Known gaps**, not missing tests, when the gap is intentional and documented.
- Use **Approve and apply** only when the exact affected files and change are visible.
- Never show chain-of-thought, hidden reasoning, configured provider credentials, or unrestricted artifact dumps. Bounded eval output appears as received when the user opens result evidence; this first version does not detect or mask sensitive content in that output.
- Internal artifact locations may appear only in an expanded evidence section when useful for recovery.

## Binding Mockups

These mockups are authoritative for structure, hierarchy, visible content, and dominant actions.

### Phone — Latest run and new run

```text
┌──────────────────────────────┐
│ Sibu Evals                   │
│ [Support agent suite      ▾] │
├──────────────────────────────┤
│ Support agent                │
│ Latest run · 18 Sep, 10:42   │
│ 22 passed · 2 failed         │
│ [Coverage]       [History]   │
│                              │
│ [ New run ]                  │  Primary action
├──────────────────────────────┤
│ RESULTS                 24   │
│ [Failures only □]            │
│                              │
│ ✕ Refuses unsafe refund      │
│   1 failed check             │
│   [Open failure]             │
│                              │
│ ✓ Finds the correct order    │
│   4 checks passed            │
│                              │
│ ✓ Handles missing account    │
│   5 checks passed            │
└──────────────────────────────┘

NEW RUN replaces the results area:
┌──────────────────────────────┐
│ New run                 [×]  │
├──────────────────────────────┤
│ Run                            │
│ (●) All 24 cases             │
│ ( ) One case                 │
│                              │
│ Model being tested           │
│ [ GPT-5 mini              ▾] │
│                              │
│ Judge model                  │  Shown only for rubric suites
│ [ GPT-5 mini              ▾] │
│                              │
│ Repeat cases                 │
│ [ Once                    ▾] │
│                              │
│ [ Review run ]               │
└──────────────────────────────┘
```

### Phone — Run review sheet

```text
┌──────────────────────────────┐
│ Review run              [×]  │
├──────────────────────────────┤
│ Support agent                │
│ 24 cases · once              │
│                              │
│ Model                        │
│ GPT-5 mini                   │
│ Judge                        │
│ GPT-5 mini                   │
│                              │
│ Expected calls          31   │
│ Estimated cost       $0.18   │
│ Actual cost may vary.        │
│                              │
│ [ Start run ]                │
│ [ Back ]                     │
└──────────────────────────────┘
```

If an estimate is unavailable, show **Cost unavailable** with a short reason. Never replace confirmation with a silent start.

### Phone — AI-guided repair

```text
┌──────────────────────────────┐
│ Failed case             [×]  │
├──────────────────────────────┤
│ Refuses unsafe refund        │
│ Failed check 1 of 2      [▾] │
│                              │
│ WHAT HAPPENED                │
│ The agent called refund      │
│ before verifying ownership.  │
│                              │
│ EXPECTED                     │
│ Verify ownership first.      │
│                              │
│ TOOL TRACE             [›]   │
│                              │
│ [ Analyze failure ]          │
└──────────────────────────────┘

AFTER ANALYSIS:
┌──────────────────────────────┐
│ AI analysis                  │
│ Likely prompt issue          │
│ The prompt does not require  │
│ verification before refund.  │
│ Uncertainty: low             │
│                              │
│ [ Draft repair ]             │
└──────────────────────────────┘

PROPOSAL:
┌──────────────────────────────┐
│ Proposed repair              │
│ 1 file                       │
│ prompts/refund-agent.md      │
│                              │
│ DIFF                         │
│ - Refund when requested      │
│ + Verify ownership before…   │
│ [Show full diff]             │
│                              │
│ Expected impact              │
│ Blocks refunds until the     │
│ ownership check passes.      │
│                              │
│ [ Approve and apply ]        │
│ [ Not now ]                  │
└──────────────────────────────┘

APPLIED:
┌──────────────────────────────┐
│ Repair applied               │
│ The result is not verified   │
│ until you rerun the eval.    │
│                              │
│ [ Rerun this case ]          │
│ [ Rerun all cases ]          │
└──────────────────────────────┘
```

### Tablet

```text
┌─────────────────────────────────────────────────────┐
│ Sibu Evals     [Support agent ▾]  [Coverage] [History]│
├─────────────────────────────────────────────────────┤
│ Support agent · 22 passed · 2 failed     [New run] │
├──────────────────────────┬──────────────────────────┤
│ Results                  │ Selected result          │
│ [Failures only □]        │ Refuses unsafe refund    │
│                          │                          │
│ ✕ Unsafe refund          │ What happened            │
│ ✓ Correct order          │ Expected                 │
│ ✓ Missing account       │ Tool trace [Show]        │
│ ✓ Tool timeout           │                          │
│                          │ [Analyze failure]        │
└──────────────────────────┴──────────────────────────┘
```

Tablet uses a list-detail layout when space allows. Run setup and run review remain focused overlays rather than adding a third column.

### Desktop

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Sibu Evals                                      [Coverage] [History]       │
├──────────────────┬──────────────────────────────────┬──────────────────────┤
│ EVAL SUITES      │ Support agent                    │ RESULT DETAIL        │
│                  │ Latest · 22 passed · 2 failed    │ Unsafe refund        │
│ ● Support agent  │                     [ New run ]  │                      │
│ ○ Search summary │                                  │ What happened        │
│ ○ Email drafter  │ [Failures only □] [Search      ] │ Expected             │
│                  │                                  │ Tool trace [Show]    │
│                  │ ✕ Refuses unsafe refund          │                      │
│                  │   1 failed check                 │ [Analyze failure]    │
│                  │ ✓ Finds the correct order        │                      │
│                  │ ✓ Handles missing account        │                      │
│                  │ ✓ Handles tool timeout           │                      │
├──────────────────┴──────────────────────────────────┴──────────────────────┤
│ Run history appears as a dismissible right panel, replacing result detail.│
└────────────────────────────────────────────────────────────────────────────┘
```

Desktop preserves persistent suite context, a scan-friendly result list, and one detail pane. Because the MVP runs one Model Under Evaluation at a time, do not use a multi-model matrix.

### Empty state

```text
┌──────────────────────────────┐
│ No eval suites yet           │
│ Ask your coding agent:       │
│                              │
│ “Create production-ready     │
│ Sibu evals for this project.”│
│                              │
│ [ Copy prompt ]              │
└──────────────────────────────┘
```

Do not place suite-authoring controls in the dashboard.

## Breakpoint-Specific Component Strategy

- **Compact:** one surface at a time. Suite picker replaces the suite rail. Result detail and repair use full-height sheets. Keep the primary action within easy reach without covering content.
- **Medium:** use a result list plus one detail pane. Suite choice remains a compact picker. Overlays handle run setup and review.
- **Expanded:** use a narrow suite rail, flexible result list, and persistent detail pane. History temporarily replaces the detail pane. Keep reading widths constrained.

## Interaction States

### No suites

Show only the copyable coding-agent prompt and brief explanation. Do not show disabled run controls.

### Ready

Restore the selected suite and its latest completed or interrupted run. **New run** is the dominant action.

### Run review

Trap focus inside the sheet/dialog, label every value, and require **Start run**. Back returns to setup without losing selections.

### Running

Disable configuration changes. Show completed cases over total cases, current case when available, elapsed time, and accrued cost when available. Announce meaningful progress without announcing every token or trace event.

### Completed

Move focus to the status summary. Show pass/fail counts first, then the result list. Keep history access secondary.

### Partially completed or interrupted

Preserve completed evidence, identify cases not run, and offer **Retry unfinished cases** when safe. Never label a partial run passed.

### Blocked

State what is missing in plain language, such as model credentials or an unavailable compatible model. Keep existing results inspectable.

### Judge unavailable

Explain that deterministic checks can still run only when doing so will not create a misleading overall result. Otherwise block before cost confirmation and identify the required Judge Model setup.

### Cost unavailable

Show the unavailable state and reason in the review panel. Require the same explicit **Start run** confirmation.

### Failure detail

Default to one Failed Assertion. Put actual behavior and expected behavior before traces and raw evidence. Switching assertions must reset analysis and proposal state to prevent cross-failure confusion.

### Repair proposal

Show affected files, focused diff, rationale, and expected eval impact together. **Approve and apply** is visually prominent but never preselected or triggered by keyboard focus alone.

### Repair applied

State that application does not prove resolution. Make **Rerun this case** primary and **Rerun all cases** secondary.

## Coverage and History Panels

### Coverage

Show category status using text and icons, not color alone:

- Covered
- Partly covered
- Not applicable
- Known gap

Lead with Known Gaps and their reasons. Do not show a single “coverage percentage,” because it would imply false precision.

### History

List newest runs first with date/time, model, scope, repeats, pass/fail status, duration, and cost when known. Selecting a run restores its results without changing the current suite. Clearly label historical results as read-only.

## Accessibility Requirements

- Full keyboard access for suite navigation, setup, results, history, evidence disclosure, proposal review, and rerun.
- Visible focus on every interactive control.
- Dialogs and sheets have programmatic names, focus trapping, Escape behavior, and focus return.
- Status never depends on color alone; pair icons with plain text.
- Progress updates use restrained live-region announcements.
- Tables or lists expose test case, status, model, and check summary to assistive technology.
- Touch targets are at least comfortably tappable and separated from destructive or file-changing actions.
- Diff additions and removals use signs and labels in addition to color.
- Long outputs and traces support wrapping, structured sections, and user-controlled expansion.
- Respect reduced-motion preferences; no essential information relies on animation.

## Visual Direction

- Preserve the existing dark developer-tool identity.
- Use one quiet elevated surface per task rather than nested cards.
- Reserve blue for the primary action, green for passed, amber for blocked or uncertain, and red for failed or file-changing risk emphasis.
- Use status color sparingly and always pair it with text.
- Prefer compact labels, generous vertical rhythm, and strong type hierarchy over decorative graphics.
- Use monospace only for diffs, traces, paths, and structured outputs—not general interface copy.

## Anti-Bloat Review

- Removed the multi-model result matrix because MVP runs one Model Under Evaluation at a time.
- Kept Judge Model hidden unless a rubric requires it.
- Kept repeats collapsed and defaulted to once.
- Moved Coverage, History, traces, raw evidence, and full diffs behind deliberate actions.
- Avoided decorative metrics; pass/fail, progress, duration, and cost appear only where they inform a decision.
- Kept suite generation outside the dashboard and provided one copyable next-step prompt in the empty state.
- Kept repair as one guided path rather than adding a manual prompt editor.

## Risks / Tradeoffs

- Deep traces are useful but can overwhelm the repair flow; show a bounded summary first.
- Persisted history improves regression work but can make the workbench feel analytical; keep latest results primary and history secondary.
- AI-guided repair is simpler than manual editing but depends on analysis availability; preserve evidence when assistance is unavailable.
- Cost estimates build trust but may be incomplete; label estimates clearly and never present them as guarantees.
- Full phone functionality increases layout work, but it prevents the compact experience from becoming a dead-end inspection mode.

## UI Authority Rule

The Binding Mockups define the required hierarchy, visible content, dominant actions, and breakpoint behavior. Downstream design and implementation should not replace the single-workspace flow, pre-run review, list-detail results, or guided repair sequence without revising this UX spec.
