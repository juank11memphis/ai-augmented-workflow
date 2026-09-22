# Production-Ready AI Evals Business Requirements Document

## Executive Summary and Business Need

Developers using Sibu need to create meaningful eval coverage for repo-local generative-AI integrations without first becoming eval-infrastructure experts. Today, Sibu can describe and display evals, but it does not yet give users a complete path from understanding a real AI integration to generating and executing deep, immediately runnable suites.

This feature lets a developer ask their coding agent to find or inspect AI integrations, review a proposed coverage plan, generate project-owned eval suites, and run them locally against a selected compatible model. It emphasizes systematic risk-based coverage, real target behavior, explicit gaps, safe tool simulation, and human-controlled repair.

## Objectives and Measurable Success

- OBJ-01 — A developer can confirm the repo's Evaluation Targets, approve proposed coverage, generate immediately runnable suites, and execute them locally against a selected compatible model without manually building eval infrastructure.
- OBJ-02 — Every generated suite demonstrates systematic coverage of all applicable behavior and risk categories, with justified Coverage Gaps instead of happy-path-only or falsely exhaustive claims.
- OBJ-03 — Eval creation, execution evidence, and repair preserve project ownership, prevent accidental secret or production-data exposure, avoid external tool side effects, and keep mutations under explicit user control.

## Stakeholders and Needs

- **Software engineers and AI application developers** need fast, credible eval coverage for prompts, generative-AI integrations, agents, multi-turn behavior, and tool use.
- **Engineering teams and reviewers** need understandable coverage, repeatable evidence, visible omissions, and durable run history for judging regressions and repairs.
- **Repository owners** need generated artifacts to remain project-owned, production integrations to remain unchanged during suite generation, and run evidence to stay out of normal Git and LLM context.
- **Sibu maintainers** need a provider-flexible product boundary that does not turn Sibu into a hosted eval platform or owner of project behavior.

## Primary User Workflow

1. The developer asks their coding agent to create evals for the project or points it to a specific AI integration, agent, prompt, or workflow.
2. The agent inspects repo-owned evidence and proposes likely Evaluation Targets for confirmation.
3. For confirmed targets, the agent proposes deep risk-based coverage, grading approaches, tool behavior, and known Coverage Gaps.
4. The developer approves or corrects the Eval Coverage Plan.
5. The agent generates immediately runnable, project-owned eval suites and test-support artifacts without modifying production behavior.
6. In the local dashboard, the developer selects a suite, scope, compatible Model Under Evaluation, optional Judge Model, and optional repeat count.
7. Sibu previews expected model calls and estimated cost, executes real target behavior, and retains inspectable results.
8. For a failure, the developer can analyze one failed assertion, review a proposed repair, explicitly approve any mutation, and rerun the relevant scope.

## Scope and Exclusions

### In Scope

- Discover likely repo-local Evaluation Targets when eval creation is requested, while also supporting directly named targets.
- Require user confirmation of discovered targets.
- Produce and require approval of an Eval Coverage Plan before generating files.
- Generate runnable suites covering applicable happy paths, edge cases, failures, abuse and safety risks, ambiguous and malformed inputs, adversarial inputs, multi-turn behavior, tool behavior, and nondeterminism.
- Combine deterministic assertions, reference expectations, and rubric-based grading according to the behavior being tested.
- Use simulated tool behavior without real external side effects.
- Use synthetic or appropriately redacted fixtures.
- Run a full suite or one test case locally against one compatible Model Under Evaluation.
- Allow a separately selected Judge Model for rubric-based grading.
- Allow optional repeated case execution, with one execution as the default.
- Preview expected model-call volume and estimated cost before execution.
- Retain local run history and bounded failure evidence across dashboard sessions.
- Preserve the existing analysis, approval-gated repair, and focused-rerun workflow.

### Out of Scope

- Running one suite against multiple Models Under Evaluation in the same run.
- Headless or CI eval execution.
- Invoking real external tools or services during tool-behavior evals.
- Hosted eval execution, shared cloud history, benchmarking-as-a-service, or autonomous optimization.
- Modifying production AI integrations while generating suites.
- Guaranteeing literal exhaustive coverage of open-ended AI behavior.

