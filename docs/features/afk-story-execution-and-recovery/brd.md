# Improve AFK Story Execution and Recovery Business Requirements Document

## Executive Summary and Business Need

Engineers want a well-defined Epic to progress without routine Story pauses, but a failed aggregate check or uncertain PR handoff can stop AFK work even when a bounded, safe recovery is available. Sibu should diagnose the actual blocker, repair attributable failures within reviewed limits, and resume checked Story work without repeatedly returning routine choices to the engineer. It must stop rather than guess when attribution, scope, evidence, or integration safety is unclear.

## Objectives and Measurable Success

- OBJ-01 — Reduce recoverable AFK Story stops: in representative blocked Story runs, Sibu continues through clearly attributable, bounded repairs to a checked Task outcome without routine human intervention, while reporting which runs still needed a human decision and why.
- OBJ-02 — Preserve trust during recovery and integration: every unattended repair has attributable evidence, fresh review of any changed plan, passing affected checks, and preserved Task work; every Story handoff establishes required-check and merge-policy facts before integration.

## Stakeholders and Needs

- **Engineer or team running an Epic AFK:** needs recoverable failures handled without unnecessary prompts and a clear account of what changed for final Epic review.
- **Engineer responsible for acceptance:** needs material decisions and uncertain or unsafe conditions surfaced, not silently resolved or described as passing.
- **Story and Epic reviewers:** need traceable failure attribution, repairs, check results, and PR handoff evidence to understand the integrated work.

## Scope and Exclusions

**First useful scope:** blocked-check diagnosis and bounded recovery during sequential Story execution, plus verification of Story and Epic PR handoff facts. This includes a complete compact failure inventory, comparison with the observed Epic/base head, reviewed prerequisite or same-Story repairs, preservation of the blocked Task's uncommitted edits, revalidation of stale checks, and safe use of external source-control facts before Story integration. Sibu prefers configured GitHub MCP access when it can provide those facts; if it cannot, Sibu explains the gap and minimizes read-only host approval prompts.

**Excluded:** separate manual or automated behavioral QA; eval-suite execution or changes to eval-authoring behavior; unrelated or open-ended repairs; weakened Task or Story checks; automatic resolution of material product, architecture, security, privacy, data, dependency, or scope decisions; production deployment. The final human Epic PR review remains required.

## Requirements

- REQ-01 — Type: functional; Objectives: OBJ-01, OBJ-02. When an aggregate check fails, provide a complete, compact inventory grouped by likely cause, linking each failure to the affected Story Task, expected contract, and owning paths rather than treating a truncated log or count as diagnosis. (RULE-01)
- REQ-02 — Type: functional; Objectives: OBJ-01, OBJ-02. Compare focused failures with the observed Epic/base head in isolation and distinguish active-Story regressions, pre-existing failures, and host/test-runner failures, reporting uncertainty where attribution is not established. (RULE-01)
- REQ-03 — Type: functional; Objectives: OBJ-01, OBJ-02. Permit a clearly attributable, bounded pre-existing failure to receive a freshly reviewed, checked prerequisite repair when ownership, source alignment, and safety are clear. (RULE-02)
- REQ-04 — Type: functional; Objectives: OBJ-01, OBJ-02. Preserve the blocked Task's uncommitted edits. Use a freshly reviewed same-Task continuation for a bounded repair that overlaps those edits, including a pre-existing bug, while retaining the Task goal and one eventual scoped commit. For a clear path-disjoint same-Story regression, use a freshly reviewed follow-up checked Task before resuming the blocked Task. (RULE-02, RULE-03)
- REQ-05 — Type: quality; Objectives: OBJ-01, OBJ-02. After a repair, rerun checks made stale by it and require the blocked Task's original goal, planned checks, and evidence before claiming completion or advancing. (RULE-03)
- REQ-06 — Type: stakeholder; Objectives: OBJ-01, OBJ-02. Continue without routine human approval only while failure attribution, reviewed plan, source alignment, check evidence, Git state, and progress remain clear; otherwise stop with a focused explanation and decision request. (RULE-04)
- REQ-07 — Type: functional; Objectives: OBJ-02. Before Story integration, establish the required-check and merge-policy facts from the external source-control host. At Epic PR handoff, report the relevant required-check status and known merge policy for human review. Prefer available GitHub MCP access; if it cannot provide the facts, explain the capability gap and use only necessary read-only host verification. Do not merge on guessed or unavailable facts. (RULE-05)
- REQ-08 — Type: quality; Objectives: OBJ-02. Carry the recovery and handoff record into Story and final Epic PR summaries so the engineer can review the failures, attribution, repairs, verification, and any unresolved stops. (RULE-06)

