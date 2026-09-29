---
name: ai-implementation-plan-executor
description: Gatekeep one Sibu story plan through independent plan review, human acceptance, execution, story review, and approval control.
---

# AI Implementation Plan Executor

## Response style

Keep conversational responses short and answer only what was asked. Do not add adjacent advice, alternatives, or background unless needed for correctness, safety, required discovery, artifact quality, validation, blockers, or an explicit user request. This does not weaken any required interviews, hard stops, output formats, final response rules, or review/approval gates in this skill.

## Purpose

Review and accept one exact Story plan before execution while preserving Sibu's later human Story review and workflow-control guarantees. This main-agent gatekeeper verifies or creates the plan, obtains an independent read-only architecture review of that plan, explains the result, and waits for the human decision before any executor starts. It keeps final Story approval metadata, any final Story commit, and feature continuation under main-agent control; a Task executor alone may commit its own checked Task.

When a compatible sub-agent spawn capability is available and permitted by the host, always delegate bounded file editing and validation to `sibu-implementation-executor` using a narrow packet and the executor toolbox. Execute inline only when sub-agent spawning is unavailable or blocked by host capability limits. Do not skip the final story-level review gate.

## Pipeline Contract

### What this skill needs

- Exactly one User Story file or one story-local `.impl_plan/` folder.
- Ordered implementation step files in that `.impl_plan/` folder, creating them through the planner route when missing, then reviewing the resulting plan before execution.
- The story, Epic brief, BRD, and `sdd.md` as the authoritative software design artifact for the selected plan.
- `docs/features/<feature-slug>/ux.md` only when the story, any step, or feature has UI impact.
- The executor toolbox skill at `.agents/skills/ai-implementation-executor-toolbox/SKILL.md` when sub-agent spawning is available.
- Selected architecture guidance for the workflow.
- Required and relevant installed skill paths for the executor packet, including `clean-code` and `structured-logging` when the story touches observability-relevant code.

### What this skill writes

- Code, docs, tests, or other repo changes required by all unapproved implementation steps in the story plan, either through the executor worker or inline fallback.
- Story status and step approval metadata at their respective execution and human-approval gates.
- One focused commit for remaining approved eligible Story changes after explicit story-level user approval; checked Tasks may already have passing scoped commits.
- Missing story-local implementation step files by routing through `ai-implementation-planner`, then immediately continuing into plan review without a separate plan-generation approval gate.

### When this skill stops

- The user does not provide or clearly identify exactly one User Story file or `.impl_plan/` folder.
- Any required source artifact is missing, incomplete, or invalid in a way its owning stage should repair.
- The story, any step, or feature has UI impact and `ux.md` is missing; direct the user to `ux-expert`.
- Selected architecture guidance is missing, unavailable, or ambiguous; stop and tell the user to run `sibu sync` to repair workflow configuration before implementation execution. Do not choose, infer, or substitute architecture guidance yourself.
- Validation fails and the fix is ambiguous, risky, or would exceed the approved plan.
- A step conflicts with the story, Epic, BRD, software design, UX spec, or approved Deep Module boundaries.

### What this skill must not do

- Do not create product visions, Software Architecture Documents, BRDs, software designs, UX specs, Epics, or User Stories.
- Do not modify prior-stage artifacts except the selected Story's status field at the gates below and approval metadata in implementation step files after explicit story-level approval.
- Do not reread `docs/architecture.md` by default; trust `sdd.md` for Deep Module implementation boundaries.
- Do not mark any step approved before explicit story-level user approval.
- Do not make a final Story commit before explicit story-level user approval. This does not prohibit one passing scoped Task commit in `checked-task` mode.
- Do not let a Story-plan executor worker write approval metadata or run `git commit`, `git stash`, or `git reset`. A checked-Task executor may make only the passing, scoped Task commit defined below; neither worker may stash or reset.
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

If the initial User Story has no matching `.impl_plan/`, or the initial `.impl_plan/` folder is missing, empty, or has no ordered `.md` step files, route through `ai-implementation-planner` to create or repair the story-local plan, then immediately continue into independent plan review. The user request authorizes plan generation, not execution of an unaccepted plan.

If required source context is missing, stop and ask the user to create or restore the missing artifact first. Do not delegate incomplete execution work to the worker.

