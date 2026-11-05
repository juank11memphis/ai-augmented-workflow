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

For applicable planned-feature **Feature Decisions**, use packet IDs and exact SDD path/section pointers only to locate the governing SDD record. Read it and compare the named gate, explicit human-approved choice, and scope with current Story work before relying on it. Carry relevant IDs and pointers into Story steps and curated source packets for fresh checked Tasks. When unchanged and matching, do not ask for duplicate approval. If missing, ambiguous, materially changed, or newly required, stop only affected work and identify the decision requiring an explicit human answer and revised SDD record; an edited record alone does not renew approval. Unrelated SDD prose and unrelated valid decisions remain usable. A generic SDD sign-off is not approval. Preserve independent review of changed reviewable plans.

Use only the narrow packet from the main agent. The packet must include:

- exactly one User Story path
- required source artifact paths: Epic brief, BRD, software design with embedded diagrams, and UX spec when the story or feature has UI impact
- this toolbox skill path
- selected architecture skill path and distilled architecture constraints
- required skill paths, including `clean-code`
- optional installed skill paths relevant to the story
- distilled skill constraints that are binding for this planning task
- source-verified, Story-applicable SDD quality-strategy context and Story verification expectations: required methods, coverage (including scenarios, surfaces, states, and relevant UX breakpoints), expected evidence, human-judgment and automation limits, material exclusions, governing SDD heading, and source requirement IDs; omit unrelated feature-wide detail without dropping an applicable constraint
- expected final output format

If the packet names multiple stories, an Epic without one story, a feature without one story, or no story, stop and ask the main agent for exactly one User Story path.

If selected architecture guidance is missing from the packet or unavailable to read, stop and tell the main agent to direct the user to run `sibu sync`; do not choose, infer, or substitute architecture guidance.

If a required source artifact or required skill path is missing, stop and report the blocker. Do not invent scope from partial context. Read the SDD with its embedded diagrams.

For review-driven revision, require the existing plan artifact (or legacy local plan folder), exact reviewed content fingerprint, and complete reviewer finding/risk packet. Verify that identity against the current reviewable plan before editing. Apply the smallest source-aligned fixes to affected Tasks; preserve stable Task IDs, completed Task evidence, and unrelated plan content. Return a finding-to-change account and the revised plan identity for the main agent's fresh review. Do not self-review or approve the plan. Report a blocker instead of choosing a material product, architecture, security, privacy, persisted-data, dependency, or scope decision.

For AFK blocked-check recovery revisions, require the main agent's exact failed check/result and attempted fixes, original blocked Task goal/check/expected evidence/dependencies, bounded repair outcome, earlier committed same-Story Task attribution where relevant, and complete preserved unstaged path and index inventory. A pre-existing failure is repaired only on the active Story branch. Overlap, including pre-existing overlap, revises the **same uncommitted Task** with its original ID, goal, check, evidence, dependencies, prior attempts, and one eventual scoped commit. A path-disjoint pre-existing prerequisite or earlier-Task regression gets an ordered follow-up checked Task with its own executable check, expected evidence, and passing scoped commit before blocked-Task resumption; its paths and commit exclude blocked edits. Return a new exact reviewable identity for fresh independent plan-only review; do not self-approve, invent a runtime layer, weaken checks, or plan speculative source edits for host/test-runner or unresolved attribution. Stop for unsafe ownership, material decision, or non-convergence.

For executor-discovered bounded regression revision, require the existing plan folder, accepted identity, failed check and evidence, attribution to an earlier checked Task in the same Story, blocked Task and preserved-edit inventory. Verify the identity, then add only a bounded follow-up checked Task before the blocked Task with an executable check and expected evidence; update affected ordering and dependencies without rewriting completed Task evidence. Return the changed identity and failure-to-plan account for independent plan-only review. Do not treat the failure report as a reviewer finding or approval, edit implementation code, or choose a material decision.

