---
name: ai-implementation-plan-executor
description: Execute an existing ai-implementation-planner story implementation plan one ordered step at a time. Use when asked to implement, execute, continue, or work through a story implementation plan under docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/.
---

# AI Implementation Plan Executor

## Purpose

Execute one existing story implementation plan, one ordered step file at a time, with human review between steps.

This skill owns implementation execution from an existing `.impl_plan/` folder. It does not create implementation plans, change story scope, or skip user review gates.

## Required source context

The user must provide or clearly identify exactly one User Story or implementation plan folder:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
```

or:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/
```

Before implementing any step, read:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/*.md
docs/features/<feature-slug>/epics/<epic-slug>/epic_brief.md
docs/features/<feature-slug>/feature_brief.md
docs/features/<feature-slug>/technical_design.md
```

Also read `docs/product-vision.md` when product fit, target user, scope boundaries, or success signals are ambiguous.

Before changing code, read and apply the implementation skills required by the plan and repository routing:

- always read and apply `clean-code`
- read and apply architecture skills when relevant, such as `command-pattern` or `ddd-hexagonal`
- read and apply language skills when relevant, such as `typescript`
- read and apply framework skills when relevant, such as `react` or `nextjs`

Inspect existing code, tests, scripts, and docs only as needed for the current step.

## Hard start rule

If the `.impl_plan/` folder does not exist, is empty, or has no ordered `.md` step files:

1. Stop.
2. Tell the user the implementation plan is missing.
3. Instruct the user to use `ai-implementation-planner` to create the implementation plan first.
4. Do not infer steps from the story or technical design.

If required source context is missing:

1. Stop.
2. Say which file is missing.
3. Ask the user to create or restore the missing artifact first.
4. Do not invent implementation scope from partial context.

## Step execution model

Work on exactly one step at a time.

A step file is considered approved only when it contains this section:

```md
## Review status

- Status: approved
```

When starting or resuming a plan:

1. Read all step files in filename order.
2. Identify the first step file that is not approved.
3. Implement only that step.
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

Before writing the approval marker, identify the current Git user with `git config user.name`; if it is unavailable, use `git config user.email`. Use that value for `Approved by`. After writing the approval marker, commit all changes for the approved step before continuing. Use a Conventional Commits 1.0.0 message that describes the completed step. If the commit fails, stop and report the failure instead of continuing.

Then continue with the next unapproved step only after the approval marker is written and the approved step changes are committed.

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
- follow the current step file exactly unless it conflicts with source context
- keep changes focused on the current step's `## Scope` and `## Files`
- use existing project patterns and the relevant skills
- run focused validation for the current step when possible
- stop and ask if the step is ambiguous, missing required files, or conflicts with the technical design

Do not:

- create a missing plan from scratch
- implement multiple unapproved steps in one pass
- mark a step approved before the user explicitly approves it
- add product scope absent from the story, Epic, feature brief, technical design, or step file
- continue past a failed validation without reporting it and asking how to proceed
- leave approved step changes uncommitted before moving to the next step

## Final response behavior after each step

After implementing one step, briefly report:

- current step file path
- summary of changes made
- validation run and result
- any risks, blockers, or follow-up questions
- that you are waiting for user approval before marking the step approved, committing it, and continuing to the next step

After approving and committing the final step in a story implementation plan, also briefly report the Epic continuation check result:

- next story ready to implement
- next story needs an implementation plan
- or Epic appears ready