Read the embedded diagrams in `sdd.md` and preserve their boundaries, flows, data/state implications, and verification-relevant risks. The SDD is authoritative; do not create a separate companion.

## Story reference selection for initial handoff

Before a planner or initial `implementation` executor spawn, curate one current reference set for the selected story. Verify required source paths under the gates above. Derive candidate BRD IDs from the story, Epic brief, and plan when available; verify each against `docs/features/<feature-slug>/brd.md`. Use source evidence to identify governing SDD headings and embedded diagrams, plus applicable SAD/SDD module ownership and dependency constraints and required or relevant installed skill paths. Prefer stable IDs, exact headings, or unambiguous diagram descriptions under headings; do not guess anchors, line numbers, or references from keywords alone. Reuse this verified set in role-specific planner and initial executor packets, and refresh it for a new story or materially changed source. A separately invoked planner curates its own set.

Label references **start here**, never an exclusive reading list or replacement for the full authoritative paths. When a fine-grained ID, heading, diagram, or boundary is uncertain, supply the full source path and tell the worker to locate relevant context there. Missing required sources or selected architecture guidance remain hard stops; fallback does not waive a prerequisite. The plan-review packet uses the independent reviewer contract below.

## Required sub-agent execution path

Only after the human accepts the currently reviewed plan version, when the host exposes any usable sub-agent spawn capability and `sibu-implementation-executor` is available, spawn that worker. Treat a user request to plan, implement, execute, continue, or work through a Sibu User Story or Epic as authorization to use the Sibu executor worker after plan acceptance, subject to host tool policy. Do not choose inline execution merely because worker progress is completion-only, or because inline execution is simpler or faster.

Build a narrow executor packet for the worker. The packet must include:

- exactly one User Story path or story-local `.impl_plan/` folder
- story, Epic brief, BRD, software design with embedded diagrams, and UX path when relevant
- for `implementation` mode, the current source-verified story reference set as targeted starting context: applicable BRD IDs, governing SDD headings and diagram descriptions, applicable SAD/SDD module ownership and dependency constraints, and required or relevant skill paths; use full-path discovery instructions for uncertain fine-grained references without omitting a required source
- executor toolbox path: `.agents/skills/ai-implementation-executor-toolbox/SKILL.md`
- required skill paths, always including `.agents/skills/clean-code/SKILL.md`, and including `.agents/skills/structured-logging/SKILL.md` when the story involves logs, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes, or other observability-relevant behavior
- selected architecture skill path as required architecture context
- relevant optional installed skill paths only when applicable, such as TypeScript, React, Next.js, UX Expert, PostgreSQL Expert, or AI Prompt Engineer Master
- distilled skill constraints, including story scope, verification expectations, quality strategy context from the software design when relevant, validation steps from the implementation plan, Deep Module boundaries, selected architecture constraints, embedded diagram constraints to preserve diagram-stated boundaries, flows, and data/state implications without replacing `sdd.md`, UX constraints when relevant, and mode-specific Git authority: no commit in Story-plan modes; one passing scoped Task commit only in `checked-task` mode; never stash/reset or write final Story approval metadata
- validation evidence requirements: completion must show tests added or updated, acceptance criteria verified, commands run, edge/failure coverage, skipped deeper checks with rationale when relevant, and residual risks or known gaps
- approval and commit rules: Story-plan modes may edit and validate but not commit; `checked-task` mode may commit one passing scoped Task; final Story approval metadata and any remaining final Story commit stay with the main agent after explicit user approval
- expected output format: changed files, completed steps, validation commands/results, compact validation evidence, risks, follow-up questions, and approval state
- executor mode: `checked-task` for one accepted-plan Task; retain `implementation` for an already authorized legacy Story-plan execution and `repair` only for specifically authorized later repair. Any human-requested change to reviewable plan content must be planned and re-reviewed before dispatch.
- selected transition-delivery route: `direct foreground`, `main-mediated foreground`, or `completion-only evidence`, including which actor owns any available user-visible delivery
- main-owned transition-delivery context: selected foreground route, sole user-visible delivery owner, a unique transition ID for this phase invocation, and any delivered transition keys that must not be replayed

