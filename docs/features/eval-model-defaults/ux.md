# UX Spec: Eval Model Defaults

## Input Product Artifact

Source: `docs/features/eval-model-defaults/brd.md`. This design covers REQ-01–REQ-06 and AC-01–AC-06. The source BRD governs model-selection rules; the mockups below govern UI structure, visible content, and interactions.

## Product Vision and Domain Grounding

Reduce routine setup without taking control from the engineer. Keep the Model Under Evaluation (shown as **Model**) distinct from the **Judge model**. A suite holds defaults; a selected test case may override either one. Full-suite runs use effective per-case choices. Only a single-case run offers a temporary choice. Missing or unavailable saved choices stop the run for an explicit decision, never a silent fallback.

## UX Intent and Affected Surfaces

- Keep **Start run** the primary action. Show saved choices at a glance rather than asking for them on every full-suite run. (REQ-01, REQ-03)
- Put a labeled **Models** action beside the suite summary and beside the currently selected test case. Do not use a gear-only icon or add an always-visible test-case list. (REQ-01, REQ-02)
- Use contextual **Suite models** and **Test-case models** dialogs for persistent changes. Use run controls, not those dialogs, for **This run only** choices. (REQ-01, REQ-02, REQ-04)
- Replace model-column result grouping with one result row/card per case, showing the models actually used. (REQ-06)
- Apply the same decision and recovery wording to the agent-guided flow, without treating the coding-agent conversation as another visual screen. (REQ-06)

## Phone-First User Flow

1. Choose a suite. Its summary shows **Model** and **Judge model** defaults, or **Not set** where relevant, with **Models** beside them. A deterministic-only suite omits the judge row. (REQ-01)
2. To change suite defaults, open **Suite models**, choose compatible models, and save. **Reset** clears a saved default; its row then says **Not set**. Changes to one model kind do not change the other. (REQ-01)
3. To manage a case, choose **One test case**, select a case, and open its **Models** action. The case summary shows **Inherited from suite** or **Override** beside each applicable model. A case override can be changed or reset to inheritance. No separate case list appears. (REQ-02)
4. For a single-case run, leave **Use saved models** selected or choose **This run only** and select a different compatible model and, where rubric grading applies, a judge model. The temporary choice is visibly separate from **Models** and does not save. (REQ-04)
5. Choose **Start run**. If required suite defaults are missing or any saved choice in scope is unavailable, the affected dialog opens with the needed choice highlighted. The run waits; after the user saves a compatible replacement or explicitly resets an unavailable case override, return to the run controls ready to start. Do not auto-start after a saved-choice change. (REQ-05)
6. Inspect one case result at a time. Each card shows status, case name, **Model**, and **Judge model** if used; opening a card reveals its existing evidence and repair flow. (REQ-06)

## Information Architecture and Content Rules

- **Suite context:** name, short description, compact saved-model summary, **Models**, run scope, **Start run**.
- **Selected case context:** case name, effective model summary with inheritance/override labels, **Models**, optional **This run only** controls.
- **Results:** case-first status list. Model labels are supporting metadata, not the primary result hierarchy.
- Visible copy uses **Model**, **Judge model**, **Suite models**, **Test-case models**, **Inherited from suite**, **Override**, **Not set**, **Unavailable**, **This run only**, **Reset override**, and **Start run**. Avoid internal IDs, provider errors, implementation terms, or an unexplained gear.
- The summary shows a judge only when relevant to the suite or selected case. A temporary choice appears only for one-case scope. (RULE-01, RULE-03 in source BRD)
- Preview and model-choice controls show model names, not expected-call counts, prices, or cost estimates.

## Responsive Layout and Component Strategy

- **Phone / compact:** one vertical task column. The suite summary precedes run scope; selected-case controls appear only for one-case scope. Persistent model dialogs occupy the full viewport. Results are stacked cards.
- **Tablet / medium:** retain the suite and run controls in one main column with a modest side region for suite navigation if space permits. Dialogs are centered and wide enough for readable model names. Results remain a case-first list.
- **Desktop / expanded:** retain the existing suite navigation rail; place suite summary and run controls in the main pane. The selected case is a compact section below run scope. Dialogs are centered over the workbench. Results use case-first rows, not model columns.
- All sizes keep **Models** as a labeled control, not an icon-only affordance. No separate pre-run case list is introduced.

