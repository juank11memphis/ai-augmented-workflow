---
name: ai-implementation-plan-executor
description: Gatekeep and route one Sibu story implementation plan through sub-agent execution, review, approval metadata, commit, and feature continuation.
---

# AI Implementation Plan Executor

## Purpose

Execute one story implementation plan completely while preserving Sibu's human review and workflow-control guarantees. This skill is the main-agent gatekeeper for execution: it verifies the story or plan, creates a missing plan through `ai-implementation-planner`, checks required source artifacts, requires sub-agent execution whenever spawning is available, and keeps final approval metadata, commit, and feature continuation under main-agent control.

When a compatible sub-agent spawn capability is available and permitted by the host, always delegate bounded file editing and validation to `sibu-implementation-executor` using a narrow packet and the executor toolbox. Execute inline only when sub-agent spawning is unavailable or blocked by host capability limits. Do not skip the final story-level review gate.

## Pipeline Contract

### What this skill needs

- Exactly one User Story file or one story-local `.impl_plan/` folder.
- Ordered implementation step files in that `.impl_plan/` folder, creating them through the planner route when missing.
- The story, Epic brief, feature brief, and technical design for the selected plan.
- `docs/features/<feature-slug>/ux.md` only when the story, any step, or feature has UI impact.
- The executor toolbox skill at `.agents/skills/ai-implementation-executor-toolbox/SKILL.md` when sub-agent spawning is available.
- Required and relevant installed skill paths for the executor packet, including `clean-code`.

### What this skill writes

- Code, docs, tests, or other repo changes required by all unapproved implementation steps in the story plan, either through the executor worker or inline fallback.
- Step approval metadata only after explicit story-level user approval.
- One focused commit for approved eligible changes after explicit story-level user approval.
- Missing story-local implementation step files by routing through `ai-implementation-planner`, then immediately continuing into execution.

### When this skill stops

- The user does not provide or clearly identify exactly one User Story file or `.impl_plan/` folder.
- Any required source artifact is missing, incomplete, or invalid in a way its owning stage should repair.
- The story, any step, or feature has UI impact and `ux.md` is missing; direct the user to `ux-expert`.
- Validation fails and the fix is ambiguous, risky, or would exceed the approved plan.
- A step conflicts with the story, Epic, feature brief, technical design, UX spec, or approved Deep Module boundaries.

### What this skill must not do

- Do not create product visions, Deep Module Maps, feature briefs, technical designs, UX specs, Epics, or User Stories.
- Do not modify prior-stage artifacts except for approval metadata in implementation step files after explicit story-level approval.
- Do not reread `docs/deep-module-map.md` by default; trust `technical_design.md` for Deep Module implementation boundaries.
- Do not mark any step approved before explicit story-level user approval.
- Do not commit story implementation changes before explicit story-level user approval.
- Do not let the executor worker write approval metadata or run `git commit`, `git stash`, or `git reset`.

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
docs/features/<feature-slug>/feature_brief.md
docs/features/<feature-slug>/technical_design.md
docs/features/<feature-slug>/ux.md  # when the story, any step, or feature has UI impact
```

If the initial User Story has no matching `.impl_plan/`, or the initial `.impl_plan/` folder is missing, empty, or has no ordered `.md` step files, route through `ai-implementation-planner` to create or repair the story-local plan, then immediately continue into execution without a plan-review gate.

If required source context is missing, stop and ask the user to create or restore the missing artifact first. Do not delegate incomplete execution work to the worker.

## Required sub-agent execution path

When the host exposes any usable sub-agent spawn capability and `sibu-implementation-executor` is available, spawn that worker. Treat a user request to plan, implement, execute, continue, or work through a Sibu User Story or Epic as authorization to use the Sibu executor worker, subject to host tool policy. Do not choose inline execution merely because it is simpler or faster.

Build a narrow executor packet for the worker. The packet must include:

- exactly one User Story path or story-local `.impl_plan/` folder
- story, Epic brief, feature brief, technical design, and UX path when relevant
- executor toolbox path: `.agents/skills/ai-implementation-executor-toolbox/SKILL.md`
- required skill paths, always including `.agents/skills/clean-code/SKILL.md`
- relevant optional installed skill paths only when applicable, such as TypeScript, React, Next.js, UX Expert, Command Pattern, DDD/Hexagonal, Layered Architecture, PostgreSQL Expert, or AI Prompt Engineer Master
- distilled skill constraints, including story scope, validation expectations, Deep Module boundaries, UX constraints when relevant, and “do not write approval metadata or run git commit/stash/reset”
- approval and commit rules: the worker may edit the working tree and run validation, but final approval metadata and commit execution remain with the main agent after explicit user approval
- expected output format: changed files, completed steps, validation commands/results, risks, follow-up questions, and approval state

Do not include exporter skills such as `export-to-github` or `export-to-notion` in the executor packet.

The worker must use only the packet, the toolbox, listed skill files, source artifacts, and narrow repo inspection required for the story. Do not pass the full main conversation context.

## Fallback matrix

Use host capability metadata from workflow target planning guidance to choose the safest execution path. This order is mandatory:

1. **Sub-agent worker:** spawn `sibu-implementation-executor` when any compatible sub-agent capability is available.
2. **Mediated feedback:** if direct foreground review is unavailable but the spawned worker is resumable, the main agent mediates user feedback back to the same worker.
3. **Inline compressed-context fallback:** only if spawning/resuming the worker is unavailable or host/tool policy blocks it, the main agent executes the story inline using compressed context, the same source gates, and the same toolbox/packet constraints.

Fallback must be graceful. If spawning is available but the worker reports a task blocker, do not inline around it; surface the blocker or ask for the missing input. Do not tell users to use unsupported worker modes, and do not install or invoke unsupported host-specific worker files.

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
5. After the final unapproved step is implemented and validated, present the story review packet and wait for explicit story-level approval.

Do not mark steps approved, commit changes, move to the next story, or move to the next Epic until the user explicitly approves the completed story implementation.

## Story review gate

After implementation and validation, report that the full story implementation is ready for review and that you are waiting for story-level approval before marking steps approved, committing eligible non-ignored changes, and continuing the Epic.

The review packet should include:

- story path and implementation plan folder
- changed files
- completed steps
- validation commands and results
- risks or follow-up questions

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
- notable risks or follow-up questions, if any
- that you are waiting for story approval before marking steps approved, committing eligible non-ignored changes, and continuing

After approving and committing a story implementation, briefly report the commit hash or why no commit was created, then continue to the next story/Epic according to the feature continuation check.
