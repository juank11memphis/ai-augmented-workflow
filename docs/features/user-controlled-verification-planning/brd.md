# User-Controlled Verification Planning Business Requirements Document

## Executive Summary and Business Need

Engineers using Sibu can currently reach implementation with a verification approach they did not knowingly choose. The feature SDD includes a quality strategy, but that strategy may be easy to miss, and downstream story planning can turn it into an unwanted validation path. Engineers need to understand and shape how a feature will be verified *before* that approach guides unattended implementation, without adding routine approval pauses to every Story.

## Objectives and Measurable Success

- OBJ-01 — Preserve engineer control over feature verification: during SDD discovery, the engineer can identify the proposed methods, coverage, human-judgment points, and exclusions, and correct them before the SDD is written.
- OBJ-02 — Preserve bounded unattended delivery: implementation planning follows the confirmed verification approach without routine Story-by-Story approval, and material departures return to the engineer for a decision.

Success is observable when an engineer can review and correct a concrete proposed verification approach before SDD authoring, and later Story plans and verification evidence remain consistent with that approach or visibly stop for a material change. No numeric target is set for this documentation-workflow feature.

## Stakeholders and Needs

- **Engineer or team directing the feature:** needs to know what will be checked, how, and where human judgment remains necessary before delegating work.
- **Downstream planners and executors:** need clear verification boundaries so they can choose routine, repo-appropriate checks without inventing a materially different strategy.

## Scope and Exclusions

**In scope:** For planned features, the SDD writer proposes a concise, feature-specific verification approach during discovery and obtains the engineer's confirmation or corrections before writing the SDD. The SDD makes that approach easy to find and carries it into Story planning. The approach identifies relevant verification dimensions and methods, coverage and evidence, any necessary human judgment, and meaningful exclusions or constraints. For a UI-changing feature, this includes how visual fidelity to the binding UX mockups will be assessed across relevant screens, states, and breakpoints—not just whether automated tests pass.

**Out of scope:** A new approval status, signature, or sign-off gate on the SDD; routine human approval of each Story plan, Task, or Story transition; a universal test-method checklist; building new test or visual-regression tooling as part of this feature; and a guarantee that automated checks can establish subjective visual quality.

## Requirements

- REQ-01 — Type: stakeholder; Objectives: OBJ-01. Before writing a feature SDD, present the proposed verification approach in plain language and give the engineer a clear opportunity to confirm or correct it. Do not treat a generic final check-in or a buried SDD section as a substitute.
- REQ-02 — Type: functional; Objectives: OBJ-01. The proposed approach and resulting SDD must distinguish what will be verified, by what method, over which relevant scenarios or surfaces, with what expected evidence, and which judgments or decisions remain human-owned. State meaningful exclusions and validation constraints; avoid inventing specific commands when they are not yet known.
- REQ-03 — Type: functional; Objectives: OBJ-01. For UI-changing features, make visual review explicit and distinguish it from functional and automated accessibility checks. Name the relevant screens, states, and breakpoints from the UX goals and explain how fidelity will be judged, including any required human visual judgment.
- REQ-04 — Type: functional; Objectives: OBJ-02. Downstream Story and implementation planning must refine the SDD's confirmed verification approach into concrete, proportionate checks, rather than silently replacing it. Routine choices of exact commands or equivalent checks may proceed without asking again.
- REQ-05 — Type: quality; Objectives: OBJ-01, OBJ-02. If downstream work reveals that the confirmed approach is infeasible, insufficient, or needs a material new method, expense, external dependency, or human-judgment point, stop and explain the change to the engineer; revise the SDD before planning or executing the changed approach. Do not silently add it to implementation plans.
- REQ-06 — Type: quality; Objectives: OBJ-02. Keep verification planning proportionate and front-loaded: confirmation during SDD discovery must not introduce routine human pauses at each Story, Task, or Milestone when work remains within the confirmed approach.

## Business Rules

- RULE-01 — The engineer owns material verification-strategy decisions; planners may choose routine implementation details within the confirmed approach.
- RULE-02 — The SDD remains a project-owned artifact, not a formal approval record. Confirmation of the proposed approach during discovery is a decision about verification direction, not a new SDD sign-off gate.
- RULE-03 — Automated checks may support, but must not be represented as proving, subjective visual quality.

## Business Acceptance Criteria

- AC-01 (REQ-01, REQ-02) — Before an SDD is written, the engineer sees a concise proposed verification approach with methods, coverage, evidence, human decisions, and meaningful exclusions, and can change it in conversation.
- AC-02 (REQ-03) — For a website or other UI-changing feature, the proposal and SDD identify how the implemented UI will be compared with UX mockups for relevant screens, states, and breakpoints; visual judgment is not hidden behind a generic test command.
- AC-03 (REQ-04, REQ-06) — A Story plan can select concrete, repo-appropriate checks that implement the SDD approach and proceed through existing review and execution without a new routine human approval gate.
- AC-04 (REQ-05) — When a Story plan would require a materially different verification path, the workflow identifies the difference and asks the engineer to resolve it through an SDD revision before that path is planned or executed.

## Product Vision Fit

This feature makes Sibu's “establish the scope and checks” step visible and engineer-directed while preserving the Product Vision's small, checked, largely unattended Epic progression. It protects human ownership without adding ceremony to routine Story transitions.

## Business Domain Model Fit

The feature sits in the **AI-Augmented Development Pipeline** and uses existing concepts: Artifact, Story Implementation Plan, Task Check, Small Work Loop, and User Control. It strengthens the existing rule that material decisions belong to the engineer while preserving the lifecycle in which sufficiently clear SDDs need no approval status or sign-off gate and reviewed Story plans can advance automatically.

## Capability Coverage

The existing **AI-Augmented Development Pipeline** capabilities to keep progression user-directed, carry reviewed context downstream, ground feature designs in the BRD/SAD/UX, define checked Tasks, stop on material decisions, and allow unattended Story progression support this feature. **Skill Guidance** supplies the focused SDD-writing and implementation-planning handoff. No new subdomain is required.
