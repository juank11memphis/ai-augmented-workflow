---
name: ai-implementation-plan-executor
description: Execute an existing ai-implementation-planner story implementation plan from start to finish, then request story-level review before marking steps approved and committing.
---

# AI Implementation Plan Executor

## Purpose

Execute one existing story implementation plan completely, one ordered step file at a time, with a single human review gate after the full story plan has been implemented. This skill owns execution from an existing `.impl_plan/` folder; it does not change story scope or skip the final story approval gate.

## Pipeline Contract

### What this skill needs

- Exactly one User Story file or one story-local `.impl_plan/` folder to start.
- Ordered implementation step files in that `.impl_plan/` folder.
- The story, Epic brief, feature brief, and technical design for the selected plan.
- `docs/features/<feature-slug>/ux.md` only when the story, any step, or feature has UI impact.
- Relevant repo files, validation output, and implementation skills needed for the story plan.

### What this skill writes

- Code, docs, tests, or other repo changes required by all unapproved implementation steps in the story plan.
- Step approval metadata in every completed step file only after explicit story-level user approval.
- One focused commit for the approved story implementation, excluding any paths ignored by Git.
- When starting or continuing a story that has no plan, story-local implementation step files created by applying `ai-implementation-planner`, followed immediately by implementation.

### When this skill stops

- The user does not provide or clearly identify exactly one User Story file or `.impl_plan/` folder.
- Any required source artifact is missing, incomplete, or invalid in a way its owning stage should repair.
- The story, any step, or feature has UI impact and `ux.md` is missing; direct the user to `ux-expert`.
- Validation fails and the fix is ambiguous, risky, or would exceed the approved plan.
- A step conflicts with the story, Epic, feature brief, technical design, UX spec, or approved Deep Module boundaries.

### What this skill must not do

- Do not create product visions, Deep Module Maps, feature briefs, technical designs, UX specs, Epics, or User Stories.
- Do not modify prior-stage artifacts except for approval metadata in implementation step files.
- Do not reread `docs/deep-module-map.md` by default; trust `technical_design.md` for Deep Module implementation boundaries.
- Do not mark any step approved before explicit story-level user approval.
- Do not commit story implementation changes before explicit story-level user approval.

## Required source context

The user must provide or clearly identify exactly one User Story or implementation plan folder:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
```

or:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/
```

