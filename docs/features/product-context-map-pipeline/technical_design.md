# Technical Design: Product Context Map Pipeline

## Inputs

- Product vision: `docs/product-vision.md`
- Feature brief: `docs/features/product-context-map-pipeline/feature_brief.md`
- Delegated skills for implementation: `clean-code`, `typescript`, `sibu-template-change`, `ai-prompt-engineer-master`, `command-pattern`

## Summary

Implement Product Context Maps through a required managed skill installed for every selected agent. The core implementation is mostly template/catalog work: add `product-context-map-writer` as a mandatory skill and update existing pipeline/architecture skills with compact context-aware rules. `docs/product-context-map.md` is the user’s product artifact created or updated by the skill; it is not itself a Sibu-managed template.

## Existing Context

- Mandatory skills are registered in `src/shared/catalog.ts` through `MANDATORY_SKILLS`; build output mirrors this in `bin/shared/catalog.js`.
- Managed workflow targets are assembled by `src/shared/workflow-targets.ts`. The new mandatory skill should become a normal managed target so `init`, `.sibu/state.json`, `doctor`, and `sync` handle the skill file through existing mechanics.
- Template metadata lives in `templates/manifest.json`; changing templates requires bumping global `templateVersion` and each changed template version.
- Skill templates live under `templates/skills/**/SKILL.md` and are installed to `.agents/skills/**/SKILL.md` in consuming projects.
- The repo currently has no `product-context-map-writer` skill.
- This feature has no UI impact; no UX spec is required.

## Proposed Design

### 1. Add mandatory `product-context-map-writer`

Create:

```txt
templates/skills/product-context-map-writer/SKILL.md
```

Register it in `MANDATORY_SKILLS` with the same target path for all supported agents:

```txt
.agents/skills/product-context-map-writer/SKILL.md
```

Because mandatory skills already flow through `getWorkflowTargets()`, this makes `sibu init`, `.sibu/state.json`, `sibu doctor`, and `sibu sync` manage the skill through the normal template system. Do not add `docs/product-context-map.md` as a workflow target.

The skill should own creating and updating the user artifact:

```txt
docs/product-context-map.md
```

The file should be generated from user/product context by the skill, not installed from a Sibu template.

The skill should require `docs/product-vision.md` and use the same deliberate interview posture as `feature-brief-writer`: ask one focused question at a time until it has complete practical understanding and explicit user alignment, then write or update the map. It should write only the path in its final response unless inline review is requested. Keep the prompt concise and quality-first.

Core rules for the skill:

- Product Contexts are product responsibility boundaries, not folders, services, layers, or mandatory DDD Bounded Contexts.
- Contexts should be deep modules: stable, cohesive, simple from the outside, and allowed to contain rich internal behavior.
- Do not create a context per feature, screen, command, or folder.
- Do not draft or revise the map from vague context labels without confirming the user’s intended responsibilities, boundaries, scenarios, and relationships.
- Updating the map is allowed, but context changes should be intentional and user-aligned.

### 2. Update downstream pipeline skills

Update these mandatory skill templates with compact Product Context rules:

- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`

Avoid restating the entire concept in every file. Use short shared language:

> Product Contexts answer “where does this work belong?” Architecture guidance answers “how is that context structured internally?”

Required behavior by skill:

- `feature-brief-writer`
  - Read `docs/product-context-map.md` after `docs/product-vision.md`.
  - Hard-stop if the map is missing and tell the user to create it with `product-context-map-writer`.
  - Add a `## Product Context` section to feature briefs.
  - If no existing context fits, stop before drafting and provide a suggested prompt for updating the map.
- `technical-design-writer`
  - Read `docs/product-context-map.md` and the feature brief’s Product Context section.
  - Explain how the feature’s Product Contexts interact with selected architecture guidance only when it changes implementation direction.
- `ai-implementation-planner`
  - Treat Product Context guidance from the feature brief and technical design as source context.
  - Preserve context boundaries in step files and call out cross-context work explicitly.
- `ai-implementation-plan-executor`
  - Treat Product Context guidance as part of the execution contract.
  - Do not move work into unrelated contexts unless the approved step or technical design justifies it.

### 3. Update architecture skill compatibility

Update only the first-scope architecture skills:

- `templates/skills/architecture/ddd-hexagonal/SKILL.md`
- `templates/skills/architecture/command-pattern/SKILL.md`

Add a compact compatibility rule instead of redesigning the skills:

- If `docs/product-context-map.md`, a feature brief, or a technical design names Product Contexts, organize guidance within those contexts.
- For DDD + Hexagonal, Product Contexts may become the outer responsibility boundary containing `domain`, `application`, and `infra`/adapter concerns, but the map itself remains architecture-agnostic.
- For Command Pattern, vertical slices should live within or clearly belong to the relevant Product Context when contexts are present.
- Do not invent new Product Contexts during implementation; route that decision back to the map update workflow.

### 4. Update routing instructions

Update `templates/AGENTS.md` skill routing to include the new mandatory skill and to insert the Product Context Map step before feature briefs. Also update `src/shared/catalog.ts` if any routing text for existing selectable skills needs to mention Product Context compatibility.

The required pipeline language should become:

```txt
product vision -> product context map -> feature brief -> technical design -> optional UX -> epics/stories -> AI implementation plan -> AI executor
```

### 5. Template and manifest updates

Use `sibu-template-change` during implementation.

Expected manifest changes:

- bump global `templateVersion`;
- add `skills/product-context-map-writer/SKILL.md`;
- bump changed skill template versions;
- bump `AGENTS.md` if routing changes;
- update change notes with user-facing sync messages only for the new versions.

### 6. Generated `bin/` parity

This repo keeps compiled JavaScript under `bin/`. After changing `src/**`, run the build so `bin/**` stays in sync. Do not edit `bin/**` by hand unless the build output must be inspected or corrected.

## Validation

- `pnpm build`
- `pnpm check`
- Relevant tests at minimum:
  - `bin/shared/workflow-targets.test.js` to prove `product-context-map-writer` is mandatory
  - existing doctor/sync coverage should pass because the skill is a normal managed target
- `pnpm test` or `pnpm verify` before finalizing.
- Manual/lifecycle check when practical:
  - initialize a temp project;
  - confirm `.agents/skills/product-context-map-writer/SKILL.md` is created/managed;
  - confirm `docs/product-context-map.md` is not created by `sibu init` as a managed template;
  - remove or modify the installed skill file;
  - confirm `sibu doctor` reports skill drift and `sibu sync` offers the normal managed-file path.

## Risks / Open Questions

- The biggest implementation risk is prompt bloat across skill templates. Keep each update short and delegate shared concepts to the Product Context Map skill where possible.
- Existing projects will see a new required managed skill during sync. Change notes must clearly explain why the new skill is required.
- Downstream skills must distinguish between the managed skill file and the user-owned `docs/product-context-map.md` artifact.