## Binding Mockups

These mockups are authoritative for hierarchy, visible content, and dominant interactions. Example names illustrate states; actual suite, case, and model names come from the user's eval workspace.

### Phone: suite defaults and full-suite run

```text
┌──────────────────────────────┐
│ Eval suites                  │
│ [Customer support       ▾]   │
│                              │
│ Customer support             │
│ Answers and tool use         │
│ Model        Model X          │
│ Judge model  Model J          │
│ [Models]                     │
│                              │
│ Run scope                    │
│ (●) All test cases           │
│ ( ) One test case            │
│                              │
│ [Start run]                  │
└──────────────────────────────┘
```

### Phone: selected case and temporary choice

```text
┌──────────────────────────────┐
│ Customer support             │
│ Model  Model X · Judge Model J│
│ [Models]                     │
│                              │
│ Run scope                    │
│ ( ) All test cases           │
│ (●) One test case            │
│ Test case                    │
│ [Handles delayed tool  ▾]    │
│ Model        Model Y          │
│              Override        │
│ Judge model  Model J          │
│              Inherited       │
│ [Models]                     │
│                              │
│ (●) Use saved models         │
│ ( ) This run only            │
│ [Start run]                  │
└──────────────────────────────┘

When “This run only” is selected, reveal separate Model and, only when needed,
Judge model selectors above Start run, labeled “For this run only.”
```

### Phone: persistent model dialogs

```text
┌──────────────────────────────┐
│ Suite models             [×]  │
│ Customer support             │
│                              │
│ Model                        │
│ [Model X                ▾]    │
│ [Reset default]              │
│                              │
│ Judge model                  │
│ [Model J                ▾]    │
│ [Reset default]              │
│                              │
│ [Cancel]          [Save]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Test-case models         [×]  │
│ Handles delayed tool         │
│                              │
│ Model                        │
│ ( ) Inherit Model X          │
│ (●) Override [Model Y ▾]     │
│ [Reset override]             │
│                              │
│ Judge model                  │
│ (●) Inherit Model J          │
│ ( ) Override [Choose ▾]      │
│                              │
│ [Cancel]          [Save]      │
└──────────────────────────────┘
```

### Phone: blocked choice and case-first result

```text
┌──────────────────────────────┐
│ Suite models             [×]  │
│ Set a suite model to run.    │
│ Model  [Choose model    ▾]    │
│ [Cancel]          [Save]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Test-case models         [×]  │
│ Handles delayed tool         │
│ Model Y is unavailable.      │
│ ( ) Replace [Choose ▾]       │
│ ( ) Inherit Model X          │
│ [Cancel]          [Save]      │
└──────────────────────────────┘

┌──────────────────────────────┐
│ Results                      │
│ ✓ Answers clearly            │
│   Model X · Judge Model J    │
│   [View result]              │
│ ! Handles delayed tool       │
│   Model Y · Judge Model J    │
│   [View result]              │
└──────────────────────────────┘
```

If a suite default is unavailable, use the Suite models dialog with
“Model X is unavailable” and a required replacement selector. A judge-model
problem uses the same pattern under Judge model. A reset suite default shows
“Not set” in the summary and triggers the missing-default dialog on a run that
needs it. No dialog makes a replacement selection automatically.

### Tablet: suite controls, selected case, and results

