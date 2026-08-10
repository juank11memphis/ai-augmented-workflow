# UX Spec: Sibu Local Evals Workbench

## Input Product Artifact

- `docs/features/sibu-local-evals-dashboard/feature_brief.md`
- Baseline UI: rpgizer local eval matrix route (`/evals`) with suite navigation, run controls, filters, responsive result list/table, and cell detail drawer.
- External eval terminology grounding:
  - OpenAI Evals API: evals define testing criteria and data source schema; eval runs produce output items with input/output samples and grader results.
  - LangSmith evaluation concepts: datasets contain examples with inputs and optional reference outputs; experiments capture outputs, evaluator scores, and traces; human, code, LLM-as-judge, and pairwise evaluation are common techniques.
  - promptfoo assertions: assertions compare LLM output against expected values or conditions and are commonly attached to test cases.

## Product Vision Implications

Sibu should feel like a local, developer-owned workflow lab: fast, practical, and reviewable. The workbench must preserve the Small Work Loop: run a focused eval, inspect evidence, discuss one failure, approve a narrow change, then rerun. The UI must never imply Sibu owns the repo or can repair files without the user.

## Business Domain Model Grounding

Use Sibu's domain language directly:

- **Project / Repo**: the local workspace being evaluated.
- **Workflow File / Artifact**: project-owned files that may be proposed for change.
- **Local Evals Workbench**: the local eval loop for discovering suites, running eval scope, analyzing one failed assertion at a time, approving proposals, and rerunning.
- **Repair Proposal**: a concrete proposed change to one or more project files.
- **Skill**: guidance that can create or maintain eval artifacts.
- **Small Work Loop**: inspect, decide, change only after approval, validate again.
- **User Control**: every mutation requires explicit approval of a concrete proposal.

## UX Intent

Adapt the rpgizer eval matrix into a Sibu-local eval workbench. Keep the proven shell: dark developer-tool UI, suite selection, run scope controls, model selection, summary bar, filters, phone list, desktop matrix, and a drawer.

The main UX change is the drawer. It becomes a conversational Failure Workbench focused on one failed assertion at a time. If a cell contains four failed assertions, the user and LLM work through one selected assertion first; the other failures remain visible as a queue, not as competing conversation topics.

## Affected Surfaces

1. Local eval workbench route launched by `sibu evals`.
2. Suite selection surface.
3. Selected suite header and run controls.
4. Eval-run model configuration and workbench LLM availability section.
5. Result summary and filters.
6. Phone test case list.
7. Desktop matrix table.
8. Cell drawer for passed, failed, blocked, error, running, and not-run cells.
9. Conversational failure analysis and approved proposal flow.
10. Local setup/blocker states.

## Phone-First User Flow

1. User runs `sibu evals` and opens the local dashboard.
2. Workbench shows discovered suites from the repo-local `evals/` folder.
3. User selects a suite.
4. User chooses the eval-run model and run scope: all test cases or one test case.
5. User runs the eval.
6. If workbench LLM assistance is unavailable, the UI keeps eval inspection available and shows concise setup guidance for `OPENAI_API_KEY` and optional `SIBU_EVALS_MODEL`.
7. Phone layout shows test cases as stacked cards, with each result cell summarized under its case.
7. User filters to failures or searches for a case.
8. User opens a failed cell.
9. Drawer opens as a bottom sheet titled “Failure Workbench.”
10. Drawer highlights one failed assertion as the active failure.
11. User starts or continues a conversation about that assertion only.
12. LLM explains:
    - exact output or excerpt that failed
    - failed assertion / grader result
    - relevant expected or reference context
    - likely cause, with uncertainty when needed
13. User decides repair direction conversationally: prompt, assertion, fixture/input, regression case, ignore for now, or needs human judgment.
14. LLM drafts a concrete proposal for that direction, using server-side workbench LLM configuration.
15. User approves or rejects the proposal.
16. Only after approval, Sibu applies the mutation to allowed project file(s) and reports changed artifacts.
17. Drawer offers the next action: rerun this test case or move to the next failed assertion.

## Information Architecture

### Workbench hierarchy

1. Current suite and run action.
2. Current run status and result summary.
3. Filtering controls.
4. Result list/table.
5. Failure workbench drawer.

### Drawer hierarchy for failed cells

