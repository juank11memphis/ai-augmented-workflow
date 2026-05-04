# Technical Design: Contract-Based AI Development Pipeline

## Inputs

- Product vision: `docs/product-vision.md`
- Product Context Map: `docs/product-context-map.md`
- Feature brief: `docs/features/contract-based-ai-development-pipeline/feature_brief.md`
- Delegated skills for implementation: `sibu-template-change`, `ai-prompt-engineer-master`, `clean-code`

## Summary

Implement this feature by updating the Sibu-managed pipeline skill templates, not the CLI. Each pipeline template gets a consistent `## Pipeline Contract` section with four tailored subsections: what it needs, what it writes, when it stops, and what it must not do. The design also updates manifest metadata so `sibu sync` can explain the template changes to users.

## Existing Context

Sibu stores installable skill templates under `templates/skills/<skill-name>/SKILL.md`. The affected pipeline templates are:

- `templates/skills/product-vision-writer/SKILL.md`
- `templates/skills/product-context-map-writer/SKILL.md`
- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `templates/skills/scrum-master-planner/SKILL.md`
- `templates/skills/ai-implementation-planner/SKILL.md`
- `templates/skills/ai-implementation-plan-executor/SKILL.md`

The local `.agents/skills/.../SKILL.md` copies are also present for this repository's own workflow. Keep them in sync for changed mandatory/shared workflow skills so this repo immediately uses the same contract behavior it publishes.

`templates/manifest.json` tracks global template version, per-template versions, and user-facing `changes` notes. Any changed template requires a per-template version bump, fresh change notes, and a global `templateVersion` bump.

There is an existing `templates/skills/ux-expert/SKILL.md`; treat it as the optional UX stage. It should enforce that UX work applies only when a feature has UI impact.

## Product Context Translation

- **AI Development Pipeline** owns the stage contracts, stage order, source-of-truth handoffs, stop behavior, interview behavior, and downstream trust rules.
- **Guidance Library** owns the reusable prompt/template form of those contracts: the actual `SKILL.md` templates, their wording, versioning, compatibility notes, and sync-facing change notes.

No CLI architecture changes are needed because this feature does not affect Workflow Adoption & Maintenance behavior. The implementation is a template/content change with manifest metadata updates.

## Proposed Design

### 1. Add one consistent contract structure to each pipeline template

Each affected template should include this exact heading shape near the top, after the purpose/intro and before detailed workflow guidance:

```md
## Pipeline Contract

### What this skill needs

### What this skill writes

### When this skill stops

### What this skill must not do
```

Tailor bullets per stage. Do not create a large generic boilerplate block copied verbatim into every skill; use the same headings for reliability and concise stage-specific bullets for token efficiency.

### 2. Stage-specific required context and outputs

Use this contract matrix as the implementation source of truth:

| Skill | Needs | Writes |
| --- | --- | --- |
| `product-vision-writer` | Enough user-provided product discovery to define a vision. No upstream artifact required. | `docs/product-vision.md` |
| `product-context-map-writer` | `docs/product-vision.md` and enough interview context to define responsibility boundaries. | `docs/product-context-map.md` |
| `feature-brief-writer` | `docs/product-vision.md`, `docs/product-context-map.md`, and enough feature intent from the user. | `docs/features/<feature-slug>/feature_brief.md` |
| `technical-design-writer` | Feature brief, `docs/product-context-map.md`, relevant repo files/flows, and `ux.md` only when the feature has UI impact. | `docs/features/<feature-slug>/technical_design.md` |
| `ux-expert` | Product vision, feature brief, and confirmation from the feature/request that there is UI impact. | `docs/features/<feature-slug>/ux.md` |
| `scrum-master-planner` | Feature brief, technical design, and `ux.md` when the feature has UI impact. | `docs/features/<feature-slug>/epics/<epic-slug>/epic_brief.md` and story files under `stories/` |
| `ai-implementation-planner` | Exactly one story, that story's epic brief, feature brief, technical design, relevant repo files, and `ux.md` when the story/feature has UI impact. | Story-local `.impl_plan/*.md` step files |
| `ai-implementation-plan-executor` | Exactly one story or `.impl_plan/`, ordered step files, the story's epic brief, feature brief, technical design, relevant repo files, and `ux.md` when the story/step/feature has UI impact. | Code/docs changes required by one implementation step at a time, plus step approval metadata when applicable |

