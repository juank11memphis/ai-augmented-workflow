---
name: ai-implementation-planner
description: Gatekeep and route one approved User Story into story-local implementation step files, requiring a fresh-context Sibu planner sub-agent whenever spawning is available.
---

# AI Implementation Planner

## Response style

Keep conversational responses short and answer only what was asked. Do not add adjacent advice, alternatives, or background unless needed for correctness, safety, required discovery, artifact quality, validation, blockers, or an explicit user request. This does not weaken any required interviews, hard stops, output formats, final response rules, or review/approval gates in this skill.

## Purpose

Route exactly one approved User Story into a valid story-local implementation plan. This skill is the main-agent gatekeeper for planning: it verifies the story, required source artifacts, UX requirements when relevant, and skill context before planning work begins. When a sub-agent spawn capability is available and permitted by the host, always spawn `sibu-implementation-planner` using a narrow packet and the planner toolbox. Use the inline fallback rules only when sub-agent spawning is unavailable or blocked by host capability limits.

This planner is normally an internal helper for `ai-implementation-plan-executor`; after a valid plan exists, implementation must continue immediately through the executor unless the user explicitly requested planning-only.

## Pipeline Contract

### What this skill needs

- Exactly one User Story file at `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md`.
- The story's `epic_brief.md`.
- The feature's `brd.md`.
- The feature's `sdd.md` as the authoritative software design artifact, including any feature-level quality strategy.
- The story's verification expectations and any technical-design quality strategy needed to plan validation steps.
- `docs/features/<feature-slug>/ux.md` only when the story or feature has UI impact.
- The planner toolbox skill at `.agents/skills/ai-implementation-planner-toolbox/SKILL.md` when sub-agent spawning is available.
- Selected architecture guidance for the workflow.
- Required and relevant installed skill paths for the planner packet, including `clean-code`.

### What this skill writes

- Story-local implementation step files under `docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.impl_plan/*.md`, either through the planner worker or inline fallback.

### When this skill stops

- The user does not provide or clearly identify exactly one User Story file.
- Any required source artifact is missing, incomplete, or invalid in a way its owning stage should repair.
- The story or feature has UI impact and `ux.md` is missing; direct the user to `ux-expert`.
- The request belongs to another pipeline stage, such as writing production code, executing an existing implementation plan, creating stories, or performing another pipeline stage.
- Selected architecture guidance is missing, unavailable, or ambiguous; stop and tell the user to run `sibu sync` to repair workflow configuration before implementation planning. Do not choose, infer, or substitute architecture guidance yourself.
- Worker delegation is requested but required worker packet context cannot be assembled.

### What this skill must not do

- Do not create or update product visions, Software Architecture Documents, BRDs, software designs, UX specs, Epics, User Stories, or production code.
- Do not modify prior-stage artifacts.
- Do not reread the full `docs/architecture.md` by default. Trust `sdd.md` for feature-specific Deep Module boundaries; read the relevant SAD section when needed to verify module ownership or dependency constraints before reporting them in a packet.
- Do not infer implementation scope from an Epic brief, BRD, or software design without exactly one User Story.
- Do not ask for a plan-approval gate before executor handoff unless the user explicitly requested planning-only.
- Do not choose or infer architecture guidance when it is missing; selected architecture is repo-owned workflow configuration repaired through `sibu sync`.


## Selected architecture guidance gate

Before delegating or planning inline, identify and read the workflow's selected architecture skill. If selected architecture guidance is missing, unavailable, or ambiguous, hard-stop and tell the user to run `sibu sync` to repair Sibu workflow configuration. Do not choose architecture guidance, infer it from repository structure, or continue with generic architecture assumptions.

When selected architecture guidance is present, treat it as binding planning context. Apply it to story-local implementation step sequencing, boundaries, dependency direction, and reviewable constraints while still trusting `sdd.md` for feature-specific Deep Module boundaries.

## Required input

