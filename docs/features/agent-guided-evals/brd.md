# Agent-Guided Evals Business Requirements Document

## Executive Summary and Business Need

Developers can author and run repo-local evals with Sibu, but a failed run currently sends them back and forth between the Evals UI and a coding agent to diagnose, repair, and rerun it. Agent-Guided Evals adds a conversational path through the same eval loop in Codex and Claude Code. The developer chooses what to run and which concrete fix to make; the agent handles diagnosis and verification without requiring a return to the UI. The existing Evals UI and eval-authoring skill remain available and unchanged.

## Objectives and Measurable Success

- OBJ-01 — Remove manual UI-to-agent handoffs from eval troubleshooting. In a walkthrough of a failing case in each supported coding agent, the developer can move from the initial run through a user-approved fix to a verified rerun in one agent conversation, with zero required visits to the Evals UI.
- OBJ-02 — Preserve human control and trustworthy results. In those walkthroughs, every project-file change follows approval of a concrete fix, and the agent reports verification from a new run rather than treating an applied edit as proof of success.

## Stakeholders and Needs

- **Developer using Sibu evals**: needs to start with a natural request, choose a suite and run scope, understand a failure in plain language, decide how to fix it, and keep troubleshooting in one place.
- **Project team**: needs project-owned evals and code to remain reviewable, with no unapproved edits or hidden claims that AI behavior has been fixed.

## Scope and Exclusions

**First version includes:** a conversational eval session in both Codex and Claude Code; discovery of available suites and test cases; selection of a full suite or one case, a compatible Model Under Evaluation, and a Judge Model when needed; execution using the existing repo-local evals; one-failure-at-a-time diagnosis and fix options; user-approved repair of affected project files, including production code or prompts when approved; automatic focused reruns; and a final full-suite rerun when the original scope was the suite.

**Excluded:** replacing or redesigning the Evals UI or eval-authoring skill; automatic selection or application of a fix without the developer's approval; cost controls for this mode; headless CI, multi-model comparisons, hosted evals, and real external-tool side effects.

## Requirements

- REQ-01 — Type: functional; Objectives: OBJ-01. From a natural-language request to work on evals, the coding agent identifies available eval suites, lists their test cases, and lets the developer choose a full suite or one case.
- REQ-02 — Type: functional; Objectives: OBJ-01. Before the initial run, the developer chooses a compatible Model Under Evaluation and, when the selected checks require it, a separate Judge Model. The agent then runs the selected scope against the existing project-owned evals.
- REQ-03 — Type: functional; Objectives: OBJ-01, OBJ-02. When a run has failures, the agent investigates one failed assertion at a time and returns a short, plain-language explanation grounded in the observed result, likely cause, uncertainty, and possible fixes. It distinguishes an eval behavior failure from a runner, credential, or judge problem when the evidence permits.
- REQ-04 — Type: functional; Objectives: OBJ-01, OBJ-02. Before changing any project file, the agent presents a concrete proposed fix, its affected files, rationale, and expected eval impact, then waits for the developer to choose and approve that fix (RULE-01, RULE-02).
- REQ-05 — Type: functional; Objectives: OBJ-01, OBJ-02. After an approved fix is applied, the agent reports the changed files and automatically reruns the affected test case. It advances to another failed assertion only when the rerun verifies that the active assertion passes (RULE-03).
- REQ-06 — Type: functional; Objectives: OBJ-01, OBJ-02. If the active assertion still fails after a rerun, the agent analyzes the new evidence and offers revised fix options for another developer decision; it makes no further unapproved edits (RULE-01, RULE-03).
- REQ-07 — Type: functional; Objectives: OBJ-01, OBJ-02. If the developer originally selected the full suite, the agent reruns the full suite after resolving known failures, handles any remaining failures one at a time, and reports the final verified outcome (RULE-03, RULE-04).
- REQ-08 — Type: quality; Objectives: OBJ-01. The same user-facing eval workflow is available in both Codex and Claude Code without requiring the developer to switch to the Evals UI during troubleshooting.
- REQ-09 — Type: quality; Objectives: OBJ-02. When analysis or a run cannot continue because of missing access, invalid configuration, ambiguous expectations, or another blocker, the agent explains the blocker and next user action without inventing a diagnosis, changing unrelated files, or claiming success (RULE-04).
- REQ-10 — Type: transition; Objectives: OBJ-01, OBJ-02. The existing Evals UI and eval-authoring skill continue to work as before; agent-guided sessions use the same repo-local suites and evidence rather than creating a competing eval system.