1. Active failure identity: test case, variant/model, status.
2. Failed assertion queue.
3. Exact evidence: failed assertion, actual output excerpt, expected/reference context.
4. Conversation focused on the active assertion.
5. Concrete proposal preview with affected project file(s), rationale, expected eval impact, and approval state.
6. Explicit approval controls.
7. Rerun / next-failure actions after mutation or dismissal.
8. Raw artifacts collapsed below the workbench.

### Drawer hierarchy for passed cells

1. Result identity.
2. Passed assertions.
3. Output and relevant artifacts.
4. Metrics and diagnostics.

Passed cells do not show repair conversation by default.

## Content Rules

- All visible copy is for engineers using a local Sibu-managed repo.
- Use eval terms consistently: suite, test case, run, output, expected, assertion, grader, result, proposal.
- Prefer “test case” in the UI because the baseline uses it and it is familiar to engineers.
- Use “assertion” for deterministic or declared checks.
- Use “grader” only when the check is model/rubric scored.
- Never say “fixed” before validation. Say “proposal applied” or “changed.”
- Never hide uncertainty. Use “Needs judgment” or “Unclear” when the likely cause is not supported by evidence.
- Never show raw IDs as primary labels. Use names first; raw IDs can appear in collapsed details if useful.
- Keep labels short and plain.
- Label the eval-run model as “Model” in the run controls.
- Label unavailable LLM assistance as “Analysis unavailable,” not as a broken eval run.
- Show `OPENAI_API_KEY` and `SIBU_EVALS_MODEL` only in local setup guidance, never as captured values.
- Proposal file paths may point outside `evals/`; copy must still make clear that only approved non-secret project files can be changed.

## Phone Layout

Phone keeps one main task on screen. Suite selection appears as a dropdown. The run panel is sticky at the top only while useful; avoid occupying more than half the viewport. Results appear as stacked test case cards. Opening a cell shows a bottom sheet that can expand to near-full height.

Phone drawer behavior:

- Opens from bottom.
- Focus moves to Close.
- Active failed assertion appears immediately below title.
- Conversation input is sticky at the bottom of the sheet.
- Proposal approval controls appear above the input when a proposal exists.
- Raw artifacts are collapsed by default.
- If analysis credentials are missing, show the unavailable state in the conversation area without blocking result evidence.

## Tablet Layout

Tablet keeps the phone suite dropdown unless there is enough width for a compact side rail. Results may use the matrix table if horizontal space supports readable columns; otherwise keep stacked cards. Drawer becomes a right-side panel when width allows; otherwise remains a bottom sheet.

## Desktop Layout

Desktop uses the rpgizer baseline:

- dark full-page local tool shell
- left suite rail
- sticky suite/run/control panel
- summary stats
- filters
- matrix table
- right-side drawer

The drawer should be wider than a generic details drawer because conversation and proposal preview need room. It should not cover the suite rail unless viewport width is constrained.

## Binding Mockups

### Phone: Suite Results

```text
┌──────────────────────────────┐
│ LOCAL SIBU EVALS             │
│ Workflow evals               │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Eval Suite                   │
│ [ Skill authoring checks  ▾ ]│
│ Checks generated skills...   │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Skill authoring checks       │
│ Failed                       │
│ 2 failed assertions found.   │
│                              │
│ Run scope                    │
│ [ All test cases          ▾ ]│
│ [ Run all 8 test cases ]     │
│                              │
│ Model                        │
│ [ gpt-5-mini              ▾ ]│
│                              │
│ Pass rate   75%             │
│ Avg latency 910 ms          │
│ Total cost  $0.0142         │
│ Progress    8/8             │
│ ████████████████████████████ │
│                              │
│ [x] Failures only            │
│ [ Search test cases...     ] │
│ [ Variant: gpt-5-mini     ▾ ]│
└──────────────────────────────┘

Test Cases

┌──────────────────────────────┐
│ missing-skill-boundary       │
│ capability=skill-guidance    │
│                    [Run row] │
│                              │
│ Failed · 2 failed / 4        │
│ gpt-5-mini · gpt-5-mini      │
│ 920 ms · 1,320 tokens · ...  │
│ Output says the skill may... │
│ Assertion failed: must stop… │
└──────────────────────────────┘
```

### Phone: Failure Workbench Bottom Sheet

