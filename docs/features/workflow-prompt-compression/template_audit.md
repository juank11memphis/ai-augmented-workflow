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
- `templates/skills/architecture/command-pattern/SKILL.md`
- `templates/skills/architecture/ddd-hexagonal/SKILL.md`
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

### `templates/skills/ai-implementation-plan-executor/SKILL.md`

- **Current role:** Guides execution of an existing story implementation plan one ordered step at a time, with approval and commit gates between steps.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible, duplicated-without-added-value.
- **Recommended action:** keep behavior; consider later compression of repeated hard-start and review-gate prose only if the approval/commit semantics remain explicit.
- **Value rationale:** The source-context list, hard start rule, one-step execution model, approval marker format, commit requirement, and final response behavior are quality-critical because they prevent scope drift, missing plans, unreviewed multi-step work, and uncommitted approved changes. Some repeated “do not infer / do not continue” phrasing is useful reinforcement for safety and should not be removed unless a shorter form keeps the same gates.
- **Quality risk if compressed:** Over-compression could cause agents to skip human review, implement multiple steps, mark approval prematurely, or continue without committing.
- **Prerequisite/context-loading assessment:** Required story, plan, epic, feature brief, technical design, and conditional UX context are necessary. Product vision is appropriately conditional. Clean-code and relevant architecture/language/framework skills are necessary when code changes occur.
- **Notes:** Keep exact approval marker shape and commit behavior. Any later compression should preserve “one unapproved step only.”

### `templates/skills/ai-implementation-planner/SKILL.md`

- **Current role:** Converts exactly one approved User Story into story-local, ordered implementation step files.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible.
- **Recommended action:** keep behavior; compress only explanatory wording around planning rules if the output format and hard start rules remain precise.
- **Value rationale:** The exact input requirement, source-context list, missing UX stop rule, output path convention, step-file structure, and plan-quality checks are quality-critical because they make generated implementation plans executable and scoped. The examples and filename rules prevent common path/ordering mistakes.
- **Quality risk if compressed:** Agents may plan from vague scope, omit required context, create steps in the wrong location, or produce generic checklist noise instead of executable step files.
- **Prerequisite/context-loading assessment:** Required story, epic, feature brief, and technical design are necessary. UX is correctly conditional. Product vision is correctly conditional. Clean-code and relevant technical skills are necessary planning inputs for code-writing stories.
- **Notes:** Keep the required Markdown headings for step files; downstream executor depends on them.

### `templates/skills/ai-prompt-engineer-master/SKILL.md`

- **Current role:** Guides prompt creation, rewriting, optimization, compression, evaluation, and reusable prompt template design with quality-first token discipline.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible.
- **Recommended action:** keep core principle and workflow; consider minor compression of checklist wording only where it repeats the workflow without adding a distinct check.
- **Value rationale:** The quality-first compression principle is quality-critical for this feature and for prompt work generally. The workflow, quality checklist, token discipline rules, output pattern, and “optional stronger version” pattern add concrete behavior beyond generic prompt advice. The examples prevent over-compression and clarify acceptable token-saving choices.
- **Quality risk if compressed:** Removing nuance could encourage shorter-but-weaker prompts or eliminate checks for missing-context behavior, output shape, and failure modes.
- **Prerequisite/context-loading assessment:** No fixed file prerequisites are required because prompt work may be model-, artifact-, or context-specific. The skill appropriately asks for missing information only when it materially changes the prompt.
- **Notes:** This skill is the most directly relevant quality guard for the compression feature; avoid reducing its quality-first language unless preserved elsewhere.

### `templates/skills/architecture/command-pattern/SKILL.md`

