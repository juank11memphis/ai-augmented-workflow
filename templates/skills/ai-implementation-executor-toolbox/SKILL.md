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

- exactly one explicit executor mode: `implementation`, `repair`, or `checked-task`
- exactly one User Story path or one story-local `.impl_plan/` folder
- required source artifact paths: story, Epic brief, BRD, software design with embedded diagrams, and UX spec when the story, plan, or feature has UI impact
- this toolbox skill path
- selected architecture skill path and distilled architecture constraints
- required skill paths, including `clean-code` and `structured-logging` when the story touches observability-relevant code
- optional installed skill paths relevant to the story
- distilled skill constraints that are binding for this execution task
- selected transition-delivery route: `direct foreground`, `main-mediated foreground`, or `completion-only evidence`, with exactly one owner for any available user-visible delivery
- main-owned transition-delivery context: selected route, sole user-visible delivery owner, the main-assigned transition ID for this invocation, and any delivered keys that must not be replayed
- verification expectations, relevant quality strategy context, implementation-plan validation steps, and validation evidence requirements
- approval and commit rules from the main executor workflow
- expected final output format

An `implementation` packet includes the ordered plan steps. A `repair` packet additionally includes exactly one architecture review packet retaining the reviewer's findings, the human-authorized list of specific changes for the current snapshot, current snapshot identity and changed-file scope, and prior validation evidence. A repair packet must not contain a replacement plan or authorize scope expansion. Findings alone are not authorization; if the list or snapshot binding is absent or ambiguous, stop before editing.

A `checked-task` packet instead includes exactly one ordered Task ID and Story path, dedicated Story branch, accepted reviewable-plan identity, owning module/area and expected file touchpoints, the **exact executable check and expected passing evidence**, conventions, recent progress, applicable skill paths, and exact source pointers to open on demand. It must identify the plan/status and progress locations. Reject missing or contradictory fields, stale acceptance, a missing check, or a Task that is not the next ordered pending Task. Do not plan a replacement check, broaden the Task outcome, or read broad upstream documents by default.

If the packet names multiple stories, multiple plans, an Epic without one selected story, or no executable target, stop and ask the main agent for exactly one story or `.impl_plan/` path. A `checked-task` packet must name exactly one Task; do not execute the other plan steps.

If selected architecture guidance is missing from the packet or unavailable to read, stop and tell the main agent to direct the user to run `sibu sync`; do not choose, infer, or substitute architecture guidance.

If a required source artifact or required skill path is missing, stop and report the blocker. Do not invent scope from partial context. Read the SDD with its embedded diagrams.

## Mode behavior

### Implementation mode

- Execute all unapproved step files in filename order, once.
- Read source-verified packet BRD IDs, SDD headings, and embedded diagrams first as **start here** references, not as an exclusive list or evidence that omitted requirements do not apply. Locate uncertain references from their full authoritative paths. Expand to wider sections or complete artifacts when scope, missing context, conflict, implementation, or validation quality requires it; no fixed context ceiling or full-read prohibition applies. The authoritative BRD, SDD, SAD, and skills prevail over the packet. Report material inconsistency under existing blocker rules and implement and validate the entire authorized story.
- Return completion evidence to the main agent before human review. Do not present or own the human approval gate.

### Repair mode

- Inspect the actual current local changes and preserve valid implementation work.
- Begin at the packet's source-verified **start here** references relevant to the authorized changes, then independently verify them against the full authoritative story, Epic, BRD, SDD, applicable SAD/UX, skills, and actual local changes. Locate uncertain precise references from their full authoritative paths. Expand to wider sections or complete artifacts when the repair is broad or context is incomplete, uncertain, or conflicting; there is no fixed reading ceiling. Source authority prevails, but references and findings do not enlarge the human-authorized list. Report material packet/source or snapshot mismatches under the existing blocker rules before editing.
- Address only the human-authorized change list for the current reviewed snapshot, whether it selects blocker, major, minor, or another in-scope change. The combined packet supplies evidence, not independent repair authority. Do not restart or replay the implementation plan, replan the story, broaden scope, or edit plan/upstream artifacts.
- Reject and return a blocker with evidence for ambiguous or stale authorization, contradictions, material decisions, unrelated-file changes, scope expansion, new production dependencies, or changes that conflict with authoritative artifacts. Do not silently select an alternative.
- Perform proportionate focused validation and return fresh post-repair validation evidence. Never reuse a pre-repair approval or validation claim as evidence for changed work.