## Requirements

- REQ-01 — Type: functional; Objectives: OBJ-01, OBJ-02. When asked to create evals without an explicit target, Sibu-guided agents must identify likely Evaluation Targets and present them for user confirmation.
- REQ-02 — Type: functional; Objectives: OBJ-01, OBJ-02. The user must be able to directly name a specific integration, agent, prompt, or workflow instead of using discovery.
- REQ-03 — Type: functional; Objectives: OBJ-02, OBJ-03; Rules: RULE-01, RULE-02. Before generating suite files, the agent must present an Eval Coverage Plan for user approval.
- REQ-04 — Type: quality; Objectives: OBJ-02; Rules: RULE-03. Coverage planning must systematically assess every applicable agreed coverage category and document justified Coverage Gaps.
- REQ-05 — Type: functional; Objectives: OBJ-01, OBJ-02; Rules: RULE-04. Approved plans must produce immediately runnable, project-owned suites with appropriate cases, fixtures, expectations, assertions, graders, rubrics, and test-support artifacts.
- REQ-06 — Type: functional; Objectives: OBJ-02. Generated suites must support single-turn and multi-turn cases, including conversation state and behavior across turns where applicable.
- REQ-07 — Type: functional; Objectives: OBJ-02, OBJ-03; Rules: RULE-05. Generated suites must support simulated tool selection, arguments, ordering, results, errors, and unexpected responses without real external side effects.
- REQ-08 — Type: functional; Objectives: OBJ-02. Sibu must use deterministic assertions for exact behavior and support a separately selected Judge Model for qualitative rubric-based behavior.
- REQ-09 — Type: functional; Objectives: OBJ-01. The local dashboard must let the user run all cases or one case against one compatible Model Under Evaluation.
- REQ-10 — Type: functional; Objectives: OBJ-02. The user must be able to optionally repeat a case to expose nondeterministic failures, while retaining a single execution as the default.
- REQ-11 — Type: quality; Objectives: OBJ-01, OBJ-03. Before execution, Sibu must show expected model-call volume and an estimated cost.
- REQ-12 — Type: functional; Objectives: OBJ-01, OBJ-03. Results must expose outputs, assertion and grader outcomes, scores, tool traces, diagnostics, and other evidence needed to understand behavior.
- REQ-13 — Type: functional; Objectives: OBJ-01, OBJ-03; Rules: RULE-06. Local run history and evidence must persist across dashboard sessions while remaining outside normal source-control tracking and ordinary LLM context.
- REQ-14 — Type: functional; Objectives: OBJ-01, OBJ-03; Rules: RULE-07. The user must be able to analyze one failed assertion, review a concrete repair proposal, approve or reject it, and rerun the relevant scope.
- REQ-15 — Type: quality; Objectives: OBJ-03; Rules: RULE-08. Generated fixtures and retained evidence must not introduce secrets, credentials, or raw production data.
- REQ-16 — Type: quality; Objectives: OBJ-01. If expected behavior cannot be established from repo-owned evidence, suite generation must stop for focused user clarification rather than inventing pass/fail criteria.

## Business Rules

- RULE-01 — The user confirms Evaluation Targets before coverage planning proceeds.
- RULE-02 — The user approves or corrects the Eval Coverage Plan before suite artifacts are generated.
- RULE-03 — “Production-ready” means deep, systematic, risk-based coverage with visible gaps; it never means a claim of exhaustive coverage.
- RULE-04 — Repo code, prompts, tests, and documentation are evidence of intended behavior, while the user resolves material ambiguity.
- RULE-05 — Initial tool-behavior evals use simulated tools only and must not create real external side effects.
- RULE-06 — Run artifacts must be ignored by normal source-control operations, excluded from normal agent context, and loaded only as bounded evidence when relevant.
- RULE-07 — Suite generation may create eval and test-support artifacts but may not modify production behavior. Production changes require a concrete repair proposal and explicit user approval.
- RULE-08 — Fixtures use synthetic or appropriately redacted data and never contain secrets, credentials, or raw production data.
- RULE-09 — One Eval Run uses exactly one Model Under Evaluation and may use one separate Judge Model.