- **Current role:** Provides command-oriented vertical-slice architecture guidance for executable operations, command handlers, ports, adapters, and thin entrypoints.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible, stale.
- **Recommended action:** defer broad edits; later compress or update only after deciding whether this older, more prescriptive structure should align with the newer concise skill style.
- **Value rationale:** The component contract, dependency inversion, transport agnosticism, thin entrypoints, workflow, and review checklist provide concrete architecture constraints. The large directory blueprint is useful as an example but may be overly prescriptive for projects with different conventions. The title/description mention DDD and Hexagonal Architecture together with Command Pattern, which may overlap with `ddd-hexagonal` but still adds vertical-slice specificity.
- **Quality risk if compressed:** Removing the component contract or checklist could weaken architectural enforcement for command-handler work. Changing the directory blueprint without a replacement convention could create ambiguity.
- **Prerequisite/context-loading assessment:** No fixed file prerequisites are present. That is appropriate because the skill applies to architecture decisions and implementation structure after repo inspection.
- **Notes:** Potential stale/style issue: formatting and tone differ from newer skills. Treat as a later focused rewrite, not a quick compression target.

### `templates/skills/architecture/ddd-hexagonal/SKILL.md`

- **Current role:** Guides backend architecture decisions around domain/application/infrastructure placement, ports/adapters, use cases, and inward dependencies.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible.
- **Recommended action:** keep; only lightly compress examples or repeated “should/should not” wording if boundary clarity remains intact.
- **Value rationale:** The layer definitions, dependency rule, modeling decision rules, ports/adapters guidance, use-case boundaries, simplicity rule, boundary tests, and common mistakes all protect architectural quality. The “use neither” and simplicity sections are especially valuable because they prevent ceremony.
- **Quality risk if compressed:** Shortening too much could make DDD guidance dogmatic or vague, causing over-abstraction or boundary leaks.
- **Prerequisite/context-loading assessment:** No fixed prerequisites are present. That is appropriate; implementation should inspect current project conventions before applying the skill.
- **Notes:** Keep the balance between architecture discipline and simplicity; it is a quality-critical nuance.

### `templates/skills/clean-code/SKILL.md`

- **Current role:** Provides mandatory general code-quality guidance for writing, editing, reviewing, and simplifying code.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible.
- **Recommended action:** keep; consider small compression of principle explanations only if examples and decision rule remain clear.
- **Value rationale:** The principles cover core failure modes across languages: cleverness, naming, focus, control flow, abstraction level, simplicity, duplication, comments, error paths, tidiness, and consistency. Examples for naming and control flow add concrete value and prevent misinterpretation.
- **Quality risk if compressed:** Over-compression could turn practical quality guidance into generic slogans and reduce its usefulness during code review or implementation.
- **Prerequisite/context-loading assessment:** No file prerequisites are needed. The skill is intentionally universal and should be loaded for any code-writing task.
- **Notes:** Because this skill is mandatory for code changes, any reduction should be conservative and validated against coding behavior.

### `templates/skills/feature-brief-writer/SKILL.md`

- **Current role:** Defines business-level feature briefs aligned to `docs/product-vision.md` and keeps product scope separate from UX, technical design, and implementation planning.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible.
- **Recommended action:** keep hard-start, product-vision grounding, output path, and non-technical boundaries; consider compressing the recommended structure and writing-style bullets only if clarity remains.
- **Value rationale:** Requiring `docs/product-vision.md`, clarifying vague intent one question at a time, enforcing business-level scope, and saving to the feature folder are quality-critical for product alignment. The template structure and “avoid” lists prevent common brief failures.
- **Quality risk if compressed:** Agents may draft from vague ideas, skip product-vision alignment, include technical detail, or write artifacts to inconsistent locations.
- **Prerequisite/context-loading assessment:** `docs/product-vision.md` is necessary and correctly hard-required because the skill’s purpose is product-vision-aligned feature definition.
- **Notes:** Some repeated “do not draft from vague request” language may be compressible, but it protects a common failure mode.

### `templates/skills/golang/SKILL.md`