Do not include exporter skills such as `export-to-github` or `export-to-notion` in the executor packet. Do not include `structured-logging` for stories limited to trivial pure logic with no observability-relevant behavior.

The worker must use only the packet, the toolbox, listed skill files including the selected architecture skill, source artifacts, and narrow repo inspection required for the story. Do not pass the full main conversation context.

## Foreground progress delivery

Select one route: direct worker-visible progress, main-mediated progress, or completion-only evidence. A usable completion-only worker still executes foreground; do not replay stale start or finish transitions. If spawning or resuming is unavailable or blocked, the main may execute inline under worker toolbox constraints. Before each foreground phase invocation, assign a fresh opaque transition ID, unique across the story workflow, including authorized continuations. Pass it in the worker packet. The sole user-visible owner tracks delivered `(transition ID, edge)` keys and forwards each available live start or finish at most once. Reuse the same ID for both edges of one invocation, but assign a new ID to every later invocation of the same phase. Completion-only delivery may omit live transitions without changing execution ownership.

## Fallback matrix

For each fresh `sibu-implementation-executor` spawn, classify the delegated task before resolving `--role implementation-executor` using the Sibu-provided sub-agent model-route protocol in `AGENTS.md`. For every `sibu-architecture-reviewer` plan-review spawn, classify and resolve with `--role architecture-reviewer`; do not reuse the executor's route. Follow saved, first-use, unavailable, save-failed, one-time, and cancellation states. Disclose the selected route and pass explicit `model` and `reasoning_effort` host spawn parameters on every path. If the host cannot accept both, stop the affected launch; no parent inheritance or silent fallback. Routing never changes reviewer independence, packet boundaries, human plan acceptance, or Story approval and commit authority.

Use host capability metadata from workflow target planning guidance to choose the safest execution path. This order is mandatory:

1. **Direct foreground worker:** spawn `sibu-implementation-executor` when the host makes its progress directly user-visible; the worker owns live progress delivery.
2. **Mediated foreground worker:** otherwise spawn when the host relays worker progress to the main agent before completion; the main forwards those live transitions and can mediate user feedback back to the same resumable worker.
3. **Completion-only worker:** otherwise spawn the usable worker. Do not replay stale live transitions; disclose that live progress was unavailable.
4. **Inline compressed-context fallback:** only when spawning or resuming is unavailable or blocked by host/tool policy, the main agent executes the story inline using compressed context, the same source gates, and the same toolbox/packet constraints.

All implementation execution stays in the foreground; never detach it or continue it as background work. Fallback must be graceful. If a foreground worker is available but reports a task blocker, do not inline around it; surface the blocker or ask for the missing input. Do not tell users to use unsupported worker modes, and do not install or invoke unsupported host-specific worker files.

## Repository-aware validation policy

Narrowly inspect repository-owned definitions and guidance to establish available focused checks, whether a canonical aggregate verification exists, the distinct responsibilities it covers, and whether changed assets affect packaged or runtime-distributed behavior. Do not infer coverage from a check's name.

- During implementation, run proportionate focused checks for the changing work; they provide fast feedback but do not replace final confidence.
- After stabilization, execute exactly one final validation strategy. When a canonical aggregate exists, run it once and do not separately repeat standalone checks whose responsibilities it covers.
- When no canonical aggregate exists, run the smallest sufficient non-overlapping set of existing repository checks. Do not invent or rename checks.
- Run a distinct packaging or runtime check only when changed assets can affect packaged output, installed behavior, generated runtime resources, or distribution semantics. If material relevance or coverage is uncertain, retain the distinct check and record the conservative rationale.
- Rerun an expensive final check only after a later relevant mutation makes its evidence stale or when diagnosing a failure. Every change after validation requires fresh evidence for the resulting work.
- Repository-specific plans may name concrete checks discovered from that repository; this reusable policy must remain technology-, ecosystem-, tool-, and concrete-command-neutral.
- A required validation failure blocks unsupported success or progression. Preserve the accepted plan identity, human Story approval, commit control, and continuation authority.

## Legacy Story-plan execution model

This section applies to an already authorized `implementation` or `repair` Story-plan worker, not a `checked-task` worker. The checked-Task dispatch contract above takes precedence for new accepted plans. In legacy `implementation` mode, execute all unapproved step files in filename order. A step file is approved only when it contains:

```md
## Review status

- Status: approved
```

For unapproved steps:

1. Read ordered step files once at the start of execution.
2. Implement unapproved steps in order.
3. Run focused validation named in each step when practical. This does not waive any planned Task's specific executable pass/fail check before dispatch.
4. Stop for ambiguity, missing required files, conflicting scope, failed validation that cannot be safely fixed, or material risk.
5. After the final unapproved step is implemented and validated, the implementation executor returns its changed-file and validation summary to the main agent. It does not ask the user for approval.

Do not mark steps approved, commit changes, move to the next story, or move to the next Epic until the user explicitly approves the completed story implementation.

## Exact-plan architecture review and human decision

The main agent owns this message-only gate before the first executor dispatch. Do not add a runtime module or persistent hash helper. The architecture reviewer assesses the plan, never an implementation diff; branch creation and Task commits remain downstream of human plan acceptance.

### Reviewable plan identity

Identify one exact reviewable plan version from the current Story plan content: source decisions and references, acceptance-criteria coverage, Milestone outcomes and ordered Task IDs, Task scopes/dependencies, and each Task's prescribed executable check and expected evidence. Include any reviewable conventions that constrain implementation. Exclude execution-only Task status, Milestone progress, run log, commit references, and approval/progress metadata; these cannot silently change accepted scope or checks. A stable content digest or explicit version label may identify the version only if it is reproducibly tied to that reviewable content. If separation is ambiguous, or the identity cannot be established, pause and clarify rather than treating an old acceptance as current.

Compare the reviewable identity at reviewer dispatch, presentation of the human choice, human acceptance, and every executor dispatch. Any reviewable change invalidates the prior review and acceptance, including human-requested work after a Milestone. Status/progress-only changes do not. A changed plan returns to the planner for the affected work, then to a fresh architecture reviewer and human decision; never reuse a stale packet.

### Independent read-only review

Before execution, send a fresh `sibu-architecture-reviewer` exactly one Story and one plan folder, the current reviewable plan identity and content, Story, Epic brief, source BRD, feature SDD with embedded diagrams, project SAD, selected architecture guidance, applicable skills, and UX when required. Supply source-verified **start here** BRD IDs, SDD headings and diagram descriptions, SAD/SDD module boundaries, and dependencies as navigation only. The reviewer independently verifies the full authoritative sources and plan. Do not send a code diff, changed-file list, executor validation summary, or post-implementation repair request as review evidence. Resolve the architecture reviewer's model route before launching the read-only reviewer. Do not run an executor while the reviewer is active.

Require a compact packet naming the reviewed identity and reporting, in order: over-engineering findings or explicit absence; premature-optimization findings or explicit absence; architecture/contract fit; Story and acceptance-criteria coverage and Task sizing; and each Task's executable check and failure handling. Each finding names plan location, evidence, consequence, smallest adequate fix, and whether it is a necessary constraint or preference. Preserve unresolved risks even when no blocking finding exists. The reviewer never modifies the plan, approves execution, or reviews implementation code. If a packet is malformed or incomplete, retry a focused format request once; if still unavailable, disclose that independent review is unavailable and do not claim the plan was reviewed or dispatch an executor.

### Human plan decision

Present each material finding in short, plain language: what is wrong, why it matters, and the smallest practical fix. Show unresolved risks even for an otherwise clean review. Offer these choices for the current reviewed version: **accept**, **accept with explicitly visible warnings**, **request revision**, or **defer**. A reviewer's clean packet is not human acceptance; a warning does not automatically veto an informed human acceptance. Do not silently repair the plan. Revision returns to the planner and a fresh review cycle; deferral leaves execution stopped. A missing review, missing/ambiguous identity, changed plan, or absent explicit human acceptance blocks executor dispatch.

Before any executor dispatch, verify that every Task in the accepted plan has its own specific, objective, executable pass/fail check and expected passing evidence. A missing, vague, or non-executable Task check is a non-waivable plan defect: stop dispatch even if the human accepted the plan with visible warnings. Return it to the planner to split or clarify the Task, or move genuinely judgment-based work to a human-reviewed Milestone; then obtain a fresh architecture review and human decision on the revised plan. Keep other genuinely waivable risks available for informed human acceptance.

