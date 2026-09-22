---
name: ai-implementation-plan-executor
description: Gatekeep and route one Sibu story implementation plan through sub-agent execution, review, approval metadata, commit, and feature continuation.
---

# AI Implementation Plan Executor

## Response style

Keep conversational responses short and answer only what was asked. Do not add adjacent advice, alternatives, or background unless needed for correctness, safety, required discovery, artifact quality, validation, blockers, or an explicit user request. This does not weaken any required interviews, hard stops, output formats, final response rules, or review/approval gates in this skill.

## Purpose

Execute one story implementation plan completely while preserving Sibu's human review and workflow-control guarantees. This skill is the main-agent gatekeeper for execution: it verifies the story or plan, creates a missing plan through `ai-implementation-planner`, checks required source artifacts, requires sub-agent execution whenever spawning is available, and keeps final approval metadata, commit, and feature continuation under main-agent control.

When a compatible sub-agent spawn capability is available and permitted by the host, always delegate bounded file editing and validation to `sibu-implementation-executor` using a narrow packet and the executor toolbox. Execute inline only when sub-agent spawning is unavailable or blocked by host capability limits. Do not skip the final story-level review gate.

## Pipeline Contract

### What this skill needs

- Exactly one User Story file or one story-local `.impl_plan/` folder.
- Ordered implementation step files in that `.impl_plan/` folder, creating them through the planner route when missing.
- The story, Epic brief, BRD, and `sdd.md` as the authoritative software design artifact for the selected plan.
- `docs/features/<feature-slug>/ux.md` only when the story, any step, or feature has UI impact.
- The executor toolbox skill at `.agents/skills/ai-implementation-executor-toolbox/SKILL.md` when sub-agent spawning is available.
- Selected architecture guidance for the workflow.
- Required and relevant installed skill paths for the executor packet, including `clean-code` and `structured-logging` when the story touches observability-relevant code.

### What this skill writes

- Code, docs, tests, or other repo changes required by all unapproved implementation steps in the story plan, either through the executor worker or inline fallback.
- Step approval metadata only after explicit story-level user approval.
- One focused commit for approved eligible changes after explicit story-level user approval.
- Missing story-local implementation step files by routing through `ai-implementation-planner`, then immediately continuing into execution.

### When this skill stops

- The user does not provide or clearly identify exactly one User Story file or `.impl_plan/` folder.
- Any required source artifact is missing, incomplete, or invalid in a way its owning stage should repair.
- The story, any step, or feature has UI impact and `ux.md` is missing; direct the user to `ux-expert`.
- Selected architecture guidance is missing, unavailable, or ambiguous; stop and tell the user to run `sibu sync` to repair workflow configuration before implementation execution. Do not choose, infer, or substitute architecture guidance yourself.
- Validation fails and the fix is ambiguous, risky, or would exceed the approved plan.
- A step conflicts with the story, Epic, BRD, software design, UX spec, or approved Deep Module boundaries.

### What this skill must not do

- Do not create product visions, Software Architecture Documents, BRDs, software designs, UX specs, Epics, or User Stories.
- Do not modify prior-stage artifacts except for approval metadata in implementation step files after explicit story-level approval.
- Do not reread `docs/architecture.md` by default; trust `sdd.md` for Deep Module implementation boundaries.
- Do not mark any step approved before explicit story-level user approval.
- Do not commit story implementation changes before explicit story-level user approval.
- Do not let the executor worker write approval metadata or run `git commit`, `git stash`, or `git reset`.
- Do not choose or infer architecture guidance when it is missing; selected architecture is repo-owned workflow configuration repaired through `sibu sync`.


## Selected architecture guidance gate

Before execution, identify and read the workflow's selected architecture skill. If selected architecture guidance is missing, unavailable, or ambiguous, hard-stop and tell the user to run `sibu sync` to repair Sibu workflow configuration. Do not choose architecture guidance, infer it from repository structure, or continue with generic architecture assumptions.

When selected architecture guidance is present, treat it as binding execution and review context. Pass the selected architecture skill path and distilled architecture constraints to the executor worker, and apply them when evaluating step order, implementation boundaries, dependency direction, and review risks.

