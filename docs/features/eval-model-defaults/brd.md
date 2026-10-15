# Eval Model Defaults Business Requirements Document

## Executive Summary and Business Need

Engineers running local evals currently repeat model selection before runs. Sibu should let them choose persistent suite defaults for the Model Under Evaluation and, when rubric grading needs one, the separate Judge Model. Test cases inherit those choices unless a user sets a case-specific override. This reduces repetitive setup while preserving granular, explicit control in both the Local Evals Workbench UI and agent-guided eval sessions.

## Objectives and Measurable Success

- OBJ-01 — Reduce repeated model setup: in acceptance scenarios, a user who has set required suite defaults can rerun a suite without selecting models again.
- OBJ-02 — Preserve granular and trustworthy selection: in acceptance scenarios, each test case runs with its inherited or overridden models, while single-case one-run choices and unavailable-model decisions never silently change saved defaults.

## Stakeholders and Needs

- **Engineer or team member running evals**: wants recurring runs to use chosen models without repeated setup, but needs to vary evaluation and judge models for individual cases.
- **Engineer reviewing results**: needs the models actually used for each case to remain distinguishable, especially when a suite contains overrides or rubric grading.

## Scope and Exclusions

**First useful scope:** Users can optionally set suite model defaults during suite creation, set or change them later, and manage independent test-case overrides. Before a run, Sibu requires any missing suite default needed for that run. Full-suite runs use each case's effective models; single-case runs may use a different model for that run only. The same business rules apply in the UI and agent-guided flow.

**Excluded:** automatic model recommendations or fallback selection; a one-run model choice applied across a full suite; comparing multiple models on the same test case in one run; new cost controls, headless CI execution, or changes to eval repair approval rules.

## Requirements

- REQ-01 — Type: functional; Objectives: OBJ-01, OBJ-02. Let users set, change, and reset a persistent suite default Model Under Evaluation and a separate suite default Judge Model when rubric grading requires one. Offering defaults during suite creation is optional; a required default must be set before execution. (RULE-01, RULE-04)
- REQ-02 — Type: functional; Objectives: OBJ-02. Let users set, change, and reset an independent test-case override for either model kind; resetting an override restores inheritance from the suite. (RULE-02)
- REQ-03 — Type: functional; Objectives: OBJ-01, OBJ-02. Resolve each case's effective models for a full-suite run from its overrides or suite defaults, without asking the user to select models again when valid required defaults exist. (RULE-02, RULE-03)
- REQ-04 — Type: functional; Objectives: OBJ-02. For a single-test-case run, let the user choose a different compatible evaluation model or, when needed, judge model for that run only. (RULE-03)
- REQ-05 — Type: quality; Objectives: OBJ-02. Pause an affected run when a required suite default is missing or a saved choice is unavailable; explain the needed user decision rather than silently substituting a model. (RULE-04, RULE-05)
- REQ-06 — Type: stakeholder; Objectives: OBJ-01, OBJ-02. Apply the same default, override, one-run, and unavailable-model rules in the Local Evals Workbench UI and agent-guided eval sessions, with the actual per-case model choices visible in run results. (RULE-01–RULE-05)

## Business Rules

- RULE-01 — The Model Under Evaluation and Judge Model are separate choices. A Judge Model is required only for selected cases with rubric-based grading; deterministic-only grading does not require one.
- RULE-02 — Each test case inherits each suite model default unless it has an override for that model kind. Clearing a test-case override restores inheritance. Clearing a suite default leaves it unset, not replaced by a fallback.
- RULE-03 — A full-suite run uses each case's effective models, so different cases may use different models. A one-run choice is available only for a single-case run and does not change saved defaults or overrides.
- RULE-04 — A suite Model Under Evaluation default must be set before any run. A suite Judge Model default must be set before a run whose selected scope needs rubric grading. If a required default is unset, the user must set it before execution, even if a selected case has an override.
- RULE-05 — If a saved suite default becomes unavailable, the affected run pauses until the user selects a compatible replacement. If a test-case override becomes unavailable, the user may select a compatible replacement or explicitly clear the override to inherit the suite default. Sibu never silently substitutes or ignores an unavailable saved choice.

## Business Acceptance Criteria

- AC-01 (REQ-01, REQ-03) — After setting a suite evaluation default, the user can rerun a deterministic-only suite without selecting models again; changing the saved default changes later runs, while resetting it prompts for a new choice before another run.
- AC-02 (REQ-01, REQ-03) — For a suite containing rubric grading, the user can set a separate Judge Model default and rerun without choosing a judge again. A deterministic-only selected scope does not require a Judge Model.
- AC-03 (REQ-02, REQ-03) — Given nine cases with suite evaluation default X and one case override Y, a full-suite run uses X for eight cases and Y for the overridden case; clearing that override returns it to X. The same inheritance applies independently to judge models where needed.
- AC-04 (REQ-04) — A user running one case can choose another compatible model for that run; a later run still uses the saved effective default.
- AC-05 (REQ-05) — With a required suite default unset, execution waits for the user to set it. With an unavailable suite default or test-case override, execution waits for the user's replacement or permitted override reset; no model is silently substituted.
- AC-06 (REQ-06) — The UI and agent-guided flow apply the same choices and stops, and results identify the evaluation and, when used, judge model for each case.

## Product Vision Fit

Persistent, user-selected defaults reduce routine interruption without taking model judgment away from the engineer. Explicit overrides, reset behavior, and pauses on missing or unavailable choices follow Sibu's principles of strong defaults, local control, and no silent consequential decisions.

## Business Domain Model Fit

This feature uses the existing **Local Evals Workbench**, **Eval Suite**, **Eval Test Case**, **Model Under Evaluation**, **Judge Model**, **Suite Model Default**, **Test-Case Model Override**, **One-Run Model Choice**, **Unavailable Eval Model Choice**, and **Eval Run** concepts in `docs/business-domain-model.md`. It preserves the distinction between the model producing behavior and the model judging a rubric, and allows different cases in a suite to use different effective models without introducing same-case multi-model comparison.

## Capability Coverage

The existing **Local Evals Workbench** subdomain in `docs/capabilities-map.md` provides **Manage suite model defaults**, **Manage test-case model overrides**, **Resolve models for eval runs**, **Resolve unavailable eval model choices**, and **Guide agent-based eval sessions**. Existing **Show eval result status** and **Preserve isolated run evidence** support inspection of the resulting per-case choices.