For overlapping uncommitted Task continuation, require the existing plan folder, accepted identity, exact failed check and evidence, attempted fixes, bounded repair outcome, same Task ID, and inventoried unstaged Task edits. Verify identity and attribution; revise only that Task's instructions to make the smallest source-aligned fix executable. Preserve its outcome, check, expected evidence, dependencies, Task ID, single-commit authority, completed Task evidence, and unrelated scope. Return the changed identity and failure-to-plan account for independent plan-only review. Do not invent a reviewer finding, edit implementation code, or choose a material decision; stop if the failure evidence or edit ownership is ambiguous.

For BRD and SDD context in the planner packet, read its verified **start here** IDs, sections, and diagrams first. The packet is navigation, not source authority or proof that omitted requirements are irrelevant. If references are uncertain, locate relevant context in the supplied full source path. Expand to wider sections or complete artifacts when story breadth, missing context, contradictions, validation planning, or quality requires it; there is no fixed context ceiling or prohibition on full reads. The authoritative BRD, SDD, SAD, and skills win over packet summaries. Surface material omissions or conflicts to the main agent under existing blocker rules, and plan the entire assigned story and its verification expectations.

## Planning rules

- Read the story and required source artifacts before writing step files. Read its embedded diagrams.
- Read required skills, the selected architecture skill, and relevant optional installed skills from the packet before writing step files.
- Inspect repository files narrowly, only enough to make the plan executable and identify likely touched source files that are large, near 500 lines, or at risk of exceeding the limit.
- Preserve story scope, acceptance criteria, `sdd.md` as the authoritative software design artifact, selected architecture constraints, and UX constraints when applicable. Treat embedded diagrams as authoritative SDD context and preserve diagram-stated boundaries, flows, and data/state implications.
- Apply selected architecture guidance to story-local implementation step ordering, boundaries, dependency direction, and reviewable constraints. Under command-pattern guidance, plan command/result and handler/domain validation before adapter or transport validation unless the story context clearly requires a different order.
- Translate verification expectations and the technical-design quality strategy into concrete validation steps near the work they prove; do not rely on only a generic final test command. For each Task check, say whether it establishes objective delivery of a file/configuration/artifact or applies an SDD outcome-verification method, and name expected pass/fail evidence and what the check cannot establish. The final strategy preserves applicable SDD methods, coverage, human limits, and exclusions. Choose an exact repository command or equivalent local check without asking again when it stays within that direction.
- For code-changing work, use `higher-value-testing-guidance` when choosing new tests; an executable Task check does not require a new test.
- Stop affected planning if a required SDD method is infeasible or insufficient, a non-equivalent substitution would replace it, or an in-scope strategic scenario remains uncovered. An intentionally unverified outcome does not need a new behavior test merely because a Task needs an executable check: use an objective deliverable-completion check and keep the behavioral gap explicit. If no objective check can show the required deliverable exists without violating an upstream exclusion, or a material new method, expense, dependency, or human judgment is needed, stop with the smallest engineer decision and request an owner-directed upstream revision. Never silently amend the SDD or introduce routine Task, Milestone, or plan approval.
- Produce at least one Milestone grouped by a reviewable outcome, not a Task-count quota. Treat each ordered step file as one Task so the current executor can still consume `*.md` in filename order. Do not add a Markdown plan header or index file to that glob.
- Give every Task a stable ID, one bounded deliverable, relevant Story acceptance criteria, distilled source decisions, exact optional on-demand pointers, applicable skills, dependencies, known files or area, status, and its own specific executable pass/fail check with expected evidence. Inspect available check definitions enough to know what they prove; a Story-wide generic test instruction or subjective review is not a Task check. A structural/file/distribution check can establish delivery but not live agent behavior or subjective UX quality. Split or clarify an uncheckable Task; flag judgment needed before safe continuation as a human-decision stop. Never mark an unchecked Task executable.
- In the first ordered step file, record a compact Story-plan view: Story ID/path, exact upstream sources and selected architecture, coverage of every Story acceptance criterion by Task and Milestone, ordered Milestone outcomes/Task IDs/evidence, a Task/status list, and durable conventions. Name a story-local non-Markdown progress-log path and its append-only entry shape (Task ID, outcome, actual check result, commit reference when present, blocker, and gotchas). Set up the log only as planning guidance; do not claim execution or commit. Keep plan-review and human-decision fields preparatory; this story does not activate a plan-review gate.
- Inventory flags declared in the Epic and Stories. State `Flags: none` when none are declared; never invent one. For declared flagged Tasks, prescribe executable checks for both flag-off regression and flag-on behavior. Include final removal and a no-reference check only when that removal is declared upstream. Stop planning for clarification if a required flag or removal scope is undeclared.
- For code-changing stories, include `node .agents/scripts/check-touched-source-file-lines.mjs` in validation expectations and require pass/fail evidence for the touched source-file size gate.
- When likely touched source files are large, near 500 lines, already over the limit, or likely to exceed it, plan explicit cohesive refactoring steps or Done conditions before final file-size validation.
- Use context-sensitive validation vocabulary only for methods allowed by the SDD: unit, acceptance/integration, edge/failure, regression, and deeper checks when agreed. Risk may trigger an upstream question, not silent addition of an excluded method. Include a short skip rationale and residual risks when relevant.
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

