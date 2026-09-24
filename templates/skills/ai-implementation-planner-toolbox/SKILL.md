---
name: ai-implementation-planner-toolbox
description: Worker-only operating rules for Sibu implementation planner sub-agents that create one story-local implementation plan.
---

# AI Implementation Planner Toolbox

## Response style

Keep conversational responses short and answer only what was asked. Do not add adjacent advice, alternatives, or background unless needed for correctness, safety, required discovery, artifact quality, validation, blockers, or an explicit user request. This does not weaken any required interviews, hard stops, output formats, final response rules, or review/approval gates in this skill.

This toolbox is for `sibu-implementation-planner` workers only. It is not a normal user-invoked skill.

## Focused worker routing

{{PLANNER_WORKER_ROUTING}}

## Worker packet contract

Use only the narrow packet from the main agent. The packet must include:

- exactly one User Story path
- required source artifact paths: Epic brief, BRD, software design with embedded diagrams, and UX spec when the story or feature has UI impact
- this toolbox skill path
- selected architecture skill path and distilled architecture constraints
- required skill paths, including `clean-code`
- optional installed skill paths relevant to the story
- distilled skill constraints that are binding for this planning task
- story verification expectations and any software design quality strategy context needed to plan validation steps
- expected final output format

If the packet names multiple stories, an Epic without one story, a feature without one story, or no story, stop and ask the main agent for exactly one User Story path.

If selected architecture guidance is missing from the packet or unavailable to read, stop and tell the main agent to direct the user to run `sibu sync`; do not choose, infer, or substitute architecture guidance.

If a required source artifact or required skill path is missing, stop and report the blocker. Do not invent scope from partial context. Read the SDD with its embedded diagrams.

For BRD and SDD context in the planner packet, read its verified **start here** IDs, sections, and diagrams first. The packet is navigation, not source authority or proof that omitted requirements are irrelevant. If references are uncertain, locate relevant context in the supplied full source path. Expand to wider sections or complete artifacts when story breadth, missing context, contradictions, validation planning, or quality requires it; there is no fixed context ceiling or prohibition on full reads. The authoritative BRD, SDD, SAD, and skills win over packet summaries. Surface material omissions or conflicts to the main agent under existing blocker rules, and plan the entire assigned story and its verification expectations.

## Planning rules

- Read the story and required source artifacts before writing step files. Read its embedded diagrams.
- Read required skills, the selected architecture skill, and relevant optional installed skills from the packet before writing step files.
- Inspect repository files narrowly, only enough to make the plan executable and identify likely touched source files that are large, near 500 lines, or at risk of exceeding the limit.
- Preserve story scope, acceptance criteria, `sdd.md` as the authoritative software design artifact, selected architecture constraints, and UX constraints when applicable. Treat embedded diagrams as authoritative SDD context and preserve diagram-stated boundaries, flows, and data/state implications.
- Apply selected architecture guidance to story-local implementation step ordering, boundaries, dependency direction, and reviewable constraints. Under command-pattern guidance, plan command/result and handler/domain validation before adapter or transport validation unless the story context clearly requires a different order.
- Translate verification expectations and the technical-design quality strategy into concrete validation steps near the work they prove; do not rely on only a generic final test command.
- For code-changing stories, include `node .agents/scripts/check-touched-source-file-lines.mjs` in validation expectations and require pass/fail evidence for the touched source-file size gate.
- When likely touched source files are large, near 500 lines, already over the limit, or likely to exceed it, plan explicit cohesive refactoring steps or Done conditions before final file-size validation.
- Use context-sensitive validation vocabulary: unit, acceptance/integration, edge/failure, regression, and deeper property/invariant, torture/fuzz, mutation, or manual QA checks when story risk justifies them. Include a short skip rationale and residual risks when a relevant deeper check is omitted.
- Create ordered story-local implementation step files under `<story-slug>.impl_plan/*.md`.
- Never write production code, tests, templates, or unrelated documentation.
- Never create or change product vision, Software Architecture Document, BRD, software design, UX, Epic, or User Story artifacts.
- If an optional relevant skill is absent and the story involves an unmapped language, framework, database, or architecture pattern, continue only when safe and flag it as a plan risk.

## Repository-aware validation policy

Before writing validation steps, narrowly inspect repository-owned definitions and guidance to establish available focused checks, whether a canonical aggregate verification exists, the distinct responsibilities it covers, and whether anticipated changed assets affect packaged or runtime-distributed behavior. Do not infer coverage from a check's name.

- Place proportionate focused checks beside the changing work they support; they provide fast feedback but do not replace final confidence.
- Define exactly one final validation strategy after stabilization. When a canonical aggregate exists, select it once and omit standalone checks whose responsibilities it already covers.
- When no canonical aggregate exists, select the smallest sufficient non-overlapping set of existing repository checks. Do not invent or rename checks.
- Include a distinct packaging or runtime check only when changed assets can affect packaged output, installed behavior, generated runtime resources, or distribution semantics. If material relevance or coverage is uncertain, retain the distinct check and record the conservative rationale.
- Generated repository-specific plans may record concrete checks discovered from that repository; this reusable policy must remain technology-, ecosystem-, tool-, and concrete-command-neutral.
- Preserve failure handling and all review, repair, approval, commit, and continuation controls.

## Step file format

Every step file must use this exact section structure:

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
- <Validation evidence this step should create, such as unit, acceptance/integration, edge/failure, regression, or justified deeper-check coverage>
```

Each step's Done conditions should identify the confidence created by that step. Keep validation proportional: use deeper property/invariant, torture/fuzz, mutation, or manual QA checks only when the risk profile justifies them, and explain relevant skips briefly instead of adding test-theater.

## Final result

Return a compact planning result with:

- story path
- implementation plan folder
- step files created or updated
- source artifacts and skills used
- plan risks or blockers, if any

## BRD handoff

Preserve source BRD IDs carried by the story and software design in implementation steps and validation. Worker packets must carry the source BRD path and applicable IDs, not copy the full requirement catalog or broaden worker authority.

Use `docs/features/<feature-slug>/brd.md` as the business source. Qualify references with that source path and verify IDs resolve to its entries. Surface missing, invalid, or conflicting references for focused clarification; do not invent requirements or claim unsupported coverage.

Require sufficient BRD context, not approval fields, signatures, draft/approved status, or a sign-off ceremony. A user request selects the next stage; do not automatically execute later stages. Missing or conflicting decisions still require clarification. Preserve stage prerequisites, required UX, code-change permissions, and story-level implementation review.
