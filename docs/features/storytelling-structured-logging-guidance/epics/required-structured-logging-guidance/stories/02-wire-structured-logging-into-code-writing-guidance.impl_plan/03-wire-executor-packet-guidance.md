# Step: Wire structured logging into executor packet guidance

## Goal

Ensure implementation execution workflows include `structured-logging` in worker packets when a story touches observability-relevant code, so fresh-context executors receive the canonical logging guidance.

## Scope

- Update the implementation plan executor templates and active copies to include `structured-logging` as a required or relevant skill path when story scope involves logs, workflows, handlers, jobs, external calls, errors, retries, long-running operations, state changes, or observability-relevant behavior.
- Update the implementation executor toolbox templates and active copies so worker packet contracts and optional/relevant skill routing mention `structured-logging` for those triggers.
- Preserve existing packet requirements for `clean-code`, TypeScript, command-pattern, and other relevant skills.
- Do not change executor semantics beyond skill packet/routing guidance.

## Files

- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `.agents/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/skills/ai-implementation-executor-toolbox/SKILL.md`
- `.agents/skills/ai-implementation-executor-toolbox/SKILL.md`

## Done when

- Executor packet guidance can pass `.agents/skills/structured-logging/SKILL.md` for observability-relevant implementation stories.
- Executor worker guidance tells workers when to read and apply `structured-logging` without making it mandatory for irrelevant pure-code tasks.
- The guidance remains packet-focused and does not duplicate the structured logging policy text.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-07-13T19:05:53Z