Every step file must retain this exact section structure so the current executor can read it in filename order. Put Task and Milestone metadata inside these sections; the first step also carries the compact Story-plan view described above:

```md
# Step: <Imperative step title>

## Goal

<One short paragraph describing the implementation outcome for this step.>

## Scope

- Task ID: <stable Story-scoped ID>; Milestone ID: <stable ID>; Status: pending; Depends on: <Task IDs or none>
- Story acceptance criteria: <IDs>; source decisions: <distilled decisions>; on-demand pointers: <exact paths and headings>; applicable skills: <paths>
- <Specific in-scope action or boundary>
- <Specific in-scope action or boundary>
- Do not <explicit out-of-scope boundary when useful>

## Files

- <path/to/file.ext>
- <path/to/test_file.ext>

## Done when

- Task check: `<executable command or assertion>`; pass: <objective condition>; expected evidence: <result or artifact>
- <Specific observable completion condition>
- <Acceptance criterion or technical requirement covered by this step is satisfied>
- <Relevant compile, test, lint, build, or manual validation passes>
- <Validation evidence this step should create, such as unit, acceptance/integration, edge/failure, regression, or justified deeper-check coverage>
```

Treat `## Files` as expected touchpoints, not an exhaustive edit allowlist. Identify the owning module or area in Scope and include known shared types and tests, while allowing the executor to report directly necessary adjacent files there. Omission of an adjacent file alone is not a scope blocker; unrelated modules or material product, architecture, security, privacy, data, or dependency changes still require a decision.

Milestone outcomes and final Story PR review are not substitutes for individual Task checks. Flag subjective decisions needed before safe continuation as human-decision stops; do not mark such a Task executable. Preserve the existing Story-level implementation review, approval, and commit controls; plan-version, review-state, branch, Task-commit, and PR execution belong to later Stories, not this planner-output increment.

Each step's Done conditions should identify the evidence created by that step and distinguish artifact completion from behavioral confidence. Keep validation proportional: use deeper property/invariant, torture/fuzz, mutation, or manual QA checks only when the approved strategy includes them, and explain relevant skips briefly instead of adding test-theater.

## Final result

For GitHub feature work, return transient exact plan content and the identified repository, Story issue, and plan-artifact identities to the main agent. Include stable Milestone/Task IDs, checks, Done-when evidence, dependencies, and a compact ordered Task status checklist for the issue body. The main agent confirms plan publication and readback before review or Task execution; progress is a separate concise append-only issue artifact. Do not write local plan/progress files or treat a status/progress-only update as a changed reviewable plan. Changed plan content requires a fresh independent review.

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