### Checked-Task mode

- Work only on the assigned Task in a fresh bounded context. Confirm the accepted plan identity, Task order/status, exact check, and current Story branch before editing. If branch/index/worktree state is unsafe or isolation is unavailable, stop without modifying or hiding user work. No real credentials may enter the workspace, packet, output, or logs.
- For a reviewed cross-Task regression repair, a blocked Task's known uncommitted edits are permitted only when the main packet inventories them as unstaged, path-disjoint, and attributable to that Task. Recheck the inventory before editing and before staging. Never modify, stage, or commit those preserved edits; stop if they overlap the repair or become ambiguous.
- Treat planned file paths as expected touchpoints, not an exhaustive edit allowlist. Change a directly necessary adjacent type, implementation, or test within the owning module/area when it preserves the Task outcome, accepted contracts, and prescribed check. Explain and validate each unlisted file in the Task report; a file's omission alone is not a blocker. Stop for unrelated modules, destructive actions, secret or credential exposure, or material product, security, privacy, persisted-data, dependency, or architecture changes.
- Run the exact prescribed check after implementation. Compare the actual tests, assertions, and results with **each** Task `Done when` item and expected evidence; command exit zero alone does not complete the Task. If the command fails or evidence is missing, make at most **two** evidence-guided, in-scope fixes, rerunning that same check after each fix. Do not retry an unchanged failing command, weaken or replace the check, or infer success from judgment. Stop immediately for missing/changed check, ambiguous or contradictory evidence, work outside the owning area or accepted Task outcome, unexpected Git state, or material product/security/privacy/data/dependency/architecture consequence. After two failed fixes or an unresolved evidence gap, stop without marking done or making a completed-Task commit.
- If the upstream Epic/Story declares a flag, run the assigned flag-off and flag-on checks; for its planned removal Task, run the supplied no-reference check. Never invent a flag or its checks. An undeclared flag need blocks immediately.
- Only after every assigned check passes **and every expected evidence item is supported**, stage **only Task-owned eligible files** (including justified adjacent files), inspect staged paths and diff for unrelated or ignored work, and make one Conventional Commit referencing the Task ID on the Story branch. Never force-add ignored files. Append a compact progress entry **after** commit with actual check command/result, evidence coverage, commit reference, gotchas, and decisions; keep tracked progress out of unrelated Task staging and make its persistence explicit. Update Task status without changing reviewable plan content. On blocker, record check, attempts, missing evidence, and reason in progress without a done state or completed-Task commit. Return actual evidence to the main agent; do not claim final Story approval.
- Never stash, reset, rebase, overwrite user work, open a PR, merge, deploy, or create approval metadata. If a safe scoped commit cannot be made, stop and report the blocker.

## Execution rules

- In Story-plan modes, read the story, ordered step files, required source artifacts, required skills, selected architecture skill, and relevant optional installed skills before execution. Read embedded diagrams. In `checked-task` mode, start with only the assigned Task, conventions, recent progress, named skills, and exact source pointers; open pointed source sections on demand.
- If `structured-logging` is provided in the packet, apply it only to observability-relevant code paths and do not duplicate its policy in other skill guidance.
- Apply selected architecture guidance during implementation and review, including boundaries, dependency direction, sequencing, and architecture-specific risks. Treat embedded diagrams as authoritative SDD context, keep `sdd.md` as the authoritative software design artifact, and preserve diagram-stated boundaries, flows, and data/state implications during implementation and review.
- Follow only the selected mode; repair mode does not execute plan steps.
- Keep changes inside the story scope, step scope, source artifacts, selected architecture constraints, diagram-stated implications when included, and distilled constraints. Do not modify the SDD or create a separate diagram companion.
- Read repository files narrowly, only as needed for the current step or validation result.
- In Story-plan modes, run focused validation named by the step files or software design when practical. In `checked-task` mode, run the assigned exact check and expected evidence without substitution. Collect compact evidence for the applicable mode.
- For code-changing work, run `node .agents/scripts/check-touched-source-file-lines.mjs` before presenting a review packet. If it fails, refactor touched oversized source files into cohesive focused files and re-run the checker successfully before review.
- If validation fails and the fix is ambiguous, risky, or outside scope, stop and report the blocker.
- If an optional relevant skill is absent and the story involves an unmapped language, framework, database, or architecture pattern, continue only when safe and flag it as a Review Gate risk.