```text
┌──────────────────────────────────────────────────────────────┐
│ Eval suites          Customer support                        │
│ [Suite list]          Model X · Judge Model J  [Models]       │
│                       Run scope: ( ) All  (●) One             │
│                       Test case [Handles delayed tool ▾]    │
│                       Model Y · Override  [Models]           │
│                       Judge Model J · Inherited              │
│                       (●) Saved  ( ) This run only           │
│                       [Start run]                            │
│                       ─────────────────────────────────────  │
│                       Results                                │
│                       Handles delayed tool  !               │
│                       Model Y · Judge Model J [View result]  │
└──────────────────────────────────────────────────────────────┘

Persistent dialogs are centered over the main pane, using the same fields,
messages, and actions as the phone dialog. A missing or unavailable choice
opens the corresponding dialog from Start run before execution.
```

### Desktop: suite controls and case-first results

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Eval workbench                                                           │
├──────────────────┬───────────────────────────────────────────────────────┤
│ Eval suites      │ Customer support                   [Models]            │
│ • Customer       │ Model X · Judge Model J                                │
│   support        │                                                       │
│ • Other suite    │ Run scope  (●) All test cases  ( ) One test case       │
│                 │ [Start run]                                           │
│                 │                                                       │
│                 │ Results                                               │
│                 │ Case                  Status  Model    Judge  Action    │
│                 │ Answers clearly       Pass    Model X  Model J [View]  │
│                 │ Handles delayed tool  Fail    Model Y  Model J [View]  │
└──────────────────┴───────────────────────────────────────────────────────┘

With “One test case” selected, show a case picker, the selected case’s model
summary and Models action, then the Saved / This run only choice above Start run.
The Suite models and Test-case models dialogs are centered over the workbench;
blocked states use the same dialog content shown in the phone mockups.
```

## Interaction States and Recovery

- **Not set:** show **Not set** in the suite summary. Start run opens the Suite models dialog if that default is needed. The user selects and saves a model, then starts the run again. (REQ-05)
- **Inherited / overridden:** show the effective model and a short source label in selected-case context; changes update that summary immediately after Save. Reset override returns the label to **Inherited**. (REQ-02)
- **Unavailable suite default:** keep the unavailable choice visible, explain which role is affected, and require a replacement in Suite models. Do not auto-clear it. (REQ-05)
- **Unavailable case override:** open Test-case models and offer **Replace** or **Inherit** as explicit alternatives. If the inherited suite choice is also unavailable, it must be resolved separately before the run proceeds. (REQ-05)
- **Cancel / close:** leave saved choices unchanged and return focus to the trigger. The run remains unstarted. (REQ-01, REQ-05)
- **Save:** confirm with a short status message, return focus to the trigger, update summaries, and leave Start run under user control. (REQ-01, REQ-02)
- **Results:** show the actual evaluation and, when used, judge model for each case, including temporary choices. The case result still leads to the existing failure inspection and repair path. (REQ-06)
- **Agent-guided parity:** describe the same missing/unavailable choice and explicit options in conversation; do not present an invented default or proceed after a blocked choice. (REQ-06)

## Accessibility and Visual Direction

- **Models** has a visible text label and a touch target of at least 44 by 44 CSS pixels. Every selector and radio group has a persistent label; inherited and override states are expressed in text, not color alone.
- Dialogs have a visible heading, modal focus containment, Escape/Close/Cancel paths, and focus return to the originating **Models** or **Start run** control. Blocking messages are announced to assistive technology without stealing focus from the first actionable field.
- Case-first result rows/cards have readable model names without relying on hover or horizontal scrolling on phones. Status uses text as well as color or symbol.
- Use the workbench’s existing dark palette and typography. Give **Start run** the strongest emphasis; **Models** and **View result** are secondary. Use restrained borders and spacing, not new dashboard cards or decorative metrics. No motion is needed beyond normal focus and status feedback.

## Risks, Tradeoffs, and UI Authority

- Accessing a case override requires selecting **One test case** first. This keeps the full-suite screen simple but adds a step for bulk override review; bulk editing is outside this feature.
- A full-suite run can mix models across cases. Per-case result labels prevent a misleading single-model summary, while the suite summary continues to describe saved suite defaults only.
- These mockups are binding for downstream UI design and implementation unless this UX spec is revised. Preserve the source BRD’s model rules and acceptance criteria when adapting visual details.
