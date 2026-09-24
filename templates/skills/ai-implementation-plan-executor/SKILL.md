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

## Story reference selection for initial handoff

Before a planner or initial `implementation` executor spawn, curate one current reference set for the selected story. Verify required source paths under the gates above. Derive candidate BRD IDs from the story, Epic brief, and plan when available; verify each against `docs/features/<feature-slug>/brd.md`. Use source evidence to identify governing SDD headings and embedded diagrams, plus applicable SAD/SDD module ownership and dependency constraints and required or relevant installed skill paths. Prefer stable IDs, exact headings, or unambiguous diagram descriptions under headings; do not guess anchors, line numbers, or references from keywords alone. Reuse this verified set in role-specific planner and initial executor packets, and refresh it for a new story or materially changed source. A separately invoked planner curates its own set.

Label references **start here**, never an exclusive reading list or replacement for the full authoritative paths. When a fine-grained ID, heading, diagram, or boundary is uncertain, supply the full source path and tell the worker to locate relevant context there. Missing required sources or selected architecture guidance remain hard stops; fallback does not waive a prerequisite. Keep specialist-review and `repair` packets under their existing contracts.

## Required sub-agent execution path

When the host exposes any usable sub-agent spawn capability and `sibu-implementation-executor` is available, spawn that worker. Treat a user request to plan, implement, execute, continue, or work through a Sibu User Story or Epic as authorization to use the Sibu executor worker, subject to host tool policy. Do not choose inline execution merely because worker progress is completion-only, or because inline execution is simpler or faster.

Build a narrow executor packet for the worker. The packet must include:

- exactly one User Story path or story-local `.impl_plan/` folder
- story, Epic brief, BRD, software design with embedded diagrams, and UX path when relevant
- for `implementation` mode, the current source-verified story reference set as targeted starting context: applicable BRD IDs, governing SDD headings and diagram descriptions, applicable SAD/SDD module ownership and dependency constraints, and required or relevant skill paths; use full-path discovery instructions for uncertain fine-grained references without omitting a required source
- executor toolbox path: `.agents/skills/ai-implementation-executor-toolbox/SKILL.md`
- required skill paths, always including `.agents/skills/clean-code/SKILL.md`, and including `.agents/skills/structured-logging/SKILL.md` when the story involves logs, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes, or other observability-relevant behavior
- selected architecture skill path as required architecture context
- relevant optional installed skill paths only when applicable, such as TypeScript, React, Next.js, UX Expert, PostgreSQL Expert, or AI Prompt Engineer Master
- distilled skill constraints, including story scope, verification expectations, quality strategy context from the software design when relevant, validation steps from the implementation plan, Deep Module boundaries, selected architecture constraints, embedded diagram constraints to preserve diagram-stated boundaries, flows, and data/state implications without replacing `sdd.md`, UX constraints when relevant, and “do not write approval metadata or run git commit/stash/reset”
- validation evidence requirements: completion must show tests added or updated, acceptance criteria verified, commands run, edge/failure coverage, skipped deeper checks with rationale when relevant, and residual risks or known gaps
- approval and commit rules: the worker may edit the working tree and run validation, but final approval metadata and commit execution remain with the main agent after explicit user approval
- expected output format: changed files, completed steps, validation commands/results, compact validation evidence, risks, follow-up questions, and approval state
- executor mode: `implementation` for the initial story execution or `repair` for one combined review packet
- selected transition-delivery route: `direct foreground`, `main-mediated foreground`, or `completion-only evidence`, including which actor owns any available user-visible delivery
- main-owned occurrence assignment context: the next reserved run-level occurrence number for every applicable worker-owned phase and the already-delivered transition keys the worker must not replay

Do not include exporter skills such as `export-to-github` or `export-to-notion` in the executor packet. Do not include `structured-logging` for stories limited to trivial pure logic with no observability-relevant behavior.

The worker must use only the packet, the toolbox, listed skill files including the selected architecture skill, source artifacts, and narrow repo inspection required for the story. Do not pass the full main conversation context.

## Automated-run timing contract