## Business Acceptance Criteria

- AC-01 (REQ-01, REQ-02) — Given a Sibu-initialized repo with several AI integrations, the agent proposes likely targets when none are named and accepts a directly named target when one is provided.
- AC-02 (REQ-03, REQ-04) — Before file generation, the user can review targets, applicable coverage categories, proposed scenarios, grading approaches, tool behavior, and justified gaps.
- AC-03 (REQ-05, REQ-06) — After approval, every confirmed target has an immediately runnable suite containing applicable single-turn and multi-turn cases without production-file changes.
- AC-04 (REQ-07) — Tool-oriented cases can verify selection, arguments, order, successful results, failures, and unexpected responses without calling a real external tool.
- AC-05 (REQ-08) — Exact behavior is judged deterministically, while qualitative behavior can be scored by the separately identified Judge Model using an inspectable rubric.
- AC-06 (REQ-09) — The local dashboard offers only compatible Models Under Evaluation and can execute either the complete suite or one selected case against one selected model.
- AC-07 (REQ-10, REQ-11) — The user can choose a repeat count and sees expected call volume and estimated cost before starting the run.
- AC-08 (REQ-12, REQ-13) — Completed results retain inspectable outputs, scores, tool traces, diagnostics, and assertion/grader outcomes across dashboard restarts without appearing in normal Git changes or ordinary agent context.
- AC-09 (REQ-14) — A failed assertion can move through focused analysis, proposal review, explicit approval or rejection, approved mutation, and focused rerun without silent file changes.
- AC-10 (REQ-15) — Generated fixtures and retained evidence contain no detected secret, credential, or raw production-data material.
- AC-11 (REQ-16) — When repo evidence does not establish a meaningful expectation, the agent requests focused clarification and does not create invented pass/fail criteria.

## Constraints, Assumptions, and Risks

- Model availability and compatibility depend on external providers and project configuration.
- LLM-judged rubrics may vary; results must distinguish deterministic checks from Judge Model outcomes.
- Repeated runs and Judge Model use increase cost, making pre-run consumption visibility essential.
- Target discovery and coverage planning can miss implicit business behavior; confirmation, explicit gaps, and clarification remain required.
- Local artifact isolation prevents accidental Git and context pollution but cannot prevent a deliberate user override.

## Product Vision Fit

This feature strengthens Sibu's purpose as a local, human-controlled workflow companion. It gives developers strong defaults and deep guidance without owning their editor, models, product behavior, or judgment. Project-owned suites, visible gaps, cost transparency, bounded evidence, and approval-gated mutation preserve Sibu's trust and user-control principles.

## Business Domain Model Fit

The feature extends the existing Local Evals Workbench lifecycle through the defined Evaluation Target, Eval Coverage Plan, Coverage Gap, Eval Suite, Eval Test Case, Tool Interaction Expectation, Model Under Evaluation, Judge Model, Eval Run, Failure Analysis, Repair Proposal, and Approved Eval Repair concepts. It preserves the distinction between project-owned behavior, external model providers, Sibu-guided evaluation, and user-approved mutation.

## Capability Coverage

From `docs/capabilities-map.md`:

- **Skill Guidance**: Discover evaluation targets; Propose deep eval coverage; Expose coverage gaps; Require coverage review; Generate runnable eval suites; Clarify expected behavior; Guide eval authoring.
- **Local Evals Workbench**: Discover local eval suites; Select compatible evaluation models; Execute real AI behavior; Run focused eval scope; Repeat nondeterministic cases; Preview run consumption; Show eval result status; Preserve isolated run evidence; Inspect failure evidence; Analyze one failed assertion at a time; Draft concrete repair proposals; Gate repair mutations by approval; Apply approved project repairs; Guide eval reruns after repair.
- **Template Catalog**: Provide eval-authoring templates.
- **External AI Models and Providers**: produce target behavior and rubric judgments while remaining outside Sibu's owned domain.
