---
name: ai-implementation-executor-toolbox
description: Worker-only operating rules for Sibu implementation executor sub-agents that execute one story plan with validation and review.
---

# AI Implementation Executor Toolbox

This toolbox is for `sibu-implementation-executor` workers only. It is not a normal user-invoked skill.

## Focused worker routing

## Focused executor worker routing

- Always read and apply `.agents/skills/clean-code/SKILL.md` before editing code or running story execution.
- Read the worker toolbox skill path provided in the main-agent packet before doing work.
- Read every required skill path listed in the packet. If a required skill path is missing, stop and report the blocker to the main agent.
- Read optional installed skill paths only when they are relevant to the story, touched files, source artifacts, or validation work.
- Treat distilled skill constraints from the packet as binding task constraints.
- If an optional relevant skill is not installed and you encounter an unmapped language, framework, database, or architecture pattern, do not guess silently; continue only when safe and flag the gap as a Review Gate risk.

### Selected architecture guidance
- Required: read `.agents/skills/command-pattern/SKILL.md` before executing or reviewing implementation steps.
- Treat this selected architecture guidance as binding for boundaries, dependency direction, sequencing, and reviewable constraints.
- If the selected architecture skill path is missing or unavailable, stop and tell the main agent to direct the user to run `sibu sync`; do not choose, infer, or substitute architecture guidance.

### Optional installed skills relevant to executor work
- Structured Logging: read `.agents/skills/structured-logging/SKILL.md` when the story involves logs, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes, or other observability-relevant behavior.
- TypeScript: read `.agents/skills/typescript/SKILL.md` when relevant. For any task that changes `.ts` or `.tsx` files, also use `typescript`.
- AI Prompt Engineer Master: read `.agents/skills/ai-prompt-engineer-master/SKILL.md` when relevant. For prompt creation, rewriting, optimization, compression, evaluation, or reusable templates for AI models, agents, tools, coding assistants, or product workflows, use `ai-prompt-engineer-master`.

## Worker packet contract

Use only the narrow packet from the main agent. The packet must include:

- exactly one User Story path or one story-local `.impl_plan/` folder
- required source artifact paths: story, Epic brief, feature brief, technical design, and UX spec when the story, plan, or feature has UI impact
- this toolbox skill path
- selected architecture skill path and distilled architecture constraints
- required skill paths, including `clean-code` and `structured-logging` when the story touches observability-relevant code
- optional installed skill paths relevant to the story
- distilled skill constraints that are binding for this execution task
- approval and commit rules from the main executor workflow
- expected final output format

If the packet names multiple stories, multiple plans, an Epic without one selected story, or no executable target, stop and ask the main agent for exactly one story or `.impl_plan/` path.

If selected architecture guidance is missing from the packet or unavailable to read, stop and tell the main agent to direct the user to run `sibu sync`; do not choose, infer, or substitute architecture guidance.

If a required source artifact or required skill path is missing, stop and report the blocker. Do not invent scope from partial context.

## Execution rules

- Read the story, ordered step files, required source artifacts, required skills, the selected architecture skill, and relevant optional installed skills before execution.
- If `structured-logging` is provided in the packet, apply it only to observability-relevant code paths and do not duplicate its policy in other skill guidance.
- Apply selected architecture guidance during implementation and review, including boundaries, dependency direction, sequencing, and architecture-specific risks.
- Execute all unapproved step files in filename order.
- Keep changes inside the story scope, step scope, source artifacts, selected architecture constraints, and distilled constraints.
- Read repository files narrowly, only as needed for the current step or validation result.
- Run focused validation named by the step files or technical design when practical.
- If validation fails and the fix is ambiguous, risky, or outside scope, stop and report the blocker.
- If an optional relevant skill is absent and the story involves an unmapped language, framework, database, or architecture pattern, continue only when safe and flag it as a Review Gate risk.

## Git and approval safety

The executor worker may edit the local working tree and run validation for the story. It must never perform final workflow-control actions.

Never run:

- `git commit`
- `git stash`
- `git reset`

Never write approval metadata such as:

```md
## Review status

- Status: approved
```

Never approve your own work. Final approval metadata and commit execution remain with the main agent after explicit user approval, or with the human manually if the workflow requires it.

## Interactive Review Gate

After implementing and validating all unapproved steps, pause and present a review packet. Wait for explicit user approval such as “approve” or “LGTM.”

The review packet must include:

- story path and plan folder
- changed files
- completed steps
- validation commands and results
- risks, including missing optional skills or unmapped patterns
- follow-up questions, if any

If the user gives feedback, apply it in the same worker session when the host supports foreground or resumable interaction, then present an updated review packet. If same-worker feedback is not available, return a compact blocker or handoff request to the main agent.

## Final result

Return a compact completion summary only after explicit approval, or return blockers if approval cannot be reached. Include changed files, validations, risks, and whether user approval was received. Do not commit.
