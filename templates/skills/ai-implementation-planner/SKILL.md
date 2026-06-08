---
name: ai-implementation-planner
description: Gatekeep and route one approved User Story into story-local implementation step files, preferring a fresh-context Sibu planner worker when supported.
---

# AI Implementation Planner

## Purpose

Route exactly one approved User Story into a valid story-local implementation plan. This skill is the main-agent gatekeeper for planning: it verifies the story, required source artifacts, UX requirements when relevant, and skill context before planning work begins. When the host supports foreground workers, delegate detailed plan creation to the `sibu-implementation-planner` worker using a narrow packet and the planner toolbox. When no compatible worker is available, use the inline fallback rules in this skill.

This planner is normally an internal helper for `ai-implementation-plan-executor`; after a valid plan exists, implementation must continue immediately through the executor unless the user explicitly requested planning-only.

## Pipeline Contract

### What this skill needs

- Exactly one User Story file at `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md`.
- The story's `epic_brief.md`.
- The feature's `feature_brief.md`.
- The feature's `technical_design.md`.
- `docs/features/<feature-slug>/ux.md` only when the story or feature has UI impact.
- The planner toolbox skill at `.agents/skills/ai-implementation-planner-toolbox/SKILL.md` when worker delegation is available.
- Required and relevant installed skill paths for the planner packet, including `clean-code`.

### What this skill writes

- Story-local implementation step files under `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/*.md`, either through the planner worker or inline fallback.

### When this skill stops

- The user does not provide or clearly identify exactly one User Story file.
- Any required source artifact is missing, incomplete, or invalid in a way its owning stage should repair.
- The story or feature has UI impact and `ux.md` is missing; direct the user to `ux-expert`.
- The request belongs to another pipeline stage, such as writing production code, executing an existing implementation plan, creating stories, or performing another pipeline stage.
- Worker delegation is requested but required worker packet context cannot be assembled.

### What this skill must not do

- Do not create or update product visions, Deep Module Maps, feature briefs, technical designs, UX specs, Epics, User Stories, or production code.
- Do not modify prior-stage artifacts.
- Do not reread `docs/deep-module-map.md` by default; trust `technical_design.md` for Deep Module implementation boundaries.
- Do not infer implementation scope from an Epic brief, feature brief, or technical design without exactly one User Story.
- Do not ask for a plan-approval gate before executor handoff unless the user explicitly requested planning-only.

## Required input

The user must provide or clearly identify exactly one User Story file:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
```

Do not create an implementation plan from a vague request, Epic brief, feature brief, or technical design alone.

## Required source context gate

Before delegating or planning inline, verify these paths exist and are coherent:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
docs/features/<feature-slug>/epics/<epic-slug>/epic_brief.md
docs/features/<feature-slug>/feature_brief.md
docs/features/<feature-slug>/technical_design.md
docs/features/<feature-slug>/ux.md  # when the story or feature has UI impact
```

Also read `docs/product-vision.md` only when product fit, target user, scope boundaries, or success signals are ambiguous.

If the story or feature has UI impact and `docs/features/<feature-slug>/ux.md` is missing, stop and ask the user to create the UX spec with `ux-expert` before implementation planning.

If the technical design is missing, stop and ask the user to create it with `technical-design-writer`. Do not delegate incomplete planning work to the worker.

When the feature brief or technical design includes Deep Module guidance, treat it as required planning context. Deep Modules answer “where does this implementation work belong?” Implementation steps must preserve approved module boundaries.

## Worker-first planning path

When the host supports foreground Sibu workers and `sibu-implementation-planner` is available, prefer worker delegation.

Build a narrow planner packet for the worker. The packet must include:

- exactly one User Story path
- Epic brief, feature brief, technical design, and UX path when relevant
- planner toolbox path: `.agents/skills/ai-implementation-planner-toolbox/SKILL.md`
- required skill paths, always including `.agents/skills/clean-code/SKILL.md`
- relevant optional installed skill paths only when applicable, such as TypeScript, React, Next.js, UX Expert, Command Pattern, DDD/Hexagonal, Layered Architecture, PostgreSQL Expert, or AI Prompt Engineer Master
- distilled skill constraints, such as “create only `.impl_plan/*.md` files,” “do not write production code,” “inspect narrowly,” and any story-specific architecture or UX constraints
- expected output format: plan folder, ordered step files created or updated, source artifacts and skills used, and risks/blockers

Do not include exporter skills such as `export-to-github` or `export-to-notion` in the planner packet.

The worker must use only the packet, the toolbox, listed skill files, source artifacts, and narrow repo inspection required for the story. Do not pass the full main conversation context.

After the worker returns, verify that a valid story-local `.impl_plan/` exists with ordered `.md` step files for exactly that story. If it does not, repair through the worker when possible or use inline fallback.

## Inline fallback planning path

Use inline fallback only when a compatible foreground planner worker is unavailable or fails in a way that can be safely handled without changing story scope.

Before writing step files inline, read and apply:

- `clean-code` always
- relevant installed language skills such as `typescript` for `.ts` or `.tsx` work
- relevant installed framework skills such as `react` or `nextjs`
- relevant installed architecture skills such as `command-pattern`, `ddd-hexagonal`, or `layered-architecture`
- relevant installed database skills such as `postgresql-expert`
- `ux-expert` only when UI/UX implementation planning is in scope and the skill is installed
- `ai-prompt-engineer-master` when prompt, agent, or reusable AI instruction templates are in scope

If a required skill path is missing, stop and report the blocker. If an optional relevant skill is not installed and the story involves an unmapped language, framework, database, or architecture pattern, continue only when safe and flag the gap as a plan risk.

## Output location

Write one Markdown file per implementation step under a story-local implementation plan folder:

```txt
docs/features/<feature_slug>/epics/<epic_slug>/stories/<order>-<story_slug>.impl_plan/<step_order>-<step_slug>.md
```

Use the source story filename, without its `.md` extension, as the implementation plan folder name plus `.impl_plan`.

## Step file contract

Every step file must use this structure:

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

Step files must be concrete, scoped, validation-oriented, and small enough for one AI coding pass. They must not include prerequisite reading, generic review tasks, or implementation scope absent from the story, Epic, feature brief, or technical design.

## Plan quality gate

Before considering planning complete, verify:

- the step files are for exactly one User Story
- every acceptance criterion maps to at least one step file
- every step names the file, module, command, or artifact to change when known
- validation is explicit enough to prove the story is complete
- the plan preserves approved Deep Module, architecture, and UX boundaries
- the plan does not add product or implementation scope beyond the source artifacts

## Continue or report

After writing and quality-checking the implementation step files, do not ask for plan approval before execution. Unless the user explicitly requested planning-only, immediately hand off to `ai-implementation-plan-executor` for the newly created plan in the same turn. The user's story or Epic planning/execution request plus a valid generated plan is enough pre-implementation confirmation; the only required user approval is the story-level review after execution finishes.

If the user explicitly asked for planning-only, said not to implement, or asked to create the plan without execution, stop after creating the plan and report:

- the source User Story path
- the implementation plan folder path
- the ordered step files created
- assumptions, risks, or validation commands worth noting
- that no separate plan approval is required before a later executor run

Do not paste step-file bodies, excerpts, outlines, task text, done conditions, or section summaries unless the user explicitly asks for inline review.
