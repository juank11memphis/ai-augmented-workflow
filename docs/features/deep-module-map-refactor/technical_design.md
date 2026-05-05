# Technical Design: Deep Module Map Refactor

## Inputs
- Product vision: `docs/product-vision.md`
- Feature brief: `docs/features/deep-module-map-refactor/feature_brief.md`
- Deep Module Map: intentionally not required for this feature because this feature removes and replaces the Product Context Map concept.
- Delegated skills: `sibu-template-change`, `ai-prompt-engineer-master` for concise skill wording, architecture skills only where their templates are updated.

## Summary

Refactor the pipeline vocabulary and managed skill templates from Product Context Map to Deep Module Map. The implementation should remove the old concept rather than preserve compatibility aliases, then update every affected template and manifest entry so downstream agents treat `docs/deep-module-map.md` as the module-boundary source of truth.

## Existing Context

The old concept currently appears in root/template agent instructions, the template manifest, pipeline skill templates, architecture skill templates, and installed local skill copies. The implementation source of truth is the `templates/` tree plus `templates/manifest.json`; installed `.agents/skills/**` files and root `AGENTS.md` may need matching updates in this repository so the current working workflow reflects the new terminology.

Relevant managed-template areas:
- `templates/AGENTS.md`
- `templates/manifest.json`
- `templates/skills/product-context-map-writer/SKILL.md`
- `templates/skills/product-vision-writer/SKILL.md`
- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/scrum-master-planner/SKILL.md`
- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`
- `templates/skills/architecture/command-pattern/SKILL.md`
- `templates/skills/architecture/ddd-hexagonal/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`

## Proposed Design

### Rename the managed skill template

Rename:

```txt
templates/skills/product-context-map-writer/SKILL.md
```

to:

```txt
templates/skills/deep-module-map-writer/SKILL.md
```

The skill frontmatter should use:

```yaml
name: deep-module-map-writer
description: Create or update docs/deep-module-map.md as an architecture-agnostic map of product-aligned implementation modules before feature brief work.
```

Do not keep a `product-context-map-writer` alias template. Treat `deep-module-map-writer` as a brand-new skill and remove the old Product Context Map skill from the template set entirely.

### Refactor the writer skill contract

The new writer owns only `docs/deep-module-map.md`. It should require `docs/product-vision.md`, optionally read an existing `docs/deep-module-map.md`, and ask focused questions until the app's durable Deep Modules are clear enough to defend.

Define Deep Modules as product-aligned implementation modules. They are default top-level module boundaries, but not a requirement to use DDD, Hexagonal Architecture, services, packages, databases, team boundaries, or any specific internal folder structure.

Recommended output structure:

```md
# Deep Module Map

## Purpose
<How this map guides feature briefs, technical design, and implementation boundaries.>

## Modules

### <Module Name>
- Suggested module slug:
- Purpose:
- Owns:
- Does not own:
- Key scenarios:
- Related modules:
- Boundary notes:

## Cross-Module Rules
- <Rules for work that spans modules or needs a new module.>
```

The skill should explicitly reject shallow technical buckets such as `utils`, `api`, `db`, `services`, or one-feature modules unless the user confirms a durable product responsibility behind them.

### Update pipeline routing language

Update `templates/AGENTS.md` to use this pipeline:

```txt
product vision -> deep module map -> feature brief -> technical design -> optional UX -> epics/stories -> AI implementation plan -> AI executor
```

Route requests for Deep Module Maps, module boundaries, suggested implementation modules, or `docs/deep-module-map.md` to `deep-module-map-writer`.

### Update downstream pipeline skills

Replace old required inputs and stop conditions with Deep Module Map equivalents:

- `feature-brief-writer` requires `docs/deep-module-map.md`, names one or more existing Deep Modules, and stops if the feature needs a new or changed module.
- `technical-design-writer` requires the feature brief's `## Deep Module` section and translates selected modules into concrete implementation boundaries.
- `scrum-master-planner` continues to trust `technical_design.md` for implementation boundaries and should not reread `docs/deep-module-map.md` by default.
- `ai-implementation-planner` and executor preserve approved Deep Module boundaries from the story, plan, feature brief, or technical design.
- `ux-expert` should refer to Deep Module Maps only in its “must not create/update” boundary wording if needed.
- `product-vision-writer` should list Deep Module Map as the downstream artifact instead of Product Context Map.

Feature brief output should rename `## Product Context` to `## Deep Module`.

### Update architecture skills

`command-pattern` should describe Deep Module compatibility:

- Deep Modules answer where implementation work belongs.
- Command Pattern guidance answers how a use case is structured as a vertical slice inside the selected module.
- Default path shape should be module-first, for example:

```txt
/src/modules/<module-slug>/<feature-slice>/command
/src/modules/<module-slug>/<feature-slice>/handler
/src/modules/<module-slug>/<feature-slice>/ports
/src/modules/<module-slug>/<feature-slice>/result
```

`ddd-hexagonal` should describe Deep Modules as default top-level module boundaries, with optional internal `domain`, `application`, and `infra` structure:

```txt
/src/modules/<module-slug>/domain
/src/modules/<module-slug>/application
/src/modules/<module-slug>/infra
```

The DDD skill should avoid calling Deep Modules mandatory DDD Bounded Contexts, while still allowing a project that uses Bounded Contexts to align them one-to-one when appropriate.

### Update template manifest

Update `templates/manifest.json` in the same change:

- bump global `templateVersion`;
- remove the `skills/product-context-map-writer/SKILL.md` entry entirely;
- add `skills/deep-module-map-writer/SKILL.md` as a brand-new managed skill;
- bump every changed template version;
- replace each changed template's `changes` with current-version user-facing sync notes only.

The sync notes should introduce Deep Module Map guidance as the new workflow stage. Do not describe compatibility support or a rename migration path.

### Repository-local workflow files

Because this repository uses its own managed workflow files, update local installed copies where present so the current session's workflow matches the new templates:

- `.agents/skills/product-context-map-writer/SKILL.md` should be deleted, and `.agents/skills/deep-module-map-writer/SKILL.md` should be added from scratch.
- `.agents/skills/**` references should be rewritten from Product Context terminology to Deep Module terminology.
- `AGENTS.md` should match `templates/AGENTS.md` for routing language.

After template edits, use `sibu doctor` to verify state. If Sibu reports missing, unrecorded, modified, or older managed files after intentional template changes, use the normal Sibu maintenance guidance rather than hiding the drift.

## Validation

- Run a repository search for old terms and confirm remaining uses are only intentional historical references inside already-approved feature docs, if any.
- Run `pnpm verify` after template and manifest changes.
- Run `sibu doctor` after edits.
- When practical, run a temporary lifecycle check with `sibu init`, `sibu doctor`, and `sibu sync` to verify renamed managed templates are discoverable and sync notes are useful.

## Risks / Open Questions

- The old Product Context Map feature docs should be removed as part of this feature, including `docs/features/product-context-map-pipeline/`.
- The implementation should not add Sibu compatibility behavior for skill renames. It should delete the old skill/template and add the Deep Module Map skill/template as new.
- No open questions currently.
