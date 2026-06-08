---
name: ai-implementation-planner-toolbox
description: Worker-only operating rules for Sibu implementation planner sub-agents that create one story-local implementation plan.
---

# AI Implementation Planner Toolbox

This toolbox is for `sibu-implementation-planner` workers only. It is not a normal user-invoked skill.

## Focused worker routing

## Focused planner worker routing

- Always read and apply `.agents/skills/clean-code/SKILL.md` before writing implementation plan steps.
- Read the worker toolbox skill path provided in the main-agent packet before doing work.
- Read every required skill path listed in the packet. If a required skill path is missing, stop and report the blocker to the main agent.
- Read optional installed skill paths only when they are relevant to the story, touched files, source artifacts, or validation work.
- Treat distilled skill constraints from the packet as binding task constraints.
- If an optional relevant skill is not installed and you encounter an unmapped language, framework, database, or architecture pattern, do not guess silently; continue only when safe and flag the gap as a plan risk.

### Optional installed skills relevant to planner work
- TypeScript: read `.agents/skills/typescript/SKILL.md` when relevant. For any task that changes `.ts` or `.tsx` files, also use `typescript`.
- Command Pattern: read `.agents/skills/command-pattern/SKILL.md` when relevant. For work that structures actions, workflows, command handlers, operation dispatch, request processing, or executable tasks, use `command-pattern`.
- AI Prompt Engineer Master: read `.agents/skills/ai-prompt-engineer-master/SKILL.md` when relevant. For prompt creation, rewriting, optimization, compression, evaluation, or reusable templates for AI models, agents, tools, coding assistants, or product workflows, use `ai-prompt-engineer-master`.

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
