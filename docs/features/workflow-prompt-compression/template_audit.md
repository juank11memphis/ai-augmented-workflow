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

### `templates/AGENTS.md`

- **Current role:** Global pre-skill instruction surface for project overview, safety, confirmation gates, communication style, mandatory skill routing, optional skill routing insertion, and Sibu maintenance guidance. It is read before any skill-specific prompt can protect behavior.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible, duplicated-without-added-value.
- **Recommended action:** keep most content; compress only targeted duplicated maintenance guidance if maintainers accept a shorter decision table later.
- **Value rationale:**
  - Project overview placeholder is quality-critical because it gives generated `AGENTS.md` files repo-specific context before task planning.
  - Security/safety rules are quality-critical and should remain global because they must apply before skill selection and across all task types.
  - Code-change confirmation and re-confirmation rules are quality-critical for human control.
  - Documentation/read-only exception is useful-and-worth-keeping because it prevents unnecessary approval friction while preserving destructive/risky-action gates.
  - Communication style is useful-and-worth-keeping because it sets a consistent low-bureaucracy interaction contract for every session.
  - Skill routing rules are quality-critical because agents need them before loading skills; moving them into skills would make correct skill selection less reliable.
  - Sibu maintenance guidance is quality-critical at session startup, but the final three conditional reminders repeat the preceding outcome guidance and may be useful-but-compressible.
- **Quality risk if compressed:** Compressing safety, confirmation, or routing too aggressively could cause agents to skip user approval, miss required skills, mishandle Sibu drift, or hide uncertainty. Compressing Sibu maintenance guidance into too terse a form could make `sibu init`, `sibu doctor`, and `sibu sync` responsibilities less clear.
- **Prerequisite/context-loading assessment:** No external prerequisite-reading rule is present. The `sibu doctor` preflight is necessary workflow context, not removable prompt load, because it detects managed-file drift before changes or workflow guidance.
- **Notes:** Do not remove global rules merely because they are repeated in some skill templates. Repetition is potentially intentional when it protects pre-skill behavior, safety, or human control. Candidate later compression should focus on reducing repeated Sibu outcome wording, not changing the maintenance semantics.

### `src/shared/catalog.ts` routing instructions

- **Current role:** Source of selectable skill routing text inserted into generated `AGENTS.md` through `{{OPTIONAL_SKILL_ROUTING}}`. These strings decide when optional language, framework, architecture, and workflow skills should be loaded.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible.
- **Recommended action:** keep semantics; consider light wording compression only where long examples can be shortened without weakening correct skill selection.
- **Value rationale:**
  - TypeScript and Go routing instructions are short, exact, and quality-critical because file extensions are the reliable trigger.
  - React routing instruction is useful-and-worth-keeping because it names component boundaries, props, and state ownership; those are the key quality risks for React work.
  - Next.js routing instruction is useful-and-worth-keeping because the listed App Router file types prevent under-loading framework guidance for specialized files. It may be useful-but-compressible if examples are consolidated without losing coverage.
  - DDD/hexagonal routing instruction is broad by design and quality-critical for backend architecture work; shortening it too much could cause missed architecture guidance.
  - Command Pattern routing instruction is concise and quality-critical for executable workflow slices.
  - AI Prompt Engineer Master routing instruction is long but useful-and-worth-keeping because it covers prompt creation, rewrite, compression, evaluation, and reusable templates. It may be lightly compressible only if all task classes remain covered.
  - UX Expert routing instruction is quality-critical because it binds mockups for downstream planning and implementation; this should not be removed just to shorten routing text.
- **Quality risk if compressed:** Over-compression could make optional skill selection ambiguous, especially for framework-specific files, architecture guidance, prompt-compression work, or UI mockup binding. Removing examples that look verbose may reduce correct routing.
- **Prerequisite/context-loading assessment:** No prerequisite-reading rules are embedded here. The routing text should remain focused on selecting the minimum sufficient skill set; deeper context belongs inside the selected skill.
- **Notes:** Any later routing edit should be validated against existing catalog tests and by manually checking whether the smallest necessary skill set remains obvious.

### `templates/CLAUDE.md`

- **Current role:** Claude-specific delegation shim that points Claude to root `AGENTS.md` as the source of truth.
- **Instruction categories found:** useful-and-worth-keeping, duplicated-without-added-value.
- **Recommended action:** defer or lightly compress later; do not remove delegation.
- **Value rationale:** Delegation to `AGENTS.md` is useful-and-worth-keeping because it avoids maintaining parallel agent-specific instructions. The second sentence repeats the source-of-truth idea from the first sentence, but the repetition clarifies scope for project overview, safety, and workflow instructions.
- **Quality risk if compressed:** Removing too much could make Claude fail to discover `AGENTS.md` or treat it as optional. Keeping a tiny amount of repetition may be worth the reliability.
- **Prerequisite/context-loading assessment:** The only prerequisite is `AGENTS.md`, which is necessary because this file intentionally delegates there.
- **Notes:** If later compressed, preserve an explicit directive to follow `AGENTS.md`; do not copy global rules into this shim.

### `templates/GEMINI.md`

- **Current role:** Gemini-specific delegation shim that points Gemini to root `AGENTS.md` as the source of truth.
- **Instruction categories found:** useful-and-worth-keeping, duplicated-without-added-value.
- **Recommended action:** defer or lightly compress later; do not remove delegation.
- **Value rationale:** Delegation to `AGENTS.md` is useful-and-worth-keeping because it keeps Gemini aligned with the shared workflow surface. The second sentence repeats the source-of-truth idea from the first sentence but may improve compliance by naming the instruction categories governed by `AGENTS.md`.
- **Quality risk if compressed:** Removing too much could make Gemini ignore shared project instructions or treat the delegation as incomplete.
- **Prerequisite/context-loading assessment:** The only prerequisite is `AGENTS.md`, which is necessary because this file intentionally delegates there.
- **Notes:** Keep Claude and Gemini shims structurally aligned unless there is agent-specific evidence to diverge.

### `templates/.codex/config.toml`

- **Current role:** Codex setup file that points Codex at `../AGENTS.md` through `model_instructions_file`.
- **Instruction categories found:** quality-critical.
- **Recommended action:** keep.
- **Value rationale:** This is minimal configuration rather than prose. It is quality-critical because it makes Codex load the shared instruction source.
- **Quality risk if compressed:** Any reduction risks breaking Codex instruction loading.
- **Prerequisite/context-loading assessment:** `../AGENTS.md` is the necessary instruction source for this configuration.
- **Notes:** No meaningful prompt text beyond delegation exists here; it should not be part of prose compression.

Detailed skill-template audit entries will be completed in the next implementation step.