Before starting a story implementation plan, read once:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/*.md
docs/features/<feature-slug>/epics/<epic-slug>/epic_brief.md
docs/features/<feature-slug>/feature_brief.md
docs/features/<feature-slug>/technical_design.md
docs/features/<feature-slug>/ux.md  # when the story, any step, or feature has UI impact
```

Also read `docs/product-vision.md` when product fit, target user, scope boundaries, or success signals are ambiguous.

When the story, implementation plan, feature brief, or technical design includes Deep Module guidance, treat it as part of the execution contract. Deep Modules answer “where does this implementation work belong?” Approved modules define where implementation work should stay.

If the story, any step, or feature has UI impact and `docs/features/<feature-slug>/ux.md` is missing, stop and ask the user to create the UX spec with `ux-expert` before implementation.

When `ux.md` includes mockups, treat them as binding UI goals. Implementation must preserve the mockup structure, hierarchy, visible content, dominant interactions, major visual emphasis, and breakpoint-specific layout. Do not redesign the UI during execution; implement the approved UX and stop if technical constraints require a UX revision.

Before the first implementation step that changes code, read and apply the implementation skills required by the plan and repository routing:

- always read and apply `clean-code`
- read and apply architecture skills when relevant, such as `command-pattern` or `ddd-hexagonal`
- read and apply language skills when relevant, such as `typescript`
- read and apply framework skills when relevant, such as `react` or `nextjs`

Inspect existing code, tests, scripts, and docs only as needed for the story plan and current step.

## Context reuse rule

At the start of a story implementation plan, read all required source context, relevant implementation skills, and all ordered step files once. Build a concise execution context summary and rely on it for the rest of the story.

After each completed step, do not reread unchanged broad context before continuing. For the next step, inspect only:

- the next step file if it was not already read
- files changed by previous steps when needed
- validation output
- current `git status` and relevant diffs

Reread broad source context only when scope changes, validation fails in a way that requires it, required context was missing, relevant source files changed outside the plan, or the user asks to reconsider direction.

## Hard start rule

If the initial User Story has no matching `.impl_plan/`, or the initial `.impl_plan/` folder is missing, empty, or has no ordered `.md` step files:

1. Apply `ai-implementation-planner` to create or repair the story-local implementation plan.
2. Quality-check that the generated plan has ordered step files for exactly that story.
3. Immediately begin executing the generated plan with this executor.
4. Do not ask the user to approve the plan before implementation; the only required approval is the story-level review after implementation finishes.

If required source context is missing:

1. Stop.
2. Say which file is missing.
3. Ask the user to create or restore the missing artifact first.
4. Do not invent implementation scope from partial context.

## Story execution model

Work through the full story plan in filename order, one step at a time, without asking for review or approval between steps.

When a valid implementation plan exists, begin implementing the first unapproved step immediately. If a plan was just generated by `ai-implementation-planner`, begin implementing it immediately. Do not ask for pre-implementation confirmation or plan approval before changing code. This is an explicit exception to repository-level instructions that normally require confirmation before code changes: selecting this executor skill, asking to implement or continue a story/Epic, or providing a valid plan is the user's confirmation to implement the full story plan.

A step file is considered approved only when it contains this section:

```md
## Review status

- Status: approved
```

When starting or resuming a plan:

1. Read all step files in filename order.
2. Identify all step files that are not approved.
3. Implement the unapproved steps in order, exactly one step at a time.
4. Run the validation named in each step when practical before moving to the next step.
5. If a step is validation-only and produces no code changes, record the validation result in the story execution summary and continue.
6. Stop only for ambiguity, missing required files, conflicting scope, failed validation that cannot be safely fixed within the plan, or material risk.
7. After the final unapproved step is implemented, report what changed, validation results, and any risks, then wait for explicit story-level approval.

Do not mark steps approved, commit changes, or move to the next story until the user explicitly approves the completed story implementation.

## Story review gate

After implementing all unapproved steps for a story, say that the full story implementation is ready for review and that you are waiting for story-level approval before marking all completed steps approved, committing, and continuing the Epic.

If the user asks questions or requests changes, keep working within the same story until those changes are complete. If requested changes exceed the approved story plan, stop and ask whether the plan should be revised.

When the user explicitly approves the completed story, update every step file completed in this story by adding or updating:

```md
## Review status

- Status: approved
- Approved by: <current git user>
- Approved at: <ISO-8601 timestamp>
```

Before writing approval markers, identify the current Git user with `git config user.name`; if it is unavailable, use `git config user.email`. Use that value for `Approved by`.

After writing approval markers, commit only the non-ignored changes produced by the approved story before continuing. Do not attempt to stage or commit paths ignored by Git, including `docs/features/**` paths when the repository ignores them. The commit must include files intentionally changed while implementing the story that are eligible to be committed, and it must include step file approval markers only when those step files are not ignored. Ignored approval marker changes remain local and uncommitted; report that clearly. If every story change is ignored and there is nothing eligible to commit, skip the commit, report that no commit was created, and continue only according to the Epic continuation rules that do not depend on a commit hash. The commit must not include unrelated local edits or pre-existing worktree changes. Use the files tracked during story execution, `git check-ignore` when needed, and a focused `git status --short` check to stage the correct paths. Do not run broad `git diff` investigations or other "what changed?" archaeology unless it is required to avoid committing unrelated changes and the user has approved that extra inspection.

Use a Conventional Commits 1.0.0 message that describes the completed story. If the commit fails, stop and report the failure instead of continuing.

## Epic continuation check

After the approved story implementation is committed:

1. Inspect the current Epic's `stories/` folder in filename order.
2. Identify whether there is a next User Story after the completed story.
3. If there is no next User Story in the Epic, tell the user the Epic appears ready and stop.
4. If a next User Story exists and its `.impl_plan/` folder exists with ordered step files, immediately begin implementing that next story plan using this same story execution model.
5. If a next User Story exists but its `.impl_plan/` folder is missing or empty, immediately create the implementation plan for that story by applying `ai-implementation-planner`, then immediately begin implementing the generated plan.

This continuation behavior is an explicit exception to the normal hard-start rule only after a story has been approved and committed. It lets the executor keep an Epic moving while preserving only the story-level review gate after implementation.

## Implementation rules

Do:

- preserve the source story scope and acceptance criteria
- preserve approved Deep Module boundaries when present
- follow each step file exactly unless it conflicts with source context
- keep each step focused on its `## Scope` and `## Files`
- complete all unapproved steps in order before requesting story review
- keep work inside the contexts named by the approved steps and technical design
- use existing project patterns and the relevant skills
- run focused validation for each step when possible
- stop and ask if a step is ambiguous, missing required files, or conflicts with the technical design
- stop and ask before moving work into an unrelated Deep Module unless the approved step or technical design explicitly justifies it

Do not:

- create a missing initial plan from scratch
- mark any step approved before the user explicitly approves the completed story
- commit story implementation changes before story approval
- add product scope absent from the story, Epic, feature brief, technical design, or step files
- silently move work into unrelated or unapproved Deep Modules
- continue past a failed validation without reporting it and asking how to proceed
- leave committable approved story changes uncommitted before moving to the next story
- attempt to stage or commit story files, approval markers, or other paths that are ignored by Git

## Final response behavior

After implementing all unapproved steps in one story, briefly report:

- that the story implementation finished and is ready for review
- the story file path and implementation plan folder
- the steps completed
- validations run and their results
- notable risks or follow-up questions, if any
- that you are waiting for story approval before marking all completed steps approved, committing eligible non-ignored changes, and continuing the Epic

After approving and committing a story implementation, briefly report the commit and the Epic continuation result:

- commit hash when a commit was created, or a note that only ignored changes existed and no commit was created
- next story is being implemented immediately because it already has a plan
- next story was planned and implementation started immediately
- or the Epic appears ready
