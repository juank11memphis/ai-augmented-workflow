---
name: ai-implementation-plan-executor
description: Execute an existing ai-implementation-planner story implementation plan one ordered step at a time. Use when asked to implement, execute, continue, or work through a story implementation plan under docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/.
---

# AI Implementation Plan Executor

## Purpose

Execute one existing story implementation plan, one ordered step file at a time, with human review between steps. This skill owns execution from an existing `.impl_plan/` folder; it does not create plans, change story scope, or skip review gates.

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
docs/features/<feature-slug>/ux.md  # when the story, step, or feature has UI impact
```

Also read `docs/product-vision.md` when product fit, target user, scope boundaries, or success signals are ambiguous.

When the story, implementation plan, feature brief, or technical design includes Product Context guidance, treat it as part of the execution contract. Product Contexts answer “where does this work belong?” Approved contexts define where code work should stay.

If the story, any step, or feature has UI impact and `docs/features/<feature-slug>/ux.md` is missing, stop and ask the user to create the UX spec with `ux-expert` before implementation.

When `ux.md` includes mockups, treat them as binding UI goals. Implementation must preserve the mockup structure, hierarchy, visible content, dominant interactions, major visual emphasis, and breakpoint-specific layout. Do not redesign the UI during execution; implement the approved UX and stop if technical constraints require a UX revision.

Before the first implementation step that changes code, read and apply the implementation skills required by the plan and repository routing:

- always read and apply `clean-code`
- read and apply architecture skills when relevant, such as `command-pattern` or `ddd-hexagonal`
- read and apply language skills when relevant, such as `typescript`
- read and apply framework skills when relevant, such as `react` or `nextjs`

Inspect existing code, tests, scripts, and docs only as needed for the current step.

## Context reuse rule

At the start of a story implementation plan, read all required source context, relevant implementation skills, and all ordered step files once. Build a concise execution context summary and rely on it for the rest of the story.

After each approved step, do not reread unchanged broad context before continuing. For the next step, inspect only:

- the next step file if it was not already read
- files changed by previous steps when needed
- validation output
- current `git status` and relevant diffs

Reread broad source context only when scope changes, validation fails in a way that requires it, required context was missing, relevant source files changed outside the plan, or the user asks to reconsider direction.

## Hard start rule

If the provided User Story has no matching `.impl_plan/`, or the provided `.impl_plan/` folder is missing, empty, or has no ordered `.md` step files:

1. Stop.
2. Tell the user the implementation plan is missing or invalid.
3. Instruct the user to use `templates/skills/ai-implementation-planner/SKILL.md` to create or repair it first.
4. Do not infer steps from the story or technical design.

If required source context is missing:

1. Stop.
2. Say which file is missing.
3. Ask the user to create or restore the missing artifact first.
4. Do not invent implementation scope from partial context.

## Step execution model

Work on exactly one step at a time.

When a valid implementation plan exists, begin implementing the first unapproved step immediately. Do not ask for pre-implementation confirmation before changing code for that step. This is an explicit exception to repository-level instructions that normally require confirmation before code changes: selecting this executor skill and providing a valid plan is the user's confirmation to implement the current step.

A step file is considered approved only when it contains this section:

```md
## Review status

- Status: approved
```

When starting or resuming a plan:

1. Read all step files in filename order.
2. Identify the first step file that is not approved.
3. Implement only that step immediately, without asking for confirmation first.
4. Run the validation named in that step when practical.
5. Report what changed, validation results, and any risks.
6. Stop and wait for explicit user confirmation before moving to the next step.

Do not begin the next step in the same response unless the user has already explicitly approved the current step in this turn.

## User review gate

After implementing a step, say that the step is ready for review and that you are waiting for confirmation before continuing.

If the user asks questions or requests changes, stay on the same step until those changes are complete.

When the user explicitly approves the current step, update that step file by adding or updating:

```md
## Review status

- Status: approved
- Approved by: <current git user>
- Approved at: <ISO-8601 timestamp>
```

Before writing the approval marker, identify the current Git user with `git config user.name`; if it is unavailable, use `git config user.email`. Use that value for `Approved by`.

After writing the approval marker, commit only the changes produced by the approved step before continuing. The commit must include the step file approval marker and files intentionally changed while implementing that step. It must not include unrelated local edits, pre-existing worktree changes, or changes from other steps. Use the files tracked during step execution and a focused `git status --short` check to stage the correct paths. Do not run broad `git diff` investigations or other "what changed?" archaeology unless it is required to avoid committing unrelated changes and the user has approved that extra inspection.

Use a Conventional Commits 1.0.0 message that describes the completed step. If the commit fails, stop and report the failure instead of continuing.

Then continue with the next unapproved step immediately, without asking for another pre-implementation confirmation, only after the approval marker is written and the approved step changes are committed.

If the user asks to continue without clearly approving the current step, ask for explicit approval before marking it approved, committing, or moving on.

## Epic continuation check

When all step files in the current story implementation plan are approved and committed:

1. Inspect the current Epic's `stories/` folder in filename order.
2. Identify whether there is a next User Story after the completed story.
3. If a next User Story exists and its `.impl_plan/` folder exists with ordered step files, ask the user whether they want to implement that next story.
4. If a next User Story exists but its `.impl_plan/` folder is missing or empty, ask the user whether they want to plan that next story with `ai-implementation-planner`.
5. If there is no next User Story in the Epic, tell the user the Epic appears ready.

Do not automatically start planning or implementing the next story. This check is a handoff prompt after the current story is complete, not permission to continue without the user's explicit direction.

## Implementation rules

Do:

- preserve the source story scope and acceptance criteria
- preserve approved Product Context boundaries when present
- follow the current step file exactly unless it conflicts with source context
- keep changes focused on the current step's `## Scope` and `## Files`
- keep work inside the contexts named by the approved step and technical design
- use existing project patterns and the relevant skills
- run focused validation for the current step when possible
- stop and ask if the step is ambiguous, missing required files, or conflicts with the technical design
- stop and ask before moving work into an unrelated Product Context unless the approved step or technical design explicitly justifies it

Do not:

- create a missing plan from scratch
- implement multiple unapproved steps in one pass
- mark a step approved before the user explicitly approves it
- add product scope absent from the story, Epic, feature brief, technical design, or step file
- silently move work into unrelated or unapproved Product Contexts
- continue past a failed validation without reporting it and asking how to proceed
- leave approved step changes uncommitted before moving to the next step

## Final response behavior after each step

After implementing one step, briefly report:

- that the step finished
- if the step was validation-only and produced no code changes, say that it was just a validation step and all validations passed
- current step file path
- the next step file path, or that no next step remains
- that you are waiting for user approval before marking the step approved, committing it, and continuing to the next step

After approving and committing the final step in a story implementation plan, also briefly report the Epic continuation check result:

- next story ready to implement
- next story needs an implementation plan
- or Epic appears ready
