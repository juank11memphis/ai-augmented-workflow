---
name: ai-implementation-planner
description: Turn one approved User Story Markdown file into LLM-sized implementation step files. Use when asked to create an implementation plan, coding checklist, step-by-step execution plan, or baby-step plan for completing a specific User Story from docs/features/<feature-slug>/epics/<epic-slug>/stories/.
---

# AI Implementation Planner

## Purpose

Turn one approved User Story into a set of concrete Markdown step files an AI coding agent can execute to complete the story safely and completely.

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
docs/features/<feature-slug>/ux.md  # when the story or feature has UI impact
```

Also read `docs/product-vision.md` when product fit, target user, scope boundaries, or success signals are ambiguous.

If the story or feature has UI impact and `docs/features/<feature-slug>/ux.md` is missing, stop and ask the user to create the UX spec with `ux-expert` before implementation planning.

When `ux.md` includes mockups, treat them as binding UI goals. Implementation steps must preserve the mockup structure, hierarchy, visible content, dominant interactions, major visual emphasis, and breakpoint-specific layout. Do not redesign the UI in the implementation plan; plan code steps that implement the approved UX and stop if technical constraints require a UX revision.

Before writing the step files, read and apply the required planning skills as source context:

- always read and apply `clean-code`
- read and apply the selected architecture skill when relevant, such as `command-pattern` or `ddd-hexagonal`
- read and apply language skills when relevant, such as `typescript`
- read and apply framework skills when relevant, such as `react` or `nextjs`

Use those skills to shape implementation steps. Do not copy their full guidance into the step files.

Inspect existing code, tests, scripts, and docs only as much as needed to make the step files concrete. Avoid broad codebase analysis.

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

Write one Markdown file per implementation step under a story-local implementation plan folder:

```txt
docs/features/<feature_slug>/epics/<epic_slug>/stories/<order>-<story_slug>.impl_plan/<step_order>-<step_slug>.md
```

Use the source story filename, without its `.md` extension, as the implementation plan folder name plus `.impl_plan`.

Examples:

```txt
stories/01-resolve-a-selectable-skill-by-name.md
stories/01-resolve-a-selectable-skill-by-name.impl_plan/01-add-skill-resolution-domain-step.md
stories/01-resolve-a-selectable-skill-by-name.impl_plan/02-wire-skill-resolution-command-step.md
```

File naming rules:

- use two-digit step order prefixes (`01`, `02`, `03`) unless the repository uses another explicit convention
- use lowercase kebab-case step slugs
- keep each step file focused on exactly one executable implementation step
- use the lowercase `.md` extension exactly as shown
- if the correct story slug, step order, or step slug is unclear, stop and ask before writing files

## Planning rules

Create pragmatic implementation step files, not a second technical design.

Each step file must be a concrete implementation step, not a discovery, scope-confirmation, or generic review step. The skill performs source reading and targeted inspection before writing the step files; each step tells the AI what to change, where to change it, how to implement it at a high level, and how to know that step is done.

Do:

- preserve the User Story scope and acceptance criteria
- sequence concrete implementation, test, validation, and cleanup steps across separate step files
- map acceptance criteria to one or more step files
- call out dependencies, sequencing constraints, and risk checkpoints
- include test, build, lint, or manual validation commands when known
- include a stop-and-ask condition when the implementation would exceed the technical design

Do not:

- write or modify production code
- add product scope absent from the story, Epic, feature brief, or technical design
- duplicate the full technical design
- include prerequisite reading, scope confirmation, or repository inspection as step files
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

### 4. Write the implementation step files

Create one `.md` file per step in the story-local `.impl_plan` folder. Use this structure for every step file:

```md
# Step: <Imperative step title>

## Goal

<One short paragraph describing the implementation outcome for this step.>

## Scope

- <Specific in-scope action or boundary>
- <Specific in-scope action or boundary>
- Do not <explicit out-of-scope boundary when useful>

## Files

- <path/to/file.ext>
- <path/to/test_file.ext>

## Done when

- <Specific observable completion condition>
- <Acceptance criterion or technical requirement covered by this step is satisfied>
- <Relevant compile, test, lint, build, or manual validation passes>
```

Step-file requirements:

- the first line must be `# Step: <Imperative step title>`
- use exactly these Markdown section headings: `## Goal`, `## Scope`, `## Files`, `## Done when`
- keep each step small enough for one AI coding pass
- name every known file, module, command, or artifact to change or validate
- include explicit out-of-scope boundaries in `Scope` when they prevent scope creep
- include validation commands in `Done when` when known
- ensure the full set of step files covers every acceptance criterion

If something required for a concrete step is unclear or missing, do not assume. Stop and ask before proceeding.

### 5. Check plan quality

Before finishing, verify:

- the step files are for exactly one User Story
- every acceptance criterion maps to at least one step file
- every step file names the file, module, command, or artifact to change when known
- every step file explains the high-level implementation goal and scope
- every step file has clear done conditions
- validation is explicit enough to prove the story is complete
- the step files do not add scope beyond the source artifacts
- architecture and code-quality steps align with the relevant skills

## Final response behavior

After writing the files, briefly report:

- the implementation plan folder path
- the step file paths created
- the source User Story path
- any risks or stop conditions captured in the step files

Do not paste the full step files unless the user asks to review them inline.
