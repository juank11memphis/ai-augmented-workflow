# Blocked Task Recovery Epic Brief

**Epic ID:** AFK-REC

## Summary
Make a failed Story check diagnosable and permit only attributable, bounded, reviewed recovery without losing blocked Task work or weakening its checks.

## Source Context
- BRD: `../../brd.md` — Scope and Exclusions; REQ-01–REQ-06; AC-01–AC-03.
- Technical design: `../../sdd.md` — Ownership and boundaries; Blocked-check diagnosis and recovery flow; Quality strategy and planned verification.
- Domain and capabilities: `docs/business-domain-model.md` — AI-Augmented Development Pipeline, Failure Inventory, Blocked Task Recovery, Same-Task Continuation, Follow-up Checked Task; `docs/capabilities-map.md` — Inventory blocked-check failures, Attribute failures against the Epic baseline, Recover blocked Tasks safely, Revalidate recovery outcomes.
- UX: not applicable; the SDD specifies no UI impact.

## Scope
- Complete compact failure inventory and isolated comparison with the observed Epic/base head.
- Freshly reviewed, checked prerequisite, same-Task, or path-disjoint recovery when evidence and state permit it.
- Preserved blocked edits, current check and `Done when` evidence, and explicit human stops for uncertainty or non-convergence.

## Out of Scope
- Story/Epic PR host-policy verification, unrelated repairs, behavioral QA, live-agent evals, and production deployment.

## User Stories and Sequence
1. [AFK-REC-01 — Diagnose blocked checks against the Epic baseline](./stories/01-diagnose-blocked-checks.md) — deliver evidence-backed diagnosis and a safe stop; none.
2. [AFK-REC-02 — Recover attributable blocked Tasks](./stories/02-recover-blocked-tasks.md) — deliver reviewed recovery and revalidation; depends on AFK-REC-01.

## Feature Flags
- none.

## Acceptance Criteria
- Aggregate failures have a complete compact inventory and evidence-backed baseline classification, or a named evidence gap.
- Bounded repairs follow fresh plan review, preserve Task edits and commit authority, and revalidate affected checks and original evidence before advancing.
- Unclear attribution, unsafe state, material decisions, or non-converging repairs stop for a human decision.

## Dependencies / Risks
- Guidance is prompt-owned; deterministic contract checks cannot prove live-agent compliance. The observed Epic head and uncommitted edit inventory must remain trustworthy during comparison and dispatch.