### 3. Standardize stop behavior

Every pipeline template should stop when required inputs are missing. The stop response should:

1. name the missing artifact or prerequisite,
2. name the correct skill/stage to run first,
3. avoid drafting, inferring, or creating substitute content.

Wrong-stage requests should also stop and redirect. Examples:

- Feature brief skill asked to create stories → redirect to `scrum-master-planner` after feature brief and technical design exist.
- Implementation planner asked to write production code → redirect to `ai-implementation-plan-executor` after a valid implementation plan exists.
- Technical design asked from only a feature idea → redirect to `feature-brief-writer`.

If the current-stage intent is unclear but belongs to the current skill, keep the one-question-at-a-time interview behavior until enough information exists to write the owned artifact.

Do not require a final confirmation summary before writing product/planning artifacts. After writing, final-answer with the path or concise path summary required by that skill.

### 4. Enforce prior-artifact ownership

Downstream stages may read prior artifacts but must not edit them. If a prior artifact exists but is obviously incomplete or invalid in a way its owning stage should have handled, the downstream skill should stop and direct the user back to that owning stage.

Examples:

- Technical design finds a feature brief with no Product Context section → stop and direct to `feature-brief-writer` or `product-context-map-writer` as appropriate.
- Scrum planning finds a technical design with no implementation boundary guidance → stop and direct to `technical-design-writer`.
- Implementation planner finds a story that lacks acceptance criteria or scope → stop and direct to `scrum-master-planner`.

### 5. Make context access explicit

Each template should state only the artifacts it must read. Keep quality first: do not remove required context just to save tokens.

Important handoff rule:

- Feature brief and technical design read the Product Context Map.
- Technical design translates selected Product Contexts into architecture/module/implementation boundaries.
- Scrum planning, implementation planning, and execution trust the technical design as the implementation boundary source of truth and do not reread the Product Context Map by default.
- If downstream stages need context boundaries and the technical design does not contain them, they stop instead of reinterpreting the map.

### 6. Update Sibu template metadata

When implementing the template edits:

- bump `templates/manifest.json` global `templateVersion`,
- bump each changed affected template's `version`,
- replace each changed template's `changes` with a concise user-facing note for this version,
- keep template paths stable.

Suggested change-note pattern:

```txt
Adds a pipeline contract that clarifies required inputs, owned outputs, stop conditions, and stage boundaries for <stage purpose>.
```

### 7. Keep local repo workflow copies aligned

For affected skills that exist in `.agents/skills/`, apply the same content changes there after updating `templates/skills/`. `ux-expert` currently exists only under `templates/skills/`, so only the template path needs changing unless the repo later installs that selectable skill locally.

## Validation

Run after implementation:

- `pnpm verify`
- `sibu doctor`

Manual review checks:

- Each affected pipeline template has exactly one `## Pipeline Contract` section with the four required subsection headings.
- Each affected template has stage-specific required inputs and output paths.
- Later-stage templates do not require `docs/product-context-map.md` by default after technical design.
- `technical-design-writer` explicitly owns Product Context to implementation-boundary translation.
- `ux-expert` is framed as applicable only for UI-impacting features.
- Manifest global and per-template versions are bumped with user-facing change notes.

## Risks / Open Questions

- Keep contract language concise; duplicated boilerplate across eight skills could inflate prompt cost and reduce readability.
- Be careful not to remove useful stage-specific guidance while adding contracts.
- Executor behavior has repository-level confirmation exceptions; preserve its existing reviewed-step execution model while clarifying contract boundaries.