```text
┌──────────────────────────────┐
│ overlay                      │
│                              │
│ ┌──────────────────────────┐ │
│ │ FAILURE WORKBENCH     ✕ │ │
│ │ missing-skill-boundary   │ │
│ │ Failed · gpt-5-mini      │ │
│ ├──────────────────────────┤ │
│ │ Failed assertions         │ │
│ │ ● Must hard-stop first    │ │
│ │ ○ Must name artifact      │ │
│ │                          │ │
│ │ Active failure            │ │
│ │ Must hard-stop first      │ │
│ │                          │ │
│ │ Actual output             │ │
│ │ "I can draft the skill..."│ │
│ │                          │ │
│ │ Expected                  │ │
│ │ Refuse until inputs exist │ │
│ │                          │ │
│ │ Conversation              │ │
│ │ Sibu: Want me to analyze  │ │
│ │ this failed assertion?    │ │
│ │                          │ │
│ │ [ Analyze this failure ]  │ │
│ │                          │ │
│ │ [ Ask about this failure ]│ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

### Phone: Proposal Ready

```text
┌──────────────────────────────┐
│ FAILURE WORKBENCH         ✕ │
│ missing-skill-boundary       │
├──────────────────────────────┤
│ Active failure               │
│ Must hard-stop first         │
│                              │
│ Conversation                 │
│ You: Is this a prompt issue? │
│ Sibu: Likely prompt issue.   │
│ The output skipped the       │
│ missing-input stop rule.     │
│                              │
│ Proposal                     │
│ Change artifact              │
│ prompts/skill-authoring.md   │
│                              │
│ Why                          │
│ Make the prompt require a    │
│ hard stop before drafting.   │
│                              │
│ [ Approve change ]           │
│ [ Reject ]                   │
│                              │
│ Sibu will only change these  │
│ project files if you approve.│
│                              │
│ [ Message about this failure]│
└──────────────────────────────┘
```

### Phone: Analysis Unavailable

```text
┌──────────────────────────────┐
│ FAILURE WORKBENCH         ✕ │
│ missing-skill-boundary       │
├──────────────────────────────┤
│ Active failure               │
│ Must hard-stop first         │
│                              │
│ Actual output                │
│ "I can draft the skill..."   │
│                              │
│ Analysis unavailable         │
│ Add OPENAI_API_KEY to your   │
│ local env to ask Sibu for    │
│ failure analysis.            │
│                              │
│ Optional                     │
│ SIBU_EVALS_MODEL             │
│                              │
│ You can still inspect this   │
│ result and rerun evals.      │
└──────────────────────────────┘
```

### Tablet

```text
┌────────────────────────────────────────────────────────┐
│ LOCAL SIBU EVALS                                      │
│ Workflow evals                                        │
├────────────────────────────────────────────────────────┤
│ Eval Suite                                            │
│ [ Skill authoring checks ▾ ]                          │
├────────────────────────────────────────────────────────┤
│ Skill authoring checks        Failed     [Run all 8]  │
│ Checks generated skills...                            │
│ Model [gpt-5-mini ▾]                                  │
│ Pass rate 75% | Avg latency 910 ms | Cost $0.0142     │
│ [x] Failures only  [Search...]  [Variant ▾]           │
├────────────────────────────────────────────────────────┤
│ Test Case                 │ gpt-5-mini                │
│ missing-skill-boundary    │ Failed · 2 failed / 4     │
│ capability=skill-guidance │ Output says the skill...  │
│ [Run row]                 │                            │
└────────────────────────────────────────────────────────┘

