# Workflow Prompt Compression Template Audit

## Purpose

This audit prepares value-based workflow prompt compression. Its job is to identify which prompt instructions should be kept, compressed, moved, removed, or deferred before any source template changes are made.

Compression must not happen merely because wording is long, repetitive-looking, or token-expensive. A compress, move, or remove recommendation is valid only when the audit records why the current wording adds no meaningful value to agent behavior, safety, output quality, or maintainability, or why the value belongs in a different prompt surface.

## Classification Vocabulary

- **quality-critical**: Required to preserve safety, human control, routing correctness, output quality, validation, or product/workflow alignment.
- **useful-and-worth-keeping**: Adds meaningful behavior or clarity and should remain in substantially its current form.
- **useful-but-compressible**: Adds meaningful value, but can likely be expressed with fewer words without losing behavior or nuance.
- **misplaced**: Adds value, but belongs in another skill, template, script, checklist, or generated artifact surface.
- **duplicated-without-added-value**: Repeats guidance already present elsewhere and does not materially improve reliability, safety, or task execution in this location.
- **stale**: Refers to outdated names, workflows, assumptions, examples, or constraints.
- **removable**: Adds no meaningful behavioral, safety, output-quality, or maintainability value.

## Recommendation Rules

- **Keep** when the instruction is quality-critical, useful-and-worth-keeping, or its value is uncertain.
- **Compress** only when the instruction is useful-but-compressible and the shorter form preserves the same behavior and nuance.
- **Move** only when the instruction adds value but belongs closer to the task, skill, script, or template that needs it.
- **Remove** only when the instruction is removable, stale with no replacement value, or duplicated-without-added-value.
- **Defer** when value is plausible but uncertain, or when changing the instruction would require broader validation than this feature can safely provide.

Every **compress**, **move**, or **remove** recommendation must include both a value rationale and quality-risk note. If either is missing, the recommendation is not ready.

## Audit Entry Format

Use the following structure for each audited source:

```md
### `<path>`

- **Current role:** <what this prompt source does in the workflow>
- **Instruction categories found:** <quality-critical / useful-and-worth-keeping / useful-but-compressible / misplaced / duplicated-without-added-value / stale / removable>
- **Recommended action:** <keep / compress / move / remove / defer>
- **Value rationale:** <what value the instruction provides, or why it provides none in this location>
- **Quality risk if compressed:** <what could go wrong if wording is shortened, moved, or removed>
- **Prerequisite/context-loading assessment:** <whether required source-reading or context-loading rules are necessary for quality>
- **Notes:** <optional details, examples, or follow-up constraints>
```

## Source Inventory

### Global workflow guidance

- `templates/AGENTS.md`

### Agent delegation and setup shims

- `templates/CLAUDE.md`
- `templates/GEMINI.md`
- `templates/.codex/config.toml`

### Selectable skill routing instructions

- `src/shared/catalog.ts`

### Skill prompt templates

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

## Audit Entries

Detailed audit entries will be completed in the next implementation steps. This section intentionally starts as an inventory-backed scaffold so later recommendations can be added without changing source templates first.
