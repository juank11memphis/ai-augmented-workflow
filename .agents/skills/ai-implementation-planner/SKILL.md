---
name: ai-implementation-planner
description: Turn one approved User Story Markdown file into an LLM-sized implementation checklist. Use when asked to create an implementation plan, coding checklist, step-by-step execution plan, or baby-step plan for completing a specific User Story from docs/features/<feature-slug>/epics/<epic-slug>/stories/.
---

# AI Implementation Planner

## Purpose

Turn one approved User Story into a concrete Markdown checklist of small implementation steps an AI coding agent can execute to complete the story safely and completely.

This skill owns implementation planning for one story at a time. It does not own product scope, technical design decisions, Scrum planning, or code implementation.

## Required input

The user must provide or clearly identify exactly one User Story file:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
```

Do not create an implementation plan from a vague request, Epic brief, feature brief, or technical design alone.

## Required source context

Before planning, read:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
docs/features/<feature-slug>/epics/<epic-slug>/epic_brief.md
docs/features/<feature-slug>/feature_brief.md
docs/features/<feature-slug>/technical_design.md
```

Also read `docs/product-vision.md` when product fit, target user, scope boundaries, or success signals are ambiguous.

Inspect existing code, tests, scripts, and docs only as much as needed to make the checklist concrete. Avoid broad codebase analysis.

## Skill dependencies

Always apply:

- `clean-code`

Also apply any selected skills that are relevant to the story, including:

- the selected architecture skill, such as `command-pattern` or `ddd-hexagonal`
- language skills, such as `typescript`
- framework skills, such as `react` or `nextjs`

Use those skills to shape checklist steps. Do not copy their full guidance into the plan.

## Hard start rule

If the User Story file is missing or unclear:

1. Stop.
2. Ask the user for the exact User Story file path.
3. Do not infer the story from nearby files.

If any required source context file is missing:

1. Stop.
2. Say which file is missing.
3. Ask the user to create or restore the missing artifact first.
4. Do not invent implementation scope from partial context.

## Output location

Write the implementation plan next to the source story:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.implementation_plan.md
```

Examples:

```txt
stories/01-resolve-a-selectable-skill-by-name.md
stories/01-resolve-a-selectable-skill-by-name.implementation_plan.md
```

## Planning rules

Create a pragmatic checklist, not a second technical design.

Each checklist item must be a concrete implementation step, not a discovery, scope-confirmation, or generic review step. The skill performs source reading and targeted inspection before writing the plan; the checklist tells the AI what to change, where to change it, how to implement it at a high level, and how to know that step is done.

Do:

- preserve the User Story scope and acceptance criteria
- sequence concrete implementation, test, validation, and cleanup steps
- map acceptance criteria to checklist steps
- call out dependencies, sequencing constraints, and risk checkpoints
- include test, build, lint, or manual validation commands when known
- include a stop-and-ask step when the implementation would exceed the technical design

Do not:

- write or modify production code
- add product scope absent from the story, Epic, feature brief, or technical design
- duplicate the full technical design
- include prerequisite reading, scope confirmation, or repository inspection as checklist items
- create task noise such as “review the code” without a specific implementation or validation purpose
- prescribe architecture that conflicts with the selected architecture skill or technical design

## Workflow

### 1. Read and bound the story

Identify:

- story title and source path
- target user or contributor
- desired outcome
- in-scope work
- out-of-scope boundaries
- acceptance criteria
- validation expectations

If the story lacks testable acceptance criteria, stop and ask for the User Story to be clarified.

### 2. Read feature and technical context

From the Epic and feature brief, identify delivery boundaries and user value.

From the technical design, identify:

- intended implementation approach
- affected commands, modules, files, adapters, docs, or tests
- known risks or unresolved decisions
- expected validation commands or checks

### 3. Inspect the repository narrowly

Inspect only the files and commands needed to make the checklist actionable. Useful targets include:

- existing feature folders or handlers related to the story
- entrypoints or command wiring mentioned by the technical design
- tests covering similar behavior
- package scripts, build commands, or validation commands
- docs that must be updated by the story

### 4. Write the implementation plan

Use this structure:

```md
# Implementation Plan: <User Story Title>

## Source Story
[<User Story Title>](./<order>-<story-slug>.md)

## Goal
<One short paragraph describing the implementation outcome.>

## Context
- Epic: [<Epic Name>](../epic_brief.md)
- Feature brief: [feature_brief.md](../../../feature_brief.md)
- Technical design: [technical_design.md](../../../technical_design.md)
- Relevant skills: clean-code, <selected architecture/language/framework skills>

## Implementation Checklist

- [ ] Add or change <specific capability> in `<path>`.
  - Implement by <high-level implementation guidance grounded in the technical design>.
  - Use <existing pattern/helper/type/module> where applicable.
  - Done when <specific observable result or local validation>.

- [ ] Wire <specific behavior> through `<path>`.
  - Implement by <high-level implementation guidance>.
  - Keep <relevant architecture or code-quality boundary>.
  - Done when <specific observable result or local validation>.

- [ ] Add or update tests in `<path>`.
  - Cover <specific behavior or acceptance criterion>.
  - Done when `<specific command>` passes.

- [ ] Run final validation.
  - Run `<specific command>`.
  - Done when all story acceptance criteria are satisfied.

## Acceptance Criteria Mapping
- `<Acceptance criterion>` → Checklist items: <item numbers or section names>

## Risks / Stop Conditions
- <Only meaningful risks, unresolved decisions, or cases where the agent should stop and ask.>
```

Adapt headings when useful, but keep the plan easy to execute as a checklist. Use phase headings only when they improve readability; the checkbox items are the actionable baby steps.

### 5. Check plan quality

Before finishing, verify:

- the plan is for exactly one User Story
- every acceptance criterion maps to at least one checklist item
- every checklist item names the file, module, command, or artifact to change when known
- every checklist item explains the high-level implementation approach
- every checklist item has a clear done condition
- validation is explicit enough to prove the story is complete
- the plan does not add scope beyond the source artifacts
- architecture and code-quality steps align with the relevant skills

## Final response behavior

After writing the file, briefly report:

- the implementation plan path
- the source User Story path
- any risks or stop conditions captured in the plan

Do not paste the full plan unless the user asks to review it inline.