- **Current role:** Provides practical Go guidance for package shape, APIs, error handling, concurrency, and tests.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping.
- **Recommended action:** keep.
- **Value rationale:** The skill is already concise and behavior-focused. It covers Go-specific risks that generic clean-code guidance does not: gofmt, package exports, zero values, pointer receivers, interfaces at consuming boundaries, explicit errors, defer, context, concurrency, and table-driven tests.
- **Quality risk if compressed:** Further compression could remove Go-specific nuance and make the skill redundant with clean-code.
- **Prerequisite/context-loading assessment:** No fixed prerequisites are needed. It should be loaded based on `.go` file changes.
- **Notes:** No obvious no-value prompt load found.

### `templates/skills/nextjs/SKILL.md`

- **Current role:** Provides App Router and Next.js-specific guidance for special files, Server/Client Components, route handlers, metadata, and route segment states.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping.
- **Recommended action:** keep.
- **Value rationale:** The skill is concise and covers framework-specific decisions that materially affect correctness, performance, SEO, and user experience. The special-file and Server/Client Component guidance is necessary because generic React guidance is insufficient for Next.js.
- **Quality risk if compressed:** Removing file-type examples or Server/Client rules could cause framework misuse, excessive Client Components, or misplaced business logic in route handlers.
- **Prerequisite/context-loading assessment:** No fixed prerequisites are needed. It should be loaded based on Next.js App Router or framework-specific file changes.
- **Notes:** No obvious no-value prompt load found.

### `templates/skills/product-vision-writer/SKILL.md`

- **Current role:** Guides discovery and synthesis of `docs/product-vision.md`, including product purpose, target user, positioning, principles, boundaries, voice, trust, and success signals.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible.
- **Recommended action:** keep discovery-first behavior and output rules; consider light compression of discovery-topic lists only if coverage remains.
- **Value rationale:** The discovery-first rule, minimum context topics, synthesis guidance, document structure, incomplete-input handling, output location, and final response behavior are quality-critical because product vision is the source of truth for later feature briefs. The style guidance prevents generic or hollow product strategy output.
- **Quality risk if compressed:** Agents may produce generic vision docs, skip unresolved strategy questions, or omit boundaries/trust expectations that downstream skills rely on.
- **Prerequisite/context-loading assessment:** No prior product file is required because this skill creates the source of truth. It correctly relies on conversational discovery when context is incomplete.
- **Notes:** This skill can likely be tightened, but not by removing discovery coverage.

### `templates/skills/react/SKILL.md`

- **Current role:** Provides React component-architecture guidance for components, props, state ownership, presentational/data-owning boundaries, and render purity.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping.
- **Recommended action:** keep.
- **Value rationale:** The guidance is concise and covers React-specific quality risks not addressed by clean-code alone: component responsibility, data ownership, narrow props, pure render logic, state placement, isolated interactivity, composition, and visible boundaries.
- **Quality risk if compressed:** Removing responsibility/state/data-boundary examples could lead to components with hidden server interactions, duplicated derived state, or flag-heavy APIs.
- **Prerequisite/context-loading assessment:** No fixed prerequisites are needed. It should be loaded for React component changes.
- **Notes:** No obvious no-value prompt load found.

### `templates/skills/scrum-master-planner/SKILL.md`

- **Current role:** Converts approved feature brief and technical design into the smallest useful Epic/User Story planning structure.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible.
- **Recommended action:** keep hard-start, required inputs, output paths, sequencing rules, and coverage checks; consider compressing repeated anti-theater rationale only if the planning rule remains clear.
- **Value rationale:** Required inputs, UI binding, output locations, ordering rules, pragmatic planning rule, Epic/User Story formats, and coverage checks are quality-critical for reviewable planning artifacts. The anti-Agile-theater guidance adds meaningful behavior by preventing inflated plans.
- **Quality risk if compressed:** Agents may create orphan stories, over-split work, ignore binding UX, or add scope absent from approved docs.
- **Prerequisite/context-loading assessment:** Feature brief and technical design are necessary hard requirements. UX is correctly conditional for UI impact. Product vision is appropriately conditional when planning depends on product fit or boundaries.
- **Notes:** Keep the same-order parallel story rule; it encodes useful delivery sequencing behavior.

