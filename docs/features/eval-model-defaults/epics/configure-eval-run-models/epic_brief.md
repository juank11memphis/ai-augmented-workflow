# Configure Eval Run Models Epic Brief

**Epic ID:** EMD-E01

## Summary

Engineers can set reusable suite model defaults, override them for individual cases, and run evals without repeated model setup or silent substitutions. Results show the models actually used for each case in both the workbench and agent-guided flow.

## Source Context

- BRD: [Eval Model Defaults](../../brd.md), REQ-01–REQ-06 and AC-01–AC-06.
- Technical design: [Software Design](../../sdd.md), especially Responsibilities and Contracts, Project-Owned Suite Format and Persistence, Main Flow and Runner Coordination, Run Evidence, and Quality Strategy.
- Domain and capabilities: [Business Domain Model](../../../../business-domain-model.md), Local Evals Workbench concepts/rules; [Capabilities Map](../../../../capabilities-map.md), Manage suite model defaults, Manage test-case model overrides, Resolve models for eval runs, and Resolve unavailable eval model choices.
- UX: [UX Spec](../../ux.md), binding phone/tablet/desktop mockups, persistent-choice dialogs, blocked states, and case-first results.

## Scope

- Present existing results by case with actual model labels.
- Persist separate suite defaults and case overrides in project-owned eval suite definitions; support explicit set, change, and reset.
- Resolve the effective evaluation and optional judge model for each selected case in preview and execution, including a temporary choice for one-case runs.
- Pause for missing or unavailable saved choices; keep the UI and agent-guided flow consistent.
- Preserve historical result readability and the established run preview, evidence, and repair paths.

## Out of Scope

- Automatic recommendations or model fallback, run-wide temporary overrides for full suites, same-case multi-model comparison, new cost controls, headless CI, or live-model evals as routine tests.
- Automated UI tests or agent-performed UI review; the user owns post-implementation UI QA against the UX mockups.

## User Stories and Sequence

1. [EMD-S01 — Inspect case-first eval results](./stories/01-inspect-case-first-eval-results.md) — establishes clear per-case result presentation; dependencies: none.
2. [EMD-S02 — Reuse suite model defaults](./stories/02-reuse-suite-model-defaults.md) — delivers persistent suite choices and one-case temporary choices; depends on EMD-S01.
3. [EMD-S03 — Override models for individual cases](./stories/03-override-models-for-individual-cases.md) — delivers mixed-model full-suite runs and per-case evidence; depends on EMD-S02.

## Feature Flags

- none. Each Story leaves a working, deployable increment; incomplete later capabilities are not exposed as nonworking controls.

## Acceptance Criteria

- A user sets suite defaults once, reruns without repeated selection, and can deliberately change or reset either model kind (REQ-01, REQ-03; AC-01, AC-02).
- A full-suite run with eight inherited X choices and one Y override executes and reports eight X cases and one Y case, with independent judge choices where required (REQ-02, REQ-03, REQ-06; AC-03, AC-06).
- Single-case run-only choices do not change saved defaults; missing or unavailable choices block until the user acts (REQ-04, REQ-05; AC-04, AC-05).
- UI and agent-guided workflows follow the same effective-selection rules, and the user can inspect actual per-case choices (REQ-06; AC-06).

## Dependencies / Risks

- The existing runner accepts one model pair per execute request; mixed-model suites need ordered batch orchestration under one logical run and honest partial results.
- Strict version-2 suite validation and persisted historical run records require backward-compatible changes, not silent file or artifact rewrites.
- The agreed verification omits UI automation and agent visual review; the user performs UI and accessibility QA after implementation.