Once the human accepts the current reviewed identity, compare it again immediately before each executor dispatch. Preserve the human Story review below. Do not introduce automatic code review or a post-code architecture-review/repair loop.

### Checked-Task dispatch on a Story branch

Before branch creation and each dispatch, compare the accepted reviewable plan identity; status and progress alone do not change it. If acceptance is absent or stale, a Task lacks its prescribed executable check and expected evidence, or the next ordered Task is unclear, stop for plan review rather than inventing work or a check. Inspect the current branch, index, worktree, and available isolation. Only after acceptance, create or select one dedicated Story branch. Refuse branch collisions, unrelated staged or user changes, ambiguous pre-existing work, unavailable source control/isolation, or a real-credential need. Reconcile existing plans or branches with the human; never stash, reset, rebase, overwrite, force-add ignored files, or expose credentials to unblock execution.

After selecting the Story branch and immediately before the first Task dispatch, change only the selected Story file's `**Status:**` field from `ready-for-planning` to `in-progress`. On a resumed Story, preserve `in-progress`; if the field is missing, `draft`, `done`, or otherwise conflicts with the accepted plan and execution evidence, stop and reconcile it with the human. Leave the Story `in-progress` through Task execution, Milestone deferrals, PR blockers, and final PR review. This status edit is progress metadata, not plan approval or permission to commit ignored Story files.

Dispatch exactly the next ordered Task to a **fresh** `sibu-implementation-executor` context. Its narrow packet carries one Task ID, Story branch, accepted-plan identity, bounded files/area, exact prescribed check and passing evidence, conventions, recent progress, named skills, and exact optional source pointers. Do not send all upstream documents by default, rely on prior worker memory, or dispatch another Task while one is active. The worker's only commit authority is one passing, scoped Task-ID-linked Conventional Commit. Verify its returned Task and branch identity, actual check command/result, staged/committed scope, commit reference, and post-commit progress before advancing; a blocker stops the Story. Keep final Story approval and continuation with the main agent.

### Milestone outcome and human decision

After **every** Task in the current Milestone has its prescribed check passed, scoped Task-ID commit verified, and post-commit progress recorded, pause before dispatching any Task in a later Milestone. A blocked or unverified Task does not complete its Milestone: report the blocker and stop without presenting a review-as-success claim. Do not ask for human approval after each routine passing Task.

For an earlier Milestone, present one concise, human-readable outcome: what changed and why it matters; each Task ID, actual check and result, and commit reference; known blockers and risks; and the current accepted plan identity. Offer **accept**, **request changes**, or **defer**. Never claim an unrun check passed. A pending decision forbids later-Milestone dispatch. On acceptance, advance **only to the next Milestone** on the still-current accepted plan, then recheck its identity and Task checks before dispatch. On deferral, preserve Milestone review and progress state and dispatch nothing.

Human-requested changes become new or revised bounded planned Tasks with their own specific executable pass/fail checks and expected passing evidence; do not auto-repair feedback or invent checks. Return the requested outcome to the planner. Changed reviewable plan content invalidates the previous identity, architecture review, and human acceptance. Obtain a **fresh independent plan-only architecture review** of the revised identity, present findings and risks, and require explicit human acceptance of that exact version before any executor resumes. Status/progress-only updates do not invalidate accepted scope. Missing checks or stale identity stop dispatch. Do not substitute an implementation-code architecture review.

For the final Milestone, including a one-Milestone Story, the existing final human Story-review interaction below **is the same Milestone decision**, not a second gate. Open one Story PR from the dedicated Story branch only after all final-Milestone Tasks have passing prescribed checks, verified scoped commits and progress, and required story-level validation has completed successfully. A final request for changes follows the same checked plan-revision loop before further executor work; update the same PR for renewed final review.

## Story review gate: one final PR decision

The main agent, never the Task executor, opens one PR from the verified dedicated Story branch after the accepted plan's final checked Tasks and required story-level validation are complete. Do not open a PR early, from another branch, or with missing or failed required local checks. Confirm the branch, accepted plan identity, final Task check/commit/progress evidence, and actual story-level command results before opening it. The PR is the final Milestone and Story review surface for one- and multi-Milestone Stories; earlier Milestones keep their conversational pauses. There is no separate post-PR approval or implementation-code architecture review.