When a failure is opened:
┌────────────────────── main dimmed ─────────────────────┐
│                                      ┌────────────────┐ │
│                                      │ FAILURE        │ │
│                                      │ WORKBENCH   ✕ │ │
│                                      │ Failed queue   │ │
│                                      │ Evidence       │ │
│                                      │ Conversation   │ │
│                                      │ Proposal       │ │
│                                      │ [Approve]      │ │
│                                      └────────────────┘ │
└────────────────────────────────────────────────────────┘
```

### Desktop

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ LOCAL SIBU EVALS                                                            │
│ Workflow evals                                                              │
├───────────────┬──────────────────────────────────────────────────────────────┤
│ Eval Suites    │ Skill authoring checks        Failed        [Run all 8]     │
│ ● Skill author │ Checks generated eval-authoring skills...                  │
│ ○ Prompt drift │ 2 failed assertions found.                                 │
│ ○ Sync review  │                                                              │
│                │ Model [gpt-5-mini ▾]                                        │
│ 3 suites       │ Pass rate 75% | Avg latency 910 ms | Cost $0.0142 | 8/8     │
│ available      │ ████████████████████████████████████████████████████████     │
│                │ [x] Failures only  [Search test cases...] [Variant ▾]       │
│                ├──────────────────────────────────────────────────────────────┤
│                │ Test Case                 │ gpt-5-mini                      │
│                │ missing-skill-boundary    │ ┌──────────────────────────────┐ │
│                │ capability=skill-guidance │ │ Failed · 2 failed / 4       │ │
│                │ [Run row]                 │ │ 920 ms · 1,320 tokens...    │ │
│                │                           │ │ Output says the skill...    │ │
│                │                           │ └──────────────────────────────┘ │
└───────────────┴──────────────────────────────────────────────────────────────┘

With drawer:
┌───────────────┬──────────────────────────────┬───────────────────────────────┐
│ Eval Suites    │ Matrix                       │ FAILURE WORKBENCH          ✕ │
│                │                              │ missing-skill-boundary        │
│                │                              │ Failed · gpt-5-mini           │
│                │                              ├───────────────────────────────┤
│                │                              │ Failed assertions              │
│                │                              │ ● Must hard-stop first         │
│                │                              │ ○ Must name artifact           │
│                │                              ├───────────────────────────────┤
│                │                              │ Active failure                 │
│                │                              │ Must hard-stop first           │
│                │                              │                               │
│                │                              │ Actual output                  │
│                │                              │ "I can draft the skill..."     │
│                │                              │                               │
│                │                              │ Expected                       │
│                │                              │ Refuse until inputs exist      │
│                │                              ├───────────────────────────────┤
│                │                              │ Conversation                  │
│                │                              │ Sibu: Want me to analyze this │
│                │                              │ failed assertion?             │
│                │                              │                               │
│                │                              │ [ Analyze this failure ]       │
│                │                              │ [ Message about this failure ] │
└───────────────┴──────────────────────────────┴───────────────────────────────┘
```

### Desktop: Applied Change

```text
┌───────────────────────────────┐
│ FAILURE WORKBENCH          ✕ │
│ missing-skill-boundary        │
├───────────────────────────────┤
│ Change applied                │
│ Updated 1 file:               │
│ evals/skill-authoring/...     │
│                               │
│ Next                          │
│ Run this test case again to   │
│ check the change.             │
│                               │
│ [ Rerun this test case ]      │
│ [ Next failed assertion ]     │
└───────────────────────────────┘
```

## Breakpoint-Specific Component Strategy

- **Compact**: suite dropdown, stacked cards, bottom sheet drawer, sticky conversation input.
- **Medium**: dropdown or compact rail depending on width, table if readable, side drawer when width allows.
- **Expanded**: persistent suite rail, matrix table, wide side drawer.
- The result matrix remains the primary comparison tool on desktop.
- The stacked test case list remains the primary phone experience.
- The Failure Workbench has the same content model across breakpoints, but placement changes.

## Interaction States

### Ready

- Header says “Ready.”
- Run button is enabled.
- Cells show “Not run” and “Output will appear here.”

### Running

- Run controls disabled.
- Button says “Running...”
- Active cells show running state and pending metrics.
- Drawer closes before run starts to avoid stale analysis.
- Live region announces status and progress.

### Passed

- Suite status says “Passed.”
- Cells use success tone.
- Drawer shows details, assertions, diagnostics, output, and raw artifacts.
- No repair conversation by default.

### Failed

- Suite status says “Failed.”
- Cells use failure tone.
- Failed cell opens Failure Workbench.
- If multiple assertions failed, the first failed assertion is selected by default.
- User can switch active assertion, but conversation context resets or clearly changes to the newly selected assertion.
- Conversation must not blend multiple assertion failures into one proposed fix unless the user explicitly asks after reviewing them.

### Blocked

- Show blocker panel instead of result matrix.
- Copy: “Add local config, then run the eval again.”
- Diagnostics are visible enough to recover, but not dominant.

### Error

- Status says “Could not run.”
- Primary action says “Try again.”
- Error diagnostics explain local setup or run failure.

### Model Selection and LLM Availability