## Repository-aware validation policy

For Story-plan `implementation` or `repair`, narrowly inspect repository-owned definitions and guidance to establish available focused checks, whether a canonical aggregate verification exists, the distinct responsibilities it covers, and whether changed assets affect packaged or runtime-distributed behavior. Do not infer coverage from a check's name. For `checked-task`, the accepted plan's prescribed check is binding; do not invent an aggregate or replace the check under this policy.

- During implementation or repair, run proportionate focused checks for the changing work; they provide fast feedback but do not replace final confidence.
- After stabilization, execute exactly one final validation strategy. When a canonical aggregate exists, run it once and do not separately repeat standalone checks whose responsibilities it covers.
- When no canonical aggregate exists, run the smallest sufficient non-overlapping set of existing repository checks. Do not invent or rename checks.
- Run a distinct packaging or runtime check only when changed assets can affect packaged output, installed behavior, generated runtime resources, or distribution semantics. If material relevance or coverage is uncertain, retain the distinct check and record the conservative rationale.
- Rerun an expensive final check only after a later relevant mutation makes its evidence stale or when diagnosing a failure. Every repair mutation requires fresh validation evidence for the resulting work.
- Repository-specific plans may name concrete checks discovered from that repository; this reusable policy must remain technology-, ecosystem-, tool-, and concrete-command-neutral.
- A required validation failure blocks unsupported success or progression. Preserve review snapshots, human repair authorization, human approval, commit control, and continuation authority.

## Git and approval safety

The Story-plan executor worker may edit the local working tree and run validation for the story. A checked-Task executor has only the narrow passing Task-commit authority above; neither worker may perform final Story workflow-control actions.

Never run:

- `git commit` in `implementation` or `repair` mode, or before a passing scoped check in `checked-task` mode
- `git stash`
- `git reset`

Never write approval metadata such as:

```md
## Review status

- Status: approved
```

Never approve your own work. Final Story approval metadata and any remaining Story commit remain with the main agent after explicit user approval, or with the human manually if the workflow requires it.

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

For non-trivial stories, do not present “tests passed” as the only completion evidence. Keep validation evidence proportional to story risk and explain relevant deeper-check skips briefly.

### Foreground progress

The packet selects direct foreground, main-mediated foreground, or completion-only evidence with one user-visible delivery owner and a main-assigned transition ID unique to this invocation. Emit each available live start/finish transition once through that route; never replay a delivered `(transition ID, edge)` key, detach, or background work. Use the packet's ID for both edges. A later repair/revalidation invocation receives a new ID even when its phase label repeats. Completion-only delivery need not provide live transitions and does not change who executes.

## Final result

Return a compact completion summary or blocker directly to the main agent. Include the mode, changed files, validations, Validation Evidence including the file-size gate result for code-changing work, risks, follow-up questions, and `approval state: not requested by worker`. Do not make a final Story commit; `checked-task` mode alone may return its passing scoped Task commit reference.

## BRD handoff

Preserve source BRD IDs carried by the story and software design in implementation steps and validation. Worker packets must carry the source BRD path and applicable IDs, not copy the full requirement catalog or broaden worker authority.

Use `docs/features/<feature-slug>/brd.md` as the business source. Qualify references with that source path and verify IDs resolve to its entries. Surface missing, invalid, or conflicting references for focused clarification; do not invent requirements or claim unsupported coverage.

Require sufficient BRD context, not approval fields, signatures, draft/approved status, or a sign-off ceremony. A user request selects the next stage; do not automatically execute later stages. Missing or conflicting decisions still require clarification. Preserve stage prerequisites, required UX, code-change permissions, and story-level implementation review.