Write a short, plain-language PR description with **What changed**, **Why it matters**, **Verification**, and **Known risks and limits** sections. Include the Story path and accepted plan identity, Task commits, tests and acceptance criteria covered, edge/failure coverage, and residual risks. For non-trivial Stories, “tests passed” alone is not enough evidence. Report each story-level check's actual result; distinguish passing, failing, pending, and unavailable CI checks as observed from the host before the human decides. Never call an unrun, pending, failed, or unavailable check passing. If CI has not settled, disclose that and wait for its available status before requesting the final decision. The human judges readability; deterministic template tests do not prove live agent or PR-host behavior.

If source-control hosting access, PR creation, or check retrieval fails, preserve the branch and validation evidence, report the blocker, and leave final review incomplete. Do not silently substitute a conversational approval, create a second PR, merge, or deploy. Do not put credentials or sensitive data into the PR, logs, or worker packet.

Present the PR for one explicit **accept**, **request changes**, or **defer** decision. Acceptance alone permits approval metadata and any remaining eligible final Story commit below. Already checked Task commits do not confer Story approval. Deferral and requested changes leave the Story `in-progress`. Requested changes become new or revised bounded checked plan Tasks, invalidating the old reviewable plan identity. Obtain fresh independent plan-only architecture review and explicit human acceptance of the revised identity before executor dispatch; revalidate the changed Story and update the **same PR** and its actual checks for renewed final review. Never substitute a code-diff architecture review or ask for a duplicate final approval.

## Approval metadata and commit control

Only after explicit story-level user approval, change only the selected Story file's `**Status:**` field from `in-progress` to `done` and update every completed step file by adding or updating:

```md
## Review status

- Status: approved
- Approved by: <current git user>
- Approved at: <ISO-8601 timestamp>
```

Before writing approval markers, identify the current Git user with `git config user.name`; if unavailable, use `git config user.email`.

After writing approval markers, commit only remaining eligible non-ignored changes produced by the approved story, if any; do not duplicate a checked Task commit. Do not stage or commit ignored paths, including ignored `docs/features/**` paths. Do not include unrelated local edits or pre-existing worktree changes. Use a Conventional Commits 1.0.0 message describing the completed story.

If every story change is ignored and nothing is eligible to commit, skip the commit and report that clearly.

## Feature continuation check

After the approved story implementation is committed, continue through the current feature unless there is no next story or Epic to implement.

1. Inspect the current Epic's `stories/` folder in filename order.
2. If a next User Story exists, plan it through `ai-implementation-planner` when needed, then immediately begin execution.
3. If no next story exists, inspect the feature's `epics/` folder and choose the next logical Epic based on dependencies, sequencing, risk reduction, and feature value.
4. If no logical next Epic exists or every Epic has all stories approved, tell the user the feature appears ready and stop.

## Final response behavior

After final Story checks and PR creation, briefly report in the PR handoff:

- that the final Milestone and Story are ready for one PR review
- the story file path and implementation plan folder
- the steps completed
- validations run and their results
- compact validation evidence, including acceptance criteria verified, edge/failure coverage, skipped deeper checks with rationale when relevant, and residual risks or known gaps
- notable risks or follow-up questions, if any
- that you are waiting for the explicit PR review decision before marking steps approved, committing eligible non-ignored changes, and continuing

After approving and committing a story implementation, briefly report the commit hash or why no commit was created, then continue to the next story/Epic according to the feature continuation check.

## BRD handoff

Preserve source BRD IDs carried by the story and software design in implementation steps and validation. Worker packets must carry the source BRD path and applicable IDs, not copy the full requirement catalog or broaden worker authority.

Use `docs/features/<feature-slug>/brd.md` as the business source. Qualify references with that source path and verify IDs resolve to its entries. Surface missing, invalid, or conflicting references for focused clarification; do not invent requirements or claim unsupported coverage.

Require sufficient BRD context, not approval fields, signatures, draft/approved status, or a sign-off ceremony. A user request selects the next stage; do not automatically execute later stages. Missing or conflicting decisions still require clarification. Preserve stage prerequisites, required UX, code-change permissions, and story-level implementation review.
