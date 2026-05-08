---
name: ai-implementation-planner
description: Turn one approved User Story Markdown file into LLM-sized implementation step files, then continue directly into execution when implementation is requested. Use when asked to create an implementation plan, coding checklist, step-by-step execution plan, or baby-step plan for completing a specific User Story from docs/features/<feature-slug>/epics/<epic-slug>/stories/.
---

# AI Implementation Planner

## Purpose

Turn one approved User Story into concrete Markdown step files an AI coding agent can execute safely and completely. This skill owns implementation planning for one story at a time, not product scope, technical design decisions, Scrum planning, or code implementation. After writing the plan, it does not require a separate plan approval gate; implementation may continue immediately through `ai-implementation-plan-executor` when the user requested execution or Epic continuation.

## Pipeline Contract

### What this skill needs

- Exactly one User Story file at `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md`.
- The story's `epic_brief.md`.
- The feature's `feature_brief.md`.
- The feature's `technical_design.md`.
- `docs/features/<feature-slug>/ux.md` only when the story or feature has UI impact.
- Relevant repo files, tests, scripts, and implementation skills needed to make concrete step files.

### What this skill writes

- Story-local implementation step files under `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/*.md`.

### When this skill stops

- The user does not provide or clearly identify exactly one User Story file.
- Any required source artifact is missing, incomplete, or invalid in a way its owning stage should repair.
- The story or feature has UI impact and `ux.md` is missing; direct the user to `ux-expert`.
- The request is to write production code, execute an implementation plan, create stories, or perform another pipeline stage.

### What this skill must not do

- Do not create or update product visions, Deep Module Maps, feature briefs, technical designs, UX specs, Epics, User Stories, or production code.
- Do not modify prior-stage artifacts.
- Do not reread `docs/deep-module-map.md` by default; trust `technical_design.md` for Deep Module implementation boundaries.
- Do not infer implementation scope from an Epic brief, feature brief, or technical design without exactly one User Story.
- Do not write production code directly from this planner; hand off to `ai-implementation-plan-executor` for implementation.

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

When the feature brief or technical design includes Deep Module guidance, treat it as required planning context. Deep Modules answer “where does this implementation work belong?” Implementation steps must preserve approved module boundaries.

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

Create pragmatic implementation step files, not a second technical design. Each step must be concrete—not discovery, scope confirmation, or generic review—and tell the AI what to change, where, at what high level, and how to know it is done.

Do:

- preserve the User Story scope and acceptance criteria
- sequence concrete implementation, test, validation, and cleanup steps across separate step files
- map acceptance criteria to one or more step files
- call out dependencies, sequencing constraints, and risk checkpoints
- include test, build, lint, or manual validation commands when known
- include a stop-and-ask condition when the implementation would exceed the technical design
- keep work inside the approved Deep Modules unless cross-module work is explicit in the source artifacts
- call out cross-module ownership and coordination in the relevant step files

Do not:

- write or modify production code
- add product scope absent from the story, Epic, feature brief, or technical design
- duplicate the full technical design
- include prerequisite reading, scope confirmation, or repository inspection as step files
- create task noise such as “review the code” without a specific implementation or validation purpose
- prescribe architecture that conflicts with the selected architecture skill or technical design
- move work into unrelated or unapproved Deep Modules; add a stop-and-ask condition instead

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

From the Epic and feature brief, identify delivery boundaries, user value, and approved Deep Module ownership when present.

From the technical design, identify:

- intended implementation approach
- Deep Module boundaries, ownership, and any explicit cross-module work
- affected commands, modules, files, adapters, docs, or tests
- known risks or unresolved decisions
- expected validation commands or checks

### 3. Inspect the repository narrowly

Inspect only files and commands needed to make the checklist actionable, such as:

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
- preserve Deep Module boundaries in `Scope`; call out cross-module work explicitly when required
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
- the step files preserve approved Deep Module boundaries and stop before unrelated module movement
- architecture and code-quality steps align with the relevant skills

### 6. Continue or report

After writing and quality-checking the implementation step files, do not ask for plan approval before execution. If the user asked to implement, execute, continue, or work through the story or Epic, immediately hand off to `ai-implementation-plan-executor` for the newly created plan in the same turn. The user's execution request plus a valid generated plan is enough pre-implementation confirmation; the only required user approval is the story-level review after execution finishes.

If the user asked only to create a plan and did not ask for implementation, stop after creating the plan and report where it was written. Make clear that no plan approval is required before a later executor run.

When this skill is invoked as the next-story or next-Epic planning handoff from `ai-implementation-plan-executor`, create the plan and immediately return control to the executor so it can implement that story without a plan-review gate.

The final planning-only response must briefly include:

- the source User Story path
- the implementation plan folder path
- the ordered step files created
- any assumptions, risks, or validation commands worth noting
- that no separate plan approval is required before execution

Do not paste step-file bodies, excerpts, outlines, task text, done conditions, or section summaries. Only include generated step files when the user explicitly asks for inline review in the current request.
