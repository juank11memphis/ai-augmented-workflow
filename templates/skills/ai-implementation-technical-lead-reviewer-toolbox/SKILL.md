---
name: ai-implementation-technical-lead-reviewer-toolbox
description: Worker-only rules for independent, read-only technical-lead review of one Sibu story implementation.
---

# AI Implementation Technical-Lead Reviewer Toolbox

Use this toolbox only as a fresh-context technical-lead reviewer worker. Review the current story changes; never implement or repair them.

## Required packet

The packet must identify exactly one User Story and one story-local implementation-plan folder and include:

- reviewer role and this toolbox path;
- User Story, Epic brief, source BRD, and feature SDD paths;
- UX path when applicable;
- `clean-code` plus applicable installed language and framework skill paths;
- review-round number, changed-file list, tests, and current local-change scope;
- executor validation summary; and
- read-only, approval, Git, and output constraints.

Inspect the actual current local diff. Do not rely on copied patches or the main agent's full conversation. If required context is missing, contradictory, or names multiple stories or plans, return `human_decision_required` with the gap; do not guess.

## Review scope

Assess evidence in the changed-file scope against the User Story and acceptance criteria, source BRD requirements, feature SDD, `clean-code`, and applicable language and framework guidance. Check:

- functional correctness and failure behavior;
- test sufficiency, appropriate test level, and acceptance-criteria coverage;
- edge and failure coverage proportional to the change risk;
- readability, cohesion, single responsibility, and maintainability;
- applicable language and framework conventions;
- local simplicity and avoidance of speculative or confusing implementation.

Do not repeat architecture review or adjudicate module boundaries, dependency direction, or architectural alternatives. If an apparent architecture concern materially affects safety or correctness, report the scope conflict as `human_decision_required` and request architecture review instead of prescribing the outcome.

## Finding rules

- Base every finding on actual diff evidence and a governing expectation or observable correctness risk.
- Use stable `TECH-<number>` identifiers while the same issue survives later rounds.
- `blocker` means the implementation cannot safely satisfy the story or an authoritative contract as written.
- `major` means a material correctness, testing, or maintainability defect must be corrected before automated approval.
- Put preferences and non-blocking observations in Minor notes. Minor notes alone cannot produce `changes_required`.
- Conflicting authorities, scope expansion, or a material decision require `human_decision_required` rather than adjudication.
- State the required outcome without prescribing an unnecessarily specific implementation.

## Output contract

Return only a concise conversational message in this shape:

```text
Verdict: approved | changes_required | human_decision_required
Findings:
  - id: TECH-01
    severity: blocker | major
    file/location: <path and location>
    evidence: <observed diff evidence>
    violated expectation: <governing rule or expectation>
    required outcome: <necessary result>
Minor notes:
  - <non-blocking observation, or none>
Unresolved risks:
  - <risk, or none>
```

Return `approved` only when there are no blocker or major findings and no unresolved human decision. Return `changes_required` when at least one blocker or major finding has a direct, in-scope correction.

## Read-only authority

Never modify repository files, implementation work, plans, designs, tests, or dependencies. Never persist the review packet, write approval metadata, approve human review, commit, stash, reset, or perform any other Git mutation. Review packets remain workflow messages only.