## Business Rules

- RULE-01 — A failed check is an observation, not proof of an active-Story regression. A failure count or truncated output is not sufficient attribution evidence.
- RULE-02 — A changed recovery plan requires fresh independent review before execution. Bounded, clear repairs may proceed AFK; material new risks or unresolved review findings return to the human.
- RULE-03 — Recovery preserves the blocked Task's edits and single-commit authority when repair paths overlap. It never weakens planned checks, treats a failed run as passed, or treats stale check results as current.
- RULE-04 — Ambiguous attribution, unsafe overlap or Git state, material decisions, and non-converging repairs stop unattended progression rather than prompting speculative fixes.
- RULE-05 — Story integration requires established checks, evidence, and host merge-policy facts. External source control remains authoritative for its rules; unavailable facts are not permission to merge.
- RULE-06 — Story PRs may integrate without routine human review only after their required checks and evidence pass. The human Epic PR review is always required; it is not separate behavioral QA.

## Business Acceptance Criteria

- AC-01 (REQ-01, REQ-02) — Given an aggregate check with multiple failures, the recovery record identifies every failure compactly, groups likely causes, links each to Task/contract/paths, and shows focused Epic/base comparison or explicitly names evidence still missing.
- AC-02 (REQ-03, REQ-04) — Given a clearly pre-existing, bounded failure, Sibu can progress through a reviewed, checked repair. If repair paths overlap the blocked Task's edits, those edits remain intact and the repair continues in that same Task; a clear path-disjoint same-Story regression uses a separate checked Task before resumption.
- AC-03 (REQ-05, REQ-06) — A repaired Task does not advance until its goal and affected checks pass with current evidence. Unclear cause, unsafe state, material decision, or repeated non-progress produces a human stop rather than a pass claim.
- AC-04 (REQ-07) — At Story PR handoff, required checks and merge rules are verified from available host facts, using MCP when it supplies them. If facts remain unavailable, Sibu explains the gap and does not merge. At Epic PR handoff, the human receives the known check and merge-policy status, including any verification gap.
- AC-05 (REQ-08) — Story and Epic PR summaries expose noteworthy failures, attribution, repairs, checks, and stops; the final Epic PR remains available for human review.

## Product Vision Fit

This feature advances Sibu's promise of fewer routine interruptions for small, checked Story work without hiding failures or replacing engineer judgment. It keeps automatic progression earned by clear scope, review, evidence, and safe integration, while preserving the final human Epic review.

## Business Domain Model Fit

This uses the existing **AI-Augmented Development Pipeline**, **Task**, **Task Check**, **Story Implementation Plan**, **Progress Log**, **Epic Branch**, **Story Branch**, **Story Pull Request**, and **Epic Pull Request** concepts in `docs/business-domain-model.md`. It applies the defined **Failure Inventory**, **Blocked Task Recovery**, **Same-Task Continuation**, and **Follow-up Checked Task** rules. Separate **Behavioral QA** and the **Local Evals Workbench** do not participate in this recovery flow.

## Capability Coverage

The **AI-Augmented Development Pipeline** in `docs/capabilities-map.md` provides **Inventory blocked-check failures**, **Attribute failures against the Epic baseline**, **Recover blocked Tasks safely**, **Revalidate recovery outcomes**, **Verify Story PR handoff facts**, **Stop unsafe integration**, and **Present a consolidated Epic PR**. External source-control hosting supplies the authoritative check and merge-policy facts; Sibu verifies them rather than owning those rules.
