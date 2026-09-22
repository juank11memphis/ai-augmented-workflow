---
name: ai-implementation-executor-toolbox
description: Worker-only operating rules for Sibu implementation executor sub-agents that execute one story plan with validation and review.
---

# AI Implementation Executor Toolbox

## Response style

Keep conversational responses short and answer only what was asked. Do not add adjacent advice, alternatives, or background unless needed for correctness, safety, required discovery, artifact quality, validation, blockers, or an explicit user request. This does not weaken any required interviews, hard stops, output formats, final response rules, or review/approval gates in this skill.

This toolbox is for `sibu-implementation-executor` workers only. It is not a normal user-invoked skill.

## Focused worker routing

{{EXECUTOR_WORKER_ROUTING}}

## Worker packet contract

Use only the narrow packet from the main agent. The packet must include:

- exactly one explicit executor mode: `implementation` or `repair`
- exactly one User Story path or one story-local `.impl_plan/` folder
- required source artifact paths: story, Epic brief, BRD, software design with embedded diagrams, and UX spec when the story, plan, or feature has UI impact
- this toolbox skill path
- selected architecture skill path and distilled architecture constraints
- required skill paths, including `clean-code` and `structured-logging` when the story touches observability-relevant code
- optional installed skill paths relevant to the story
- distilled skill constraints that are binding for this execution task
- verification expectations, relevant quality strategy context, implementation-plan validation steps, and validation evidence requirements
- approval and commit rules from the main executor workflow
- expected final output format

An `implementation` packet includes the ordered plan steps. A `repair` packet additionally includes exactly one combined review packet, current snapshot identity and changed-file scope, and prior validation evidence. A repair packet must not contain a replacement plan or authorize scope expansion.

If the packet names multiple stories, multiple plans, an Epic without one selected story, or no executable target, stop and ask the main agent for exactly one story or `.impl_plan/` path.

If selected architecture guidance is missing from the packet or unavailable to read, stop and tell the main agent to direct the user to run `sibu sync`; do not choose, infer, or substitute architecture guidance.

If a required source artifact or required skill path is missing, stop and report the blocker. Do not invent scope from partial context. Read the SDD with its embedded diagrams.

## Mode behavior

### Implementation mode

- Execute all unapproved step files in filename order, once.
- Return completion evidence to the main agent before human review. Do not present or own the human approval gate.

### Repair mode

- Inspect the actual current local changes and preserve valid implementation work.
- Address only blocker and major findings in the one combined packet. Do not restart or replay the implementation plan, replan the story, broaden scope, or edit plan/upstream artifacts.
- Reject and return a blocker with evidence for contradictions, material decisions, unrelated-file changes, scope expansion, new production dependencies, or changes that conflict with authoritative artifacts.
- Perform proportionate focused validation and return fresh post-repair validation evidence. Never reuse a pre-repair approval or validation claim as evidence for changed work.

## Execution rules

- Read the story, ordered step files, required source artifacts, required skills, the selected architecture skill, and relevant optional installed skills before execution. Read its embedded diagrams.
- If `structured-logging` is provided in the packet, apply it only to observability-relevant code paths and do not duplicate its policy in other skill guidance.
- Apply selected architecture guidance during implementation and review, including boundaries, dependency direction, sequencing, and architecture-specific risks. Treat embedded diagrams as authoritative SDD context, keep `sdd.md` as the authoritative software design artifact, and preserve diagram-stated boundaries, flows, and data/state implications during implementation and review.
- Follow only the selected mode; repair mode does not execute plan steps.
- Keep changes inside the story scope, step scope, source artifacts, selected architecture constraints, diagram-stated implications when included, and distilled constraints. Do not modify the SDD or create a separate diagram companion.
- Read repository files narrowly, only as needed for the current step or validation result.
- Run focused validation named by the step files or software design when practical, and collect compact evidence against the story verification expectations and validation steps.
- For code-changing work, run `node .agents/scripts/check-touched-source-file-lines.mjs` before presenting a review packet. If it fails, refactor touched oversized source files into cohesive focused files and re-run the checker successfully before review.
- If validation fails and the fix is ambiguous, risky, or outside scope, stop and report the blocker.
- If an optional relevant skill is absent and the story involves an unmapped language, framework, database, or architecture pattern, continue only when safe and flag it as a Review Gate risk.

## Validation efficiency

- Run focused checks while implementation or repair work is changing.
- After changes stabilize, run one aggregate `pnpm verify` when available; do not redundantly run standalone build, check, or full-test commands already covered by it.
- Run packed-runtime validation once at the end only when relevant to the changed assets.
- Rerun expensive checks only after subsequent relevant changes make evidence stale or to diagnose a failure.
- Every repair that changes work must produce fresh validation evidence for the resulting local changes.

## Git and approval safety

The executor worker may edit the local working tree and run validation for the story. It must never perform final workflow-control actions.

Never run:

- `git commit`
- `git stash`
- `git reset`

Never write approval metadata such as:

```md
## Review status

- Status: approved
```

Never approve your own work. Final approval metadata and commit execution remain with the main agent after explicit user approval, or with the human manually if the workflow requires it.

## Completion handoff

After implementing or repairing and validating, return the completion packet to the main agent. Do not wait for or request human approval inside the worker.

The review packet must include:

- story path and plan folder
- changed files
- completed steps
- validation commands and results
- `Validation Evidence` or a clearly equivalent compact structure covering tests added or updated, acceptance criteria verified, commands run, file-size gate result for code-changing work, edge/failure coverage, deeper checks performed or skipped with rationale when relevant, and residual risks or known gaps
- risks, including missing optional skills or unmapped patterns
- follow-up questions, if any

For non-trivial stories, do not present “tests passed” as the only completion evidence. Keep validation evidence proportional to story risk: deeper techniques such as property, torture/fuzz, mutation, or manual QA are not universal requirements, but explain skips briefly when those checks are relevant and intentionally omitted.

## Final result

Return a compact completion summary or blocker directly to the main agent. Include the mode, changed files, validations, Validation Evidence including the file-size gate result for code-changing work, risks, follow-up questions, and `approval state: not requested by worker`. Do not commit.

## BRD handoff

Preserve source BRD IDs carried by the story and software design in implementation steps and validation. Worker packets must carry the source BRD path and applicable IDs, not copy the full requirement catalog or broaden worker authority.

Use `docs/features/<feature-slug>/brd.md` as the business source. Qualify references with that source path and verify IDs resolve to its entries. Surface missing, invalid, or conflicting references for focused clarification; do not invent requirements or claim unsupported coverage.

Require sufficient BRD context, not approval fields, signatures, draft/approved status, or a sign-off ceremony. A user request selects the next stage; do not automatically execute later stages. Missing or conflicting decisions still require clarification. Preserve stage prerequisites, required UX, code-change permissions, and story-level implementation review.
