# Upfront Feature Decision Handoff Business Requirements Document

## Executive Summary and Business Need

Engineers can finish a feature's BRD, UX design when needed, SDD, Epic, and Stories, yet still be interrupted after implementation begins for a human choice that was foreseeable during design. Eval authoring is one example: targets and coverage need explicit approval before eval artifacts are written. Sibu should identify applicable feature-specific decisions during SDD discovery, obtain and record each human choice there, and let later work reuse the unchanged approval. This reduces avoidable pauses without turning the SDD into blanket permission or hiding genuine new blockers.

## Objectives and Measurable Success

- OBJ-01 — Reduce avoidable implementation interruptions: in a planned-feature walkthrough with applicable approved SDD decisions, downstream planning and implementation do not ask again for those same decisions. Record any pause and whether it was caused by a missing, changed, or genuinely new decision.
- OBJ-02 — Preserve explicit human control: every reused decision is traceable to the human-approved choice and scope, while unanswered or materially changed decisions stop the affected work and separate operational or final-review permissions remain intact.

## Stakeholders and Needs

- **Engineer defining the feature:** needs SDD discovery to raise relevant human choices before implementation begins, without a universal questionnaire for inapplicable gates.
- **Engineer reviewing implementation:** needs to see what was approved, its scope, and whether later work stayed within that choice.
- **Engineer responsible for final Epic acceptance:** needs the completed Epic review to remain a real human decision, not something inferred from earlier SDD approvals.

## Scope and Exclusions

**First useful scope:** planned features that use an SDD. During the existing SDD interview, identify all known applicable feature-specific human decision gates in the feature and downstream Sibu guidance; ask only the relevant questions; record each explicit approval with its choice and scope; and pause SDD finalization until every required human answer is resolved. Downstream planning and implementation reuse each unchanged approval without a repeat request. Confirmed Evaluation Targets and an approved Eval Coverage Plan are a required example when eval authoring is part of the feature.

**Excluded:** blanket approval of the SDD or every future action; independent eval-authoring work outside a planned feature; Git base/target selection, model routes, access or credential decisions, external writes, destructive actions, and final Epic PR review. Unexpected scope changes, failures, or genuinely new material decisions are not preapproved by this feature.

## Requirements

- REQ-01 — Type: functional; Objectives: OBJ-01, OBJ-02. During SDD discovery, identify every known applicable feature-specific human decision required by the planned feature or its downstream Sibu skills, rather than waiting for the skill to ask after implementation begins. (RULE-01)
- REQ-02 — Type: stakeholder; Objectives: OBJ-01. Ask about applicable decisions as part of the existing feature-design conversation, not as a fixed questionnaire for all features. Make the requested choice and its consequence clear to the engineer. (RULE-01)
- REQ-03 — Type: functional; Objectives: OBJ-02. Record each explicit human approval in the feature SDD with the approved choice and scope, distinguish it from a general SDD sign-off, and do not infer approval from an unanswered question or the mere existence of the SDD. (RULE-02)
- REQ-04 — Type: functional; Objectives: OBJ-01, OBJ-02. Do not finalize an SDD with a known applicable human decision unresolved; identify the exact missing decision and pause until the engineer answers it. (RULE-02)
- REQ-05 — Type: functional; Objectives: OBJ-01. During downstream planning and implementation, reuse a relevant, unchanged SDD-approved Feature Decision without asking the human to approve that same choice again. When planned eval authoring is included, this applies to confirmed Evaluation Targets and the approved Eval Coverage Plan. (RULE-03)
- REQ-06 — Type: quality; Objectives: OBJ-01, OBJ-02. Require fresh approval only for the affected Feature Decision when its approved choice or scope changes materially; unrelated SDD wording changes do not invalidate other approvals. (RULE-03)
- REQ-07 — Type: quality; Objectives: OBJ-02. Preserve separate operational permissions, safety stops, and final human Epic review; a Feature Decision cannot authorize a different action or remove a genuinely new human-decision gate. (RULE-04)

## Business Rules

- RULE-01 — SDD discovery covers all **known applicable** feature-specific human gates, not every conceivable question and not gates irrelevant to the feature.
- RULE-02 — Approval is explicit and scoped to one Feature Decision. A required unanswered decision blocks SDD finalization; the SDD as a whole needs no approval status, signature, or sign-off ceremony.
- RULE-03 — An unchanged approved decision is reusable by the downstream work it governs. A material change to its choice or scope invalidates only that approval and requires a new human answer before affected work proceeds.
- RULE-04 — Feature Decision approval is not operational permission. Separate access, model-route, external-mutation, destructive-action, and final Epic review gates remain in force; unexpected failures and material changes still stop safely.

## Business Acceptance Criteria

- AC-01 (REQ-01, REQ-02) — Given a planned feature with eval authoring in scope, SDD discovery asks the engineer to confirm the applicable Evaluation Targets and approve the proposed coverage, grading approach, and known gaps before SDD finalization; a feature without eval work is not asked those questions.
- AC-02 (REQ-03, REQ-04) — A completed SDD shows each applicable approved choice and scope. If a required human answer is absent, Sibu identifies that decision and does not finalize the SDD or portray it as approved.
- AC-03 (REQ-05) — Given an unchanged SDD approval for a planned feature, the corresponding downstream skill uses it without a duplicate human approval request. Independent eval work still follows its own target-confirmation and coverage-approval flow.
- AC-04 (REQ-06) — When one approved decision's choice or scope changes materially, only that affected decision requires renewed approval; unrelated wording changes leave other approvals usable.
- AC-05 (REQ-07) — An approved Feature Decision does not bypass an operational permission, a new material decision, or the final human Epic PR review.

## Product Vision Fit

This feature advances Sibu's promise of human direction up front, fewer routine interruptions during checked Story work, and a reviewable final Epic. It keeps the engineer responsible for consequential choices while avoiding repeat questions about decisions they already made.

## Business Domain Model Fit

The **AI-Augmented Development Pipeline** carries project-owned artifacts into later work. A **Feature Decision** is explicitly approved and scoped during SDD discovery, then reused while unchanged; missing or materially changed decisions hard-stop affected work. The existing **Evaluation Target** and **Eval Coverage Plan** concepts provide a concrete case. Decision approval remains distinct from **Model Route Review**, **Approved Eval Repair**, operational authorization, and final human **Epic Pull Request** review.

## Capability Coverage

The **Skill Guidance** capabilities **Discover feature decision gates during SDD authoring** and **Record scoped feature approvals** gather the choices. The **AI-Augmented Development Pipeline** capabilities **Reuse approved feature decisions** and **Keep operational authority separate** govern downstream handoff. Existing **Discover evaluation targets**, **Require coverage review**, and **Carry reviewed context downstream** capabilities support the eval example without redefining independent eval authoring.