### `templates/skills/technical-design-writer/SKILL.md`

- **Current role:** Turns an approved feature brief into a concise implementation-oriented technical design without restating other skills.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible.
- **Recommended action:** keep; consider minor compression of avoid/prefer lists only if design boundaries remain sharp.
- **Value rationale:** Grounding requirements, UX binding, design stance, delegation rule, output location, and compact output format are quality-critical because they prevent speculative architecture, product expansion, and duplication of other skills. The examples under delegation rule clarify a subtle but common mistake.
- **Quality risk if compressed:** Agents may produce bloated design docs, restate skill content, skip repo inspection, or treat UX mockups as optional inspiration.
- **Prerequisite/context-loading assessment:** Product vision, feature brief, conditional UX, clean-code, relevant technical skills, and repo inspection are necessary for implementation-oriented design quality.
- **Notes:** The “smallest useful technical design” language is important and should remain prominent.

### `templates/skills/typescript/SKILL.md`

- **Current role:** Provides practical TypeScript guidance for type precision, narrowing, state modeling, optionality, generics, inference, and invariants.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping.
- **Recommended action:** keep.
- **Value rationale:** The skill is concise and covers TypeScript-specific risks that generic clean-code guidance does not: `unknown` at boundaries, narrowing over casting, discriminated unions, public type readability, optionality, useful generics, and balancing invariants with readability.
- **Quality risk if compressed:** Removing examples or type-boundary nuance could increase unsafe casts, broad types, or clever type abstractions.
- **Prerequisite/context-loading assessment:** No fixed prerequisites are needed. It should be loaded based on `.ts` and `.tsx` file changes and used with clean-code.
- **Notes:** No obvious no-value prompt load found.

### `templates/skills/ux-expert/SKILL.md`

- **Current role:** Produces implementation-ready UX/UI direction and binding mockups after product definition for UI-changing features.
- **Instruction categories found:** quality-critical, useful-and-worth-keeping, useful-but-compressible.
- **Recommended action:** keep mockup authority, phone-first, grounding, output location, and no-code boundaries; consider light compression of output section list if it remains optional and useful.
- **Value rationale:** Product-vision grounding, product artifact requirement, mockup authority, confirmation behavior, UX principles, phone-first rule, workflow, output location, mockup requirements, and UI authority rule are quality-critical for preventing downstream redesign and vague UX specs. The output format is long but useful because UX artifacts vary widely.
- **Quality risk if compressed:** Agents may invent UI without product grounding, skip mockups for affected states/breakpoints, include implementation details, or let downstream implementation redesign approved UX.
- **Prerequisite/context-loading assessment:** `docs/product-vision.md` and an approved product artifact are necessary. The “no UI impact” stop condition is necessary to prevent invented UI work.
- **Notes:** The binding mockup rule is intentionally repeated because it protects downstream technical design, Scrum planning, implementation planning, and implementation.

## Story Acceptance Validation

- Required prompt-bearing sources represented: yes. The audit covers `templates/AGENTS.md`, `src/shared/catalog.ts`, agent delegation/setup shims, and every current `templates/skills/**/SKILL.md` file.
- Required audit fields present: yes. Each audit entry includes current role, instruction categories, recommended action, value rationale, quality risk if compressed, and prerequisite/context-loading assessment.
- Value-based recommendations: yes. Recommendations are based on behavioral, safety, output-quality, maintainability, or placement value rather than token count alone.
- Uncertain value handling: yes. Uncertain reductions are marked keep or defer instead of remove.
- Prerequisite/context-loading assessment: yes. Each entry identifies whether fixed source-context rules are necessary, conditional, absent, or intentionally delegated to task-specific repo inspection.
- Audit-only scope preserved: yes. This story does not edit source templates, `src/shared/catalog.ts`, `templates/manifest.json`, generated managed files, or token accounting automation.