Timing is advisory, message-only observation. It must never change execution order, validation, reviewer availability handling, human repair authorization, escalation, approval, commit, or continuation authority.

### Boundary, ledger, and sources

- Start one ephemeral run ledger immediately after accepting one story or plan target and before `preparation_context`. Finish it immediately before presenting the first human story-review packet. Human reading, discussion, decisions, approval metadata, commit, and continuation are outside that run. A later human-authorized repair starts separately bounded continuation timing; never include the intervening human pause in active automation.
- Record ordered, non-overlapping top-level occurrences using only `preparation_context`, `planning`, `implementation`, `focused_validation`, `aggregate_validation`, `specialist_review`, and `repair`. Omit phases that do not occur. `orchestration_overhead` is uncovered run time calculated by the helper, never a worker interval.
- An occurrence contains its stable phase label, occurrence number, absolute start and finish boundaries when known, and outcome. Concurrent child evidence adds only a stable role label, boundaries or elapsed duration, and outcome.
- At each boundary prefer a suitable host-native absolute timestamp. Otherwise run `.agents/scripts/implementation-phase-timing.mjs clock`. Never estimate missing timing. Use the helper's `reconcile` operation for interval arithmetic and final output.
- Keep the ledger only in active context and timing handoff messages. Never write it to repository files, Sibu state, logs, caches, or analytics.

Map handoffs into the Story 01 helper contract exactly:

- The main executor's `planning` occurrence is the sole authoritative top-level planning boundary. Optional planner-worker evidence is a child labeled `implementation-planner` under that occurrence; never accept a second top-level planning occurrence from the worker. Implementation evidence uses top-level `implementation`, `focused_validation`, and `aggregate_validation` occurrences. Repair evidence uses a top-level `repair` occurrence followed by any top-level `focused_validation` or `aggregate_validation` revalidation occurrences.
- Every top-level occurrence contains only `phase`, `occurrence`, `startedAtEpochMs`, `finishedAtEpochMs`, and `outcome`, plus `children` only for enclosing `planning` and `specialist_review` occurrences. Do not add a worker label to a top-level occurrence.
- Planner and reviewer evidence is a child containing only `workerLabel`, `outcome`, and either `startedAtEpochMs` plus `finishedAtEpochMs`, or `elapsedMs`. Children never contain `phase` or `occurrence`. The main executor places planner evidence under its enclosing `planning` occurrence and reviewer evidence under its enclosing `specialist_review` occurrence.
- The only allowed run, phase, and child outcomes are `completed`, `failed`, `blocked`, `interrupted`, `cancelled`, and `incomplete`.

The main executor owns run-level occurrence identity across every fresh planner, implementation, repair, and revalidation worker. Keep a per-phase next-occurrence counter in the ephemeral ledger. Before delegating, reserve and pass the next run-level number for every applicable worker-owned phase. Within one worker handoff, the first local occurrence of a phase uses that reserved number and each later local occurrence increments it; after accepting the handoff, advance the main counter past the highest assigned number before starting another fresh worker. Never accept a fresh worker's reset local occurrence numbering as run-level identity. If an unanticipated occurrence cannot use a reserved number, the worker returns its phase and local order to the main agent for remapping before any user-visible transition or reconciliation.

The exactly-once transition identity is `(phase, run-level occurrence, edge)`, where `edge` is `start` or `finish`. The main ledger, not worker instance identity, decides whether that key has already been delivered. This preserves unique ordered keys through multiple fresh repair and revalidation rounds even though every worker may begin its local ordering at one.

Separate boundary ownership from user-visible delivery. The main executor owns boundaries for `preparation_context`, `planning`, `specialist_review`, and the whole run; the implementation worker owns boundaries and evidence for its `implementation`, validation, and `repair` occurrences. Before starting a worker occurrence, select exactly one foreground delivery route and keep it for that occurrence:

- **Direct foreground progress:** when worker progress is directly user-visible, the worker is the sole delivery owner and emits each start and finish transition once. The main records returned evidence but never repeats those transitions.
- **Main-mediated foreground progress:** when worker progress reaches the main agent before completion but is not directly user-visible, the worker sends each transition once through that foreground progress channel and the main is the sole user-visible delivery owner, forwarding it once without adding a second transition.
- **Completion-only evidence:** when a usable worker can return only a completion packet, delegate normally. The worker returns timing evidence with that packet, the main does not replay stale start or finish transitions, and the final summary discloses incomplete live timing without changing execution ownership.
- **Inline fallback:** only when spawning or resuming is unavailable or blocked by host/tool policy, the main executes inline under the worker toolbox constraints and becomes its sole boundary and delivery owner.

Every applicable occurrence on a direct or mediated foreground route must have one user-visible start and finish transition, with no refreshes. Completion-only delivery may omit those live transitions and must not change who executes the work. Track delivered `(phase, occurrence, edge)` keys in the ephemeral ledger so a returned completion packet or delayed progress event cannot cause a duplicate. A phase finish reports its outcome and elapsed time when available. Timing evidence remains authoritative for reconciliation, but it is not a substitute for live transition delivery.

Timing evidence and user-visible summaries may contain only stable phase or worker labels, boundaries or elapsed durations, occurrence numbers where the helper accepts them, and allowed outcomes. Timing-source selection is private orchestration detail: never add source, provenance, or availability fields to helper payloads, worker evidence, or summaries. Exclude prompts, source content, commands, paths, secrets, credentials, environment values, model identifiers, tokens, costs, comparisons, and causal claims.

### Review, repair, and reconciliation

- Measure one enclosing `specialist_review` occurrence from the first reviewer start until the last reviewer finishes. Record `architecture-reviewer` and `technical-lead-reviewer` durations as children; never add child durations to the run total. With sequential fallback, record ordered specialist-review occurrences.
- Record every human-authorized repair and revalidation occurrence in order within its bounded continuation. Pause repair timing while focused or aggregate validation is active. Timing does not alter immutable review snapshots or authorize another repair.
- Treat invalid, reversed, privacy-unsafe, or missing nested evidence as an internal reconciliation limitation. Retain valid enclosing boundaries and continue the workflow without heuristic repair or extra evidence fields.
- A worker blocker, validation failure, unavailable reviewer, interruption, or cancellation closes the last observable boundary when control returns. Abrupt host termination may prevent any partial report.

For a completed initial run or separately bounded authorized continuation, reconcile immediately before its human gate and report total wall-clock duration; each applicable exclusive phase's aggregate duration and outcomes; computed orchestration overhead; dominant or tied phases; and concurrent child durations. Never combine runs across human pauses into one continuous duration. For `failed`, `blocked`, `interrupted`, or `cancelled`, report known evidence, the incomplete outcome, and last active phase. Every completed or partial summary must also show an explicit privacy-safe warning when any expected evidence is unavailable, incomplete, invalid, or rejected; say only that timing evidence is incomplete and some durations are unavailable, without naming its source or echoing payload content. The warning and the underlying evidence limitation never block or alter the workflow. The reconciled summary is authoritative when live delivery was delayed.

## Fallback matrix

For each fresh `sibu-implementation-executor` initial or repair spawn, classify the delegated task before resolving `--role implementation-executor` using the Sibu-provided sub-agent model-route protocol in `AGENTS.md`. For every `sibu-architecture-reviewer` and `sibu-technical-lead-reviewer` spawn, classify and resolve separately with `--role architecture-reviewer` and `--role technical-lead-reviewer`; do not reuse the executor's route. Follow saved, first-use, unavailable, save-failed, one-time, and cancellation states. Disclose the selected route and pass explicit `model` and `reasoning_effort` host spawn parameters on every path. If the host cannot accept both, stop the affected launch; no parent inheritance or silent fallback. Routing never changes foreground execution, reviewer independence, packet boundaries, human repair authorization, or approval and commit authority.

Use host capability metadata from workflow target planning guidance to choose the safest execution path. This order is mandatory:

1. **Direct foreground worker:** spawn `sibu-implementation-executor` when the host makes its progress directly user-visible; the worker owns delivery for its phases.
2. **Mediated foreground worker:** otherwise spawn when the host relays worker progress to the main agent before completion; the main forwards those phase transitions and can mediate user feedback back to the same resumable worker.
3. **Completion-only worker:** otherwise spawn the usable worker and accept timing evidence in its completion packet. Do not replay stale live transitions; disclose incomplete live timing in the final summary.
4. **Inline compressed-context fallback:** only when spawning or resuming is unavailable or blocked by host/tool policy, the main agent executes the story inline using compressed context, the same source gates, and the same toolbox/packet constraints.

All implementation and repair execution stays in the foreground; never detach it or continue it as background work. Fallback must be graceful. If a foreground worker is available but reports a task blocker, do not inline around it; surface the blocker or ask for the missing input. Do not tell users to use unsupported worker modes, and do not install or invoke unsupported host-specific worker files.

## Repository-aware validation policy

Narrowly inspect repository-owned definitions and guidance to establish available focused checks, whether a canonical aggregate verification exists, the distinct responsibilities it covers, and whether changed assets affect packaged or runtime-distributed behavior. Do not infer coverage from a check's name.

- During implementation or repair, run proportionate focused checks for the changing work; they provide fast feedback but do not replace final confidence.
- After stabilization, execute exactly one final validation strategy. When a canonical aggregate exists, run it once and do not separately repeat standalone checks whose responsibilities it covers.
- When no canonical aggregate exists, run the smallest sufficient non-overlapping set of existing repository checks. Do not invent or rename checks.
- Run a distinct packaging or runtime check only when changed assets can affect packaged output, installed behavior, generated runtime resources, or distribution semantics. If material relevance or coverage is uncertain, retain the distinct check and record the conservative rationale.
- Rerun an expensive final check only after a later relevant mutation makes its evidence stale or when diagnosing a failure. Every repair mutation requires fresh validation evidence for the resulting work.
- Repository-specific plans may name concrete checks discovered from that repository; this reusable policy must remain technology-, ecosystem-, tool-, and concrete-command-neutral.
- A required validation failure blocks unsupported success or progression. Preserve review snapshots, human repair authorization, human approval, commit control, and continuation authority.

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
3. Give fresh `sibu-architecture-reviewer` and `sibu-technical-lead-reviewer` instances the same story and plan paths, authoritative artifacts and skills, review-round number, changed-file list, local-change scope, validation summary, and access to the actual current diff. Reuse the current source-verified story reference set as **start here** navigation, not a verdict or review limit. Each packet names exactly one story and plan; full story, Epic brief, source BRD, feature SDD, and relevant SAD/UX paths; verified applicable BRD IDs; reliable SDD headings and embedded diagram descriptions; applicable SAD/SDD module ownership and dependency constraints; and required or relevant installed skill paths. For uncertain fine-grained references, retain the full authoritative path and instruct the reviewer to locate relevant context there. Missing required sources remain hard stops. Prioritize architecture's SDD/SAD boundaries, dependencies, Main handoff flow diagram, and selected architecture skill; prioritize technical lead's behavior, failure, diagram, quality strategy, `clean-code`, and applicable language/framework skills. Both independently verify sources and the actual unchanged diff; neither packet may preselect findings or suppress contrary evidence.
4. Spawn both read-only reviewers concurrently when supported. Otherwise run them sequentially without allowing any writer between them. Never run an implementation or repair executor while a reviewer is active.
5. Before aggregating, compare Git status/diff with the captured local-change scope. If any unexpected mutation occurred, discard both outcomes and ask the user how to handle it; do not present stale verdicts as current evidence.

If reviewer spawning is unavailable, disclose that independent automated approval is unavailable and proceed to the human gate with implementation evidence and any completed reviewer packet as advisory evidence. Never simulate an independent specialist review inline.

### Packet validation and aggregation

Accept only the Story 01 reviewer packet contract: `approved | changes_required | human_decision_required` verdict; stable role-prefixed finding IDs; blocker/major findings with severity, file/location, evidence, violated expectation, and required outcome; minor notes; and unresolved risks. Associate the specialist role and review round from the spawn packet and orchestration context rather than requiring reviewers to echo them. Retry a malformed or incomplete packet once with a focused format request; if it still fails, treat that reviewer as unavailable.