- The run-control “Model” selector changes the model used to produce eval outputs.
- Failure Workbench analysis/proposal drafting uses server-side LLM assistance, not the browser.
- If `SIBU_EVALS_MODEL` is set, it is the default workbench assistance model.
- Do not expose provider API keys or secret values in UI state.
- Missing `OPENAI_API_KEY` disables “Analyze this failure” and proposal drafting, but not result inspection or eval reruns.

### Conversation: Empty

- Prompt: “Want me to analyze this failed assertion?”
- Primary action: “Analyze this failure.”
- Secondary input: “Ask about this failure.”

### Conversation: Analysis Loading

- Disable duplicate analyze action.
- Show “Analyzing this failure...”
- Keep evidence visible.

### Conversation: Analysis Complete

Show concise sections inside the conversation response:

- “What failed”
- “Why it failed”
- “Likely cause”
- “Confidence” or “Needs judgment”
- “Possible direction”

### Proposal Drafting

- Proposal appears as a distinct preview, not just chat text.
- Required fields:
  - project file(s) to change
  - change summary
  - rationale
  - expected eval impact
- Approval controls are unavailable until these fields are concrete.

### Approval

- Button: “Approve change.”
- Secondary: “Reject.”
- Safety copy: “Sibu will only change these project files if you approve.”
- Approval must be unavailable for writes outside the project root or likely secret/credential files.
- After approval, show changed artifact summary and rerun action.

### Rejection / Ignore

- Rejected proposal remains in conversation history as rejected.
- User can ask for another proposal or mark failure “Ignore for now.”
- Ignoring does not hide the failed result globally unless a filter explicitly excludes ignored failures in a future version.

## Accessibility Requirements

- Drawer uses `role="dialog"`, `aria-modal="true"`, labelled title, and description.
- Focus moves into drawer on open and returns to the originating cell on close.
- Escape closes drawer unless a proposal is being approved or a mutation is in progress.
- Trap focus within drawer while open.
- Matrix cells are buttons with clear labels that include test case, variant, status, and action.
- Desktop matrix supports arrow-key navigation.
- Phone stacked list supports up/down cell navigation.
- Status and progress updates use polite live regions.
- Color is never the only status cue; use text labels and icons.
- Touch targets are at least 44px high for primary controls.
- Conversation messages preserve readable line length.
- Raw output and artifact blocks support keyboard copy controls.
- Respect reduced-motion preferences for drawer transitions and progress animation.

## Visual Direction

- Keep the rpgizer dark developer-tool foundation: slate background, compact borders, blue primary actions, rose failures, emerald passes, amber blockers.
- Make the Failure Workbench slightly warmer and more focused than raw diagnostics through clearer grouping and stronger active-failure emphasis.
- Use monospaced text for test case names, exact output excerpts, and artifact paths.
- Use plain sans-serif for explanations and controls.
- Avoid decorative illustrations, charts, badges, or analytics cards beyond the existing summary bar.
- The UI should feel local, serious, and fast; not like a hosted analytics product or AI autopilot.

## Anti-Bloat Review

Removed or excluded from MVP UX:

- historical trend charts
- leaderboards
- broad analytics dashboards
- multi-run comparison beyond the current matrix
- global autonomous repair queues
- automatic “fix all failures” actions
- advanced eval folder configuration
- hidden mutation shortcuts
- browser-exposed provider credentials
- verbose onboarding tours
- decorative empty-state art

Every visible element should help the user run an eval, inspect a result, understand one failure, decide on one proposal, or rerun validation.

## Risks / Tradeoffs

- A conversational workbench can feel like an autopilot if proposal controls are too casual. Keep proposal preview and approval visually separate from chat.
- One-failure focus reduces overwhelm but may feel slower when many assertions fail. Preserve a visible failure queue and “Next failed assertion” action.
- LLM explanations can sound confident when evidence is weak. Require uncertainty labels and evidence references.
- Copying the baseline preserves speed, but Sibu labels must avoid rpgizer-specific “product quality” wording.
- Mutating local files from a UI raises trust requirements. The UI must always show the artifact and rationale before approval.

## UI Authority Rule

The Binding Mockups section is authoritative for downstream technical design, stories, implementation plans, and implementation unless this UX spec is revised. Downstream work must preserve the one-failure-at-a-time conversational workbench, separate eval-run and workbench-analysis model concerns, and the explicit approval gate before any project file mutation.