## Business Rules

- RULE-01 — Approval applies to one concrete proposed fix and its named affected files; it does not authorize a later fix or unrelated edits.
- RULE-02 — Approved repairs remain inside the project root and must not change secrets or credentials. Production code and prompts are eligible only when the developer approves that specific fix.
- RULE-03 — The session has one active failed assertion at a time. A focused rerun must show that assertion passing before the agent moves to the next failure; an approved fix authorizes its automatic verification rerun without another routine prompt.
- RULE-04 — An applied fix is not a verified resolution. The agent reports what the new run shows, including remaining failures and uncertainty; a session that started with a full suite needs a final full-suite rerun before claiming suite success.

## Business Acceptance Criteria

- AC-01 (REQ-01, REQ-02, REQ-08) — In both Codex and Claude Code, a developer can ask to work on evals, see available suites and cases, select all cases or one, choose the evaluation model and a judge when required, and start the run without opening the UI.
- AC-02 (REQ-03) — A run with multiple failures produces an evidence-grounded, concise diagnosis and possible fixes for only the active failure; the agent does not present an unverified single cause for all failures.
- AC-03 (REQ-04, REQ-10) — The agent shows affected files and expected impact for a proposed fix, and no project file changes before the developer approves it. The existing UI and authoring flow remain usable.
- AC-04 (REQ-05, REQ-06) — After approval, the agent reports the changed files and reruns the affected case automatically. If the same assertion fails, it stays on that failure, explains the new result, and waits for another fix decision.
- AC-05 (REQ-05, REQ-07) — After a rerun verifies the active assertion passes, the agent proceeds to the next failure. When all known failures from a full-suite selection are resolved, it reruns the full suite and reports its actual outcome.
- AC-06 (REQ-09) — For a runner, credential, judge, or other blocking problem, the agent gives an actionable, uncertainty-aware explanation and does not claim that eval behavior passed or silently edit credentials.
- AC-07 (REQ-10) — The agent-guided and UI paths operate on the same repo-local eval suites and results; neither requires duplicating suite definitions.

## Product Vision Fit

This feature makes Sibu's repo-local AI workflow faster without turning it into an AI IDE or replacing engineer judgment. It removes routine context switching while keeping project ownership, explicit repair approval, bounded verification, and honest reporting of failures.

## Business Domain Model Fit

The feature extends the **Local Evals Workbench** through an **Agent-Guided Eval Session**. It preserves the distinctions among **Eval Suite**, **Eval Test Case**, **Eval Run**, **Model Under Evaluation**, **Judge Model**, **Failed Assertion**, **Failure Analysis**, **Repair Proposal**, and **Approved Eval Repair**. Analysis, proposal, approval, mutation, and rerun remain separate moments; the agent coordinates them conversationally, one active failure at a time.

## Capability Coverage

The **Local Evals Workbench** capabilities to discover suites, select models and run scope, execute behavior, preserve and inspect evidence, analyze and classify failures, draft and approve repairs, and apply approved project changes support the underlying loop. Its agent-guided capabilities cover conversational sessions, plain-language failure explanations, automatic focused verification, and final suite validation. **Skill Guidance** continues to supply eval-authoring conventions; external coding agents provide the conversation, not a new Sibu-owned development surface.