Aggregate only packets for the same unchanged snapshot. Deduplicate overlapping findings by required outcome while preserving every source finding ID, original severity, specialist ownership, and conclusion; never downgrade severity. Minor notes remain visible but do not trigger repair. Do not merge away substantive contradictions. Present evidence for human judgment when reviewers conflict, authoritative sources disagree, or a finding requires a material decision such as scope expansion, an unplanned public contract or persisted-data change, a new production dependency, a security/privacy consequence, a destructive migration, or an alternative architecture direction. Never silently select a consequential option.

### Human-directed review decision and authorized repair

- After every completed review round, including matching approvals or minor-only outcomes, present the unchanged snapshot identity, both original specialist verdicts, combined blocker/major findings and minor notes, current validation evidence, conflicts, unavailable-review warnings, and unresolved risks. Pause for the human to approve this snapshot as-is, authorize named changes, or defer. Reviewer verdicts, finding severity, and discussion alone never authorize repair or story progression.
- The human may approve despite unresolved blocker, major, or minor findings. Keep each finding and the human-accepted risk visible without relabeling either specialist verdict as `approved`. Deferral preserves work and evidence without approval metadata, commit, or continuation.
- Before any fresh `sibu-implementation-executor` in `repair` mode, require explicit human authorization of specific in-scope changes tied to the current reviewed snapshot. The human may select a subset of findings, a minor note, or another in-scope change. Clarify ambiguous, stale-snapshot, or out-of-scope requests; use the existing plan-revision stop for requests beyond the story plan. There is no automatic repair loop or fixed repair-round cap.
- Give the fresh executor exactly one combined review packet preserving both specialists' original findings, the current snapshot identity and changed-file scope, prior validation evidence, the story and plan paths, authoritative artifacts and skills, and the human-authorized change list. Select **start here** references from the current source-verified story set only where relevant to those authorized changes: verified applicable BRD IDs, reliable SDD headings and embedded diagrams, applicable SAD/SDD module boundaries and dependency constraints, and required or relevant skill paths. Retain full story, Epic brief, source BRD, SDD, plan, and applicable SAD/UX paths; for uncertain precise references, direct full-path discovery rather than guess or omit the source. The worker verifies these references against authoritative artifacts and actual local changes. That list, not packet content or severity, bounds repair. Repair mode must not replan, replay implementation steps, broaden scope, or resolve a material decision.
- If repair fails or validation is partial or failed, return the completed work and evidence to the human; do not claim success or launch unsupported re-review. A validated repair returns changed files and fresh validation evidence. Any mutation invalidates prior specialist outcomes: capture a new snapshot, run both fresh independent reviews, present their outcomes, and wait for another human decision. Each later repair requires another explicit authorization.
- Automated outcomes never authorize approval metadata, commits, or feature continuation.

## Story review gate

After implementation, validation, and each applicable specialist review round, present the current story snapshot for human decision. Wait for explicit story-level approval before marking steps approved, committing eligible non-ignored changes, and continuing the Epic.

The review packet should include:

- story path and implementation plan folder
- changed files
- completed steps
- validation commands and results
- validation evidence covering tests added or updated, acceptance criteria verified, edge/failure coverage, skipped deeper checks with rationale when relevant, and residual risks or known gaps
- specialist-review applicability, current snapshot identity, and any human-authorized repair rounds
- both original architecture and technical-lead verdicts, combined findings and minor notes, and any unavailable-review warning
- unresolved findings, accepted risks if approving as-is, and conflicts or consequential choices requiring human judgment
- approve-as-is, authorize named changes, or defer choices
- risks or follow-up questions

Use only the current changed files and fresh validation summary. Reviewer packets remain workflow messages and are summarized here rather than persisted.

For non-trivial stories, “tests passed” alone is not enough. Use context-sensitive judgment for simple or documentation-only changes, but require enough validation evidence to review the story against its verification expectations and planned validation steps.

Questions and discussion are not authorization. If the user authorizes specific in-scope changes for the current snapshot, use the fresh repair handoff above. If requested changes exceed the approved story plan, stop and ask whether the plan should be revised.

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