The user must provide or clearly identify exactly one User Story file:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
```

Do not create an implementation plan from a vague request, Epic brief, BRD, or software design alone.

## Required source context gate

Before delegating or planning inline, verify these paths exist and are coherent:

```txt
docs/features/<feature-slug>/epics/<epic-slug>/stories/<order>-<story-slug>.md
docs/features/<feature-slug>/epics/<epic-slug>/epic_brief.md
docs/features/<feature-slug>/brd.md
docs/features/<feature-slug>/sdd.md
docs/features/<feature-slug>/ux.md  # when the story or feature has UI impact
```

Also read `docs/product-vision.md` only when product fit, target user, scope boundaries, or success signals are ambiguous.

If the story or feature has UI impact and `docs/features/<feature-slug>/ux.md` is missing, stop and ask the user to create the UX spec with `ux-expert` before implementation planning.

If the software design is missing, stop and ask the user to create it with `software-design-writer`. Do not delegate incomplete planning work to the worker.

Read the embedded diagrams in `sdd.md` and preserve their boundaries, flows, data/state implications, and verification-relevant risks. The SDD is authoritative; do not create a separate companion.

When the BRD or software design includes Deep Module guidance, treat it as required planning context. Deep Modules answer “where does this implementation work belong?” Implementation steps must preserve approved module boundaries.

## Story reference selection for planner handoff

For a standalone planner invocation, curate a fresh reference set for the one assigned story before delegation. When the implementation executor invokes this planner for the same story, accept its current source-verified reference set instead of repeating selection; verify again if the story or a material source has changed. Use the story and Epic brief (and existing plan when available) to identify candidate BRD requirement IDs, verify every ID against the full `docs/features/<feature-slug>/brd.md` source, then identify governing headings and embedded diagrams in `docs/features/<feature-slug>/sdd.md` by reading source evidence. Report applicable module ownership and dependency constraints from the SDD, reading the relevant `docs/architecture.md` section when needed to verify SAD-owned boundaries rather than rereading the full SAD by default. Include required or relevant installed skill paths. Use stable IDs, exact headings, or an unambiguous diagram description under its heading—not guessed anchors, line numbers, or keyword matches alone.

The reference set is a **start here** navigation aid, not a substitute for authoritative files or a complete requirement catalog. For any ID, heading, diagram, or boundary that cannot be verified reliably, retain its full source path and instruct the worker to locate relevant context there. Missing required artifacts or selected architecture guidance still hard-stop under the gates above; a fallback path does not waive them.

## Required sub-agent planning path

Before each `sibu-implementation-planner` spawn, classify the delegated planning task before resolving `--role implementation-planner` through the Sibu-provided sub-agent model-route protocol in `AGENTS.md`. Follow its saved, first-use, unavailable, save-failed, one-time, and cancellation branches. Disclose the chosen route and pass both selected `model` and `reasoning_effort` explicitly in the host spawn; no parent inheritance or silent fallback. If the host cannot accept both explicit values, stop this launch. This changes route selection only, not the fresh-context planner packet or inline capability fallback below.

When the host exposes any usable sub-agent spawn capability and `sibu-implementation-planner` is available, spawn that worker. Treat a user request to plan, implement, execute, continue, or work through a Sibu User Story or Epic as authorization to use the Sibu planner worker, subject to host tool policy. Do not choose inline planning merely because it is simpler or faster.

Build a narrow planner packet for the worker. The packet must include:

- exactly one User Story path
- Epic brief, BRD, software design with embedded diagrams, and UX path when relevant
- the source-verified story reference set as targeted starting context: applicable BRD IDs, governing SDD headings and diagram descriptions, and applicable SAD/SDD module ownership and dependency constraints; for uncertain fine-grained references, give the full authoritative path and a locate-relevant-context instruction instead
- story verification expectations and any software design quality strategy context needed to plan validation steps
- planner toolbox path: `.agents/skills/ai-implementation-planner-toolbox/SKILL.md`
- required skill paths, always including `.agents/skills/clean-code/SKILL.md`
- selected architecture skill path as required architecture context
- relevant optional installed skill paths only when applicable, such as TypeScript, React, Next.js, UX Expert, PostgreSQL Expert, or AI Prompt Engineer Master
- distilled skill constraints, such as “create only `.impl_plan/*.md` files,” “read included diagrams and preserve diagram-stated boundaries, flows, and data/state implications without replacing `sdd.md`,” “turn verification expectations into concrete validation steps,” “include short skip rationale for deeper checks when story risk makes the skip relevant,” “do not write production code,” “inspect narrowly,” selected architecture constraints, and any story-specific architecture or UX constraints
- expected output format: plan folder, ordered step files created or updated, source artifacts and skills used, and risks/blockers

Do not include exporter skills such as `export-to-github` or `export-to-notion` in the planner packet.

The worker must use only the packet, the toolbox, listed skill files, source artifacts, and narrow repo inspection required for the story. Do not pass the full main conversation context.

After the worker returns, verify that a valid story-local `.impl_plan/` exists with ordered `.md` step files for exactly that story. If it does not, repair through the same worker when possible. Use inline fallback only when spawning or resuming the worker is unavailable or failed because the host cannot support it.

## Inline fallback planning path

Use inline fallback only when no compatible sub-agent spawn/resume capability is available, the host/tool policy blocks spawning, or the planner worker cannot be reached for capability reasons. If spawning is available but the worker reports a task blocker, do not inline around it; surface the blocker or ask for the missing input.

Before writing step files inline, read and apply:

- `clean-code` always
- relevant installed language skills such as `typescript` for `.ts` or `.tsx` work
- relevant installed framework skills such as `react` or `nextjs`
- the selected installed architecture skill such as `command-pattern`, `ddd-hexagonal`, or `layered-architecture`; if it is missing, stop and direct repair to `sibu sync`
- relevant installed database skills such as `postgresql-expert`
- `ux-expert` only when UI/UX implementation planning is in scope and the skill is installed
- `ai-prompt-engineer-master` when prompt, agent, or reusable AI instruction templates are in scope

If a required skill path is missing, stop and report the blocker. If an optional relevant skill is not installed and the story involves an unmapped language, framework, database, or architecture pattern, continue only when safe and flag the gap as a plan risk.

Inline plans must preserve the same verification expectations given to planner workers. Turn the story's verification expectations and technical-design quality strategy into concrete validation steps, not only a generic final test command. Consider unit, acceptance/integration, edge/failure, and regression checks by default, and property/invariant, torture/fuzz, mutation, or manual QA only when the story risk justifies them. When a deeper check is relevant but omitted, include a short skip rationale and any residual risks.

## Repository-aware validation policy

Before writing validation steps, narrowly inspect repository-owned definitions and guidance to establish available focused checks, whether a canonical aggregate verification exists, the distinct responsibilities it covers, and whether anticipated changed assets affect packaged or runtime-distributed behavior. Do not infer coverage from a check's name.

- Place proportionate focused checks beside the changing work they support; they provide fast feedback but do not replace final confidence.
- Define exactly one final validation strategy after stabilization. When a canonical aggregate exists, select it once and omit standalone checks whose responsibilities it already covers.
- When no canonical aggregate exists, select the smallest sufficient non-overlapping set of existing repository checks. Do not invent or rename checks.
- Include a distinct packaging or runtime check only when changed assets can affect packaged output, installed behavior, generated runtime resources, or distribution semantics. If material relevance or coverage is uncertain, retain the distinct check and record the conservative rationale.
- Generated repository-specific plans may record concrete checks discovered from that repository; this reusable policy must remain technology-, ecosystem-, tool-, and concrete-command-neutral.
- Preserve failure handling and all review, repair, approval, commit, and continuation controls.

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

Step files must be concrete, scoped, validation-oriented, and small enough for one AI coding pass. They must not include prerequisite reading, generic review tasks, or implementation scope absent from the story, Epic, BRD, or software design. Validation steps should sit close to the behavior they prove; under command-pattern guidance, handler/domain validation generally precedes adapter or transport validation. Done conditions should make expected validation evidence and residual risks reviewable.

## Plan quality gate

Before considering planning complete, verify:

- the step files are for exactly one User Story
- every acceptance criterion maps to at least one step file
- every step names the file, module, command, or artifact to change when known
- validation steps are explicit enough to prove the story is complete and reflect the story's verification expectations
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

## BRD handoff

Preserve source BRD IDs carried by the story and software design in implementation steps and validation. Worker packets must carry the source BRD path and applicable IDs, not copy the full requirement catalog or broaden worker authority.

Use `docs/features/<feature-slug>/brd.md` as the business source. Qualify references with that source path and verify IDs resolve to its entries. Surface missing, invalid, or conflicting references for focused clarification; do not invent requirements or claim unsupported coverage.

Require sufficient BRD context, not approval fields, signatures, draft/approved status, or a sign-off ceremony. A user request selects the next stage; do not automatically execute later stages. Missing or conflicting decisions still require clarification. Preserve stage prerequisites, required UX, code-change permissions, and story-level implementation review.
