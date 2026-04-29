# Step: Audit skill prompts and prerequisites

## Goal

Complete the value-based audit for every skill template, including whether each skill's required inputs and prerequisite-reading rules are necessary to protect output quality.

## Scope

- Audit every `templates/skills/**/SKILL.md` file currently present in the repository.
- For each skill, identify its role, ownership boundaries, required inputs, output expectations, stop conditions, examples, validation guidance, and prerequisite/context-loading rules.
- Classify instructions using the story's required categories.
- Recommend keep, compress, move, remove, or defer with value rationale and quality risk.
- Preserve examples and repeated rules when they prevent likely mistakes, protect safety, or define non-obvious output shape.
- Mark uncertain reductions as keep or defer.
- Do not edit skill templates in this step.

## Files

- `docs/features/workflow-prompt-compression/template_audit.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-prompt-engineer-master/SKILL.md`
- `templates/skills/clean-code/SKILL.md`
- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/golang/SKILL.md`
- `templates/skills/nextjs/SKILL.md`
- `templates/skills/product-vision-writer/SKILL.md`
- `templates/skills/react/SKILL.md`
- `templates/skills/scrum-master-planner/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/typescript/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`

## Done when

- `template_audit.md` includes a completed entry for every `templates/skills/**/SKILL.md` file.
- The audit identifies prerequisite/context-loading rules that are necessary for quality and any that may be unnecessary.
- Every compress, move, or remove recommendation has value-based rationale and quality-risk notes.
- Every uncertain recommendation is marked keep or defer rather than remove.
- No skill template or generated `.agents/skills/**` file has been changed.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-04-28T21:44:36-06:00