## Required source context gate

The user must provide or clearly identify exactly one User Story or implementation plan folder:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
```

or:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/
```

Before execution, verify these paths exist and are coherent:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/*.md
docs/features/<feature-slug>/epics/<epic-slug>/epic_brief.md
docs/features/<feature-slug>/brd.md
docs/features/<feature-slug>/sdd.md
docs/features/<feature-slug>/ux.md  # when the story, any step, or feature has UI impact
```

If the initial User Story has no matching `.impl_plan/`, or the initial `.impl_plan/` folder is missing, empty, or has no ordered `.md` step files, route through `ai-implementation-planner` to create or repair the story-local plan, then immediately continue into execution without a plan-review gate.

If required source context is missing, stop and ask the user to create or restore the missing artifact first. Do not delegate incomplete execution work to the worker.

Read the embedded diagrams in `sdd.md` and preserve their boundaries, flows, data/state implications, and verification-relevant risks. The SDD is authoritative; do not create a separate companion.

## Required sub-agent execution path

When the host exposes any usable sub-agent spawn capability and `sibu-implementation-executor` is available, spawn that worker. Treat a user request to plan, implement, execute, continue, or work through a Sibu User Story or Epic as authorization to use the Sibu executor worker, subject to host tool policy. Do not choose inline execution merely because it is simpler or faster.

Build a narrow executor packet for the worker. The packet must include:

- exactly one User Story path or story-local `.impl_plan/` folder
- story, Epic brief, BRD, software design with embedded diagrams, and UX path when relevant
- executor toolbox path: `.agents/skills/ai-implementation-executor-toolbox/SKILL.md`
- required skill paths, always including `.agents/skills/clean-code/SKILL.md`, and including `.agents/skills/structured-logging/SKILL.md` when the story involves logs, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes, or other observability-relevant behavior
- selected architecture skill path as required architecture context
- relevant optional installed skill paths only when applicable, such as TypeScript, React, Next.js, UX Expert, PostgreSQL Expert, or AI Prompt Engineer Master
- distilled skill constraints, including story scope, verification expectations, quality strategy context from the software design when relevant, validation steps from the implementation plan, Deep Module boundaries, selected architecture constraints, embedded diagram constraints to preserve diagram-stated boundaries, flows, and data/state implications without replacing `sdd.md`, UX constraints when relevant, and “do not write approval metadata or run git commit/stash/reset”
- validation evidence requirements: completion must show tests added or updated, acceptance criteria verified, commands run, edge/failure coverage, skipped deeper checks with rationale when relevant, and residual risks or known gaps
- approval and commit rules: the worker may edit the working tree and run validation, but final approval metadata and commit execution remain with the main agent after explicit user approval
- expected output format: changed files, completed steps, validation commands/results, compact validation evidence, risks, follow-up questions, and approval state
- executor mode: `implementation` for the initial story execution or `repair` for one combined review packet

Do not include exporter skills such as `export-to-github` or `export-to-notion` in the executor packet. Do not include `structured-logging` for stories limited to trivial pure logic with no observability-relevant behavior.

The worker must use only the packet, the toolbox, listed skill files including the selected architecture skill, source artifacts, and narrow repo inspection required for the story. Do not pass the full main conversation context.

## Fallback matrix

Use host capability metadata from workflow target planning guidance to choose the safest execution path. This order is mandatory:

1. **Sub-agent worker:** spawn `sibu-implementation-executor` when any compatible sub-agent capability is available.
2. **Mediated feedback:** if direct foreground review is unavailable but the spawned worker is resumable, the main agent mediates user feedback back to the same worker.
3. **Inline compressed-context fallback:** only if spawning/resuming the worker is unavailable or host/tool policy blocks it, the main agent executes the story inline using compressed context, the same source gates, and the same toolbox/packet constraints.

Fallback must be graceful. If spawning is available but the worker reports a task blocker, do not inline around it; surface the blocker or ask for the missing input. Do not tell users to use unsupported worker modes, and do not install or invoke unsupported host-specific worker files.

## Validation efficiency

- During implementation or repair, run focused checks that give fast feedback on the files being changed.
- After changes stabilize, run one aggregate `pnpm verify` pass when the repository provides it. Do not also run standalone build, check, or full-test commands already covered by that aggregate pass.
- Run packed-runtime validation once at the end only when managed runtime/template assets are relevant.
- Rerun expensive aggregate or packed-runtime checks only after subsequent relevant changes make evidence stale or when diagnosing a failure.
- A repair must return fresh post-repair validation evidence; pre-repair evidence cannot support the repaired local changes.

## Story execution model

Execute all unapproved step files in filename order. A step file is approved only when it contains:

```md
## Review status

- Status: approved
```

For unapproved steps:

1. Read ordered step files once at the start of execution.
2. Implement unapproved steps in order.
3. Run focused validation named in each step when practical.
4. Stop for ambiguity, missing required files, conflicting scope, failed validation that cannot be safely fixed, or material risk.
5. After the final unapproved step is implemented and validated, the implementation executor returns its changed-file and validation summary to the main agent. It does not ask the user for approval.

Do not mark steps approved, commit changes, move to the next story, or move to the next Epic until automated review has completed or transparently escalated and the user explicitly approves the completed story implementation.

## Automated implementation review loop

The main agent owns this message-only orchestration in its active context. Do not persist snapshots or reviewer packets, add hashing helpers, or introduce a runtime workflow module.

### Applicability and synchronized review

1. Classify the executor's changed-file report. Documentation-only changes bypass specialist review and proceed to the human story review gate. Changes to source code, tests, dependencies, schemas, or runtime configuration require specialist review.
2. For each applicable review round, identify one review snapshot with the round number, current changed-file list, current local diff, and fresh validation summary. Capture the current Git status/diff before spawning reviewers; the snapshot is an unchanged-local-change invariant, not a persisted hash.
3. Give fresh `sibu-architecture-reviewer` and `sibu-technical-lead-reviewer` instances the same story and plan paths, authoritative artifacts and skills, review-round number, changed-file list, local-change scope, validation summary, and access to the actual current diff.
4. Spawn both read-only reviewers concurrently when supported. Otherwise run them sequentially without allowing any writer between them. Never run an implementation or repair executor while a reviewer is active.
5. Before aggregating, compare Git status/diff with the captured local-change scope. If any unexpected mutation occurred, discard both outcomes and ask the user how to handle it; do not consume a repair round.

If reviewer spawning is unavailable, disclose that independent automated approval is unavailable and proceed to the human gate with implementation evidence and any completed reviewer packet as advisory evidence. Never simulate an independent specialist review inline.

### Packet validation and aggregation

Accept only the Story 01 reviewer packet contract: `approved | changes_required | human_decision_required` verdict; stable role-prefixed finding IDs; blocker/major findings with severity, file/location, evidence, violated expectation, and required outcome; minor notes; and unresolved risks. Associate the specialist role and review round from the spawn packet and orchestration context rather than requiring reviewers to echo them. Retry a malformed or incomplete packet once with a focused format request; if it still fails, treat that reviewer as unavailable.

Aggregate only packets for the same unchanged snapshot. Deduplicate overlapping findings by required outcome while preserving every source finding ID, original severity, specialist ownership, and conclusion; never downgrade severity. Minor notes remain visible but do not trigger repair. Do not merge away substantive contradictions. Escalate with evidence when reviewers conflict, authoritative sources disagree, or a finding requires a material decision such as scope expansion, an unplanned public contract or persisted-data change, a new production dependency, a security/privacy consequence, a destructive migration, or an alternative architecture direction.

### Bounded fresh repair

- Initial review is repair count zero. Count a repair only after a fresh repair executor mutates the implementation in response to one combined packet.
- When compatible blocker or major findings remain and fewer than three repairs have completed, spawn a fresh existing `sibu-implementation-executor` in `repair` mode. Provide exactly one combined packet, the current snapshot identity and changed files, prior validation evidence, the story and plan paths, authoritative artifacts, and applicable skills.
- Repair mode must not replan, replay implementation steps, broaden scope, or resolve a material decision. It returns current changed files and fresh proportionate validation evidence to the main agent.
- Any repair mutation invalidates all prior automated approvals. Increment the shared repair count, establish a new local-change snapshot, and run both fresh specialist reviews again.
- After the third repair, run one final synchronized review. If blocker or major findings remain, escalate them at the human gate; never start a fourth repair.
- Matching specialist approvals, or minor-only outcomes, terminate automated review and advance only to the human story review gate. Automated outcomes never authorize approval metadata, commits, or feature continuation.

## Story review gate

After implementation, validation, and any applicable automated review/repair loop, report that the full story implementation is ready for human review and that you are waiting for story-level approval before marking steps approved, committing eligible non-ignored changes, and continuing the Epic.

The review packet should include:

- story path and implementation plan folder
- changed files
- completed steps
- validation commands and results
- validation evidence covering tests added or updated, acceptance criteria verified, edge/failure coverage, skipped deeper checks with rationale when relevant, and residual risks or known gaps
- specialist-review applicability and repair rounds used
- architecture and technical-lead verdicts, remaining minor notes, and any unavailable-review warning
- unresolved blocker/major findings and escalation evidence when automated review could not approve
- risks or follow-up questions

Use only the current changed files and fresh validation summary. Reviewer packets remain workflow messages and are summarized here rather than persisted.

For non-trivial stories, “tests passed” alone is not enough. Use context-sensitive judgment for simple or documentation-only changes, but require enough validation evidence to review the story against its verification expectations and planned validation steps.

If the user asks questions or requests changes, keep working within the same story until those changes are complete. If requested changes exceed the approved story plan, stop and ask whether the plan should be revised.

## Approval metadata and commit control

Only after explicit story-level user approval, update every completed step file by adding or updating:

```md
## Review status

- Status: approved
- Approved by: <current git user>
- Approved at: <ISO-8601 timestamp>
```

Before writing approval markers, identify the current Git user with `git config user.name`; if unavailable, use `git config user.email`.

After writing approval markers, commit only eligible non-ignored changes produced by the approved story. Do not stage or commit ignored paths, including ignored `docs/features/**` paths. Do not include unrelated local edits or pre-existing worktree changes. Use a Conventional Commits 1.0.0 message describing the completed story.

If every story change is ignored and nothing is eligible to commit, skip the commit and report that clearly.

## Feature continuation check

After the approved story implementation is committed, continue through the current feature unless there is no next story or Epic to implement.

1. Inspect the current Epic's `stories/` folder in filename order.
2. If a next User Story exists, plan it through `ai-implementation-planner` when needed, then immediately begin execution.
3. If no next story exists, inspect the feature's `epics/` folder and choose the next logical Epic based on dependencies, sequencing, risk reduction, and feature value.
4. If no logical next Epic exists or every Epic has all stories approved, tell the user the feature appears ready and stop.

## Final response behavior

After implementing all unapproved steps in one story, briefly report:

- that the story implementation finished and is ready for review
- the story file path and implementation plan folder
- the steps completed
- validations run and their results
- compact validation evidence, including acceptance criteria verified, edge/failure coverage, skipped deeper checks with rationale when relevant, and residual risks or known gaps
- notable risks or follow-up questions, if any
- that you are waiting for story approval before marking steps approved, committing eligible non-ignored changes, and continuing

After approving and committing a story implementation, briefly report the commit hash or why no commit was created, then continue to the next story/Epic according to the feature continuation check.

## BRD handoff

Preserve source BRD IDs carried by the story and software design in implementation steps and validation. Worker packets must carry the source BRD path and applicable IDs, not copy the full requirement catalog or broaden worker authority.

Use `docs/features/<feature-slug>/brd.md` as the business source. Qualify references with that source path and verify IDs resolve to its entries. Surface missing, invalid, or conflicting references for focused clarification; do not invent requirements or claim unsupported coverage.

Require sufficient BRD context, not approval fields, signatures, draft/approved status, or a sign-off ceremony. A user request selects the next stage; do not automatically execute later stages. Missing or conflicting decisions still require clarification. Preserve stage prerequisites, required UX, code-change permissions, and story-level implementation review.
