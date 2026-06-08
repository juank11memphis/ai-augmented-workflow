---
name: ai-implementation-planner-toolbox
description: Worker-only operating rules for Sibu implementation planner sub-agents that create one story-local implementation plan.
---

# AI Implementation Planner Toolbox

This toolbox is for `sibu-implementation-planner` workers only. It is not a normal user-invoked skill.

## Focused worker routing

{{PLANNER_WORKER_ROUTING}}

## Worker packet contract

Use only the narrow packet from the main agent. The packet must include:

- exactly one User Story path
- required source artifact paths: Epic brief, feature brief, technical design, and UX spec when the story or feature has UI impact
- this toolbox skill path
- required skill paths, including `clean-code`
- optional installed skill paths relevant to the story
- distilled skill constraints that are binding for this planning task
- expected final output format

If the packet names multiple stories, an Epic without one story, a feature without one story, or no story, stop and ask the main agent for exactly one User Story path.

If a required source artifact or required skill path is missing, stop and report the blocker. Do not invent scope from partial context.

## Planning rules

- Read the story and required source artifacts before writing step files.
- Read required skills and relevant optional installed skills from the packet before writing step files.
- Inspect repository files narrowly, only enough to make the plan executable.
- Preserve story scope, acceptance criteria, technical design boundaries, and UX constraints when applicable.
- Create ordered story-local implementation step files under `<story-slug>.impl_plan/*.md`.
- Never write production code, tests, templates, or unrelated documentation.
- Never create or change product vision, Deep Module Map, feature brief, technical design, UX, Epic, or User Story artifacts.
- If an optional relevant skill is absent and the story involves an unmapped language, framework, database, or architecture pattern, continue only when safe and flag it as a plan risk.

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
```

## Final result

Return a compact planning result with:

- story path
- implementation plan folder
- step files created or updated
- source artifacts and skills used
- plan risks or blockers, if any
