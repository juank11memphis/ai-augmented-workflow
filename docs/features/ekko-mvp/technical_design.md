# Technical Design: Ekko MVP

## Inputs

- Product vision: `docs/product-vision.md`
- Feature brief: `docs/features/ekko-mvp/feature_brief.md`
- Delegated skills for implementation: `clean-code`, `typescript`, `command-pattern`
- Windsurf grounding:
  - Windsurf discovers root `AGENTS.md` as always-on Cascade instructions and also supports scoped nested `AGENTS.md` files: https://docs.windsurf.com/windsurf/cascade/agents-md
  - Windsurf workspace skills live under `.windsurf/skills/<skill-name>/SKILL.md`, but Windsurf also discovers cross-agent skills in `.agents/skills/`: https://docs.windsurf.com/windsurf/cascade/skills

## Summary

The MVP should keep the current CLI shape and close the remaining gaps in three focused areas: Windsurf agent-target support, explicit post-init skill selection, and visible missing-skill inventory. Windsurf support should be mostly catalog/state work because the existing `AGENTS.md` plus `.agents/skills/` layout already maps to Windsurf’s documented discovery model. `ekko skills use <skill_name>` should be a new command slice that only mutates files/state when the current workflow is clean, then creates the newly selected skill files and refreshes generated routing safely. Missing skills should be documented as lightweight assignable work, not turned into a project-management system.

## Existing Context

- CLI commands are registered in `src/entrypoints/cli/create-program.ts`, dispatched through `src/entrypoints/cli/execute-command.ts`, and modeled as command unions in `src/entrypoints/cli/command.ts`.
- Feature logic already follows command-oriented slices under `src/features/*`.
- Supported agents and selectable skills are cataloged in `src/shared/catalog.ts`.
- `AgentId` currently supports `codex | gemini | claude`; each `SupportedAgent` currently assumes one generated target file.
- Mandatory and selectable skills already target the shared `.agents/skills/<skill>/SKILL.md` path for Codex, Gemini, and Claude.
- `ekko init` selects agents and skills, writes missing workflow files, and records `.ekko/state.json` through `writeEkkoState`.
- `ekko sync` already knows how to preview missing files, local edits, template updates, new expected templates, and generated `AGENTS.md` routing changes.
- `ekko skills list` exists. `ekko skills stop <file>` exists, but there is no direct command to add a specific skill after init.
- Current required skills are the four mandatory catalog entries: clean code, product vision writer, feature brief writer, and technical design writer. Current selectable skills are TypeScript, React, Next.js, DDD + Hexagonal Architecture, and Command Pattern.
- There is no artifact that records human-identified missing required/selectable skills as assignable follow-up work.

## Proposed Design

### 1. Model Windsurf as an agent target without inventing deep editor integration

Add `windsurf` to the agent model, but do not create a Windsurf-specific workflow file unless later research proves one is required.

Current implementation assumes every agent has a `targetRelativePath` and `templateRelativePath`. Change `SupportedAgent` so the agent-specific support file is optional:

```ts
type SupportedAgent = {
  id: AgentId;
  name: string;
  description: string;
  targetRelativePath?: string;
  templateRelativePath?: string;
};
```

Then update `getWorkflowTargets` to include agent-specific files only when both paths are present. `AGENTS.md` remains the common project instruction file for every selected agent.

Catalog changes:

- Add `windsurf` to `AgentId`.
- Add Windsurf to `SUPPORTED_AGENTS` with a description explaining that Windsurf reads root `AGENTS.md` and shared `.agents/skills/`.
- Add `windsurf` entries to every skill template’s `targetRelativePathsByAgent`, pointing to the same shared `.agents/skills/.../SKILL.md` paths.
- Do not add `.windsurf/skills` templates in the MVP unless cross-agent `.agents/skills` support proves insufficient.

State compatibility:

- Existing state files without `windsurf` remain valid.
- `readStateForDoctor` should accept `windsurf` once `AgentId` expands.
- `doctor` should report `windsurf` like other supported agents once selected.

### 2. Add `ekko skills use <skill_name>` as a dedicated command slice

Create a new feature slice:

```txt
src/features/use-skill/
  command.ts
  handler.ts
```

Command shape:

```ts
type UseSkillCommand = {
  type: 'skills:use';
  skillName: string;
};
```

CLI registration:

```txt
ekko skills use <skill_name>
```

The entrypoint should only parse the argument and dispatch. Skill lookup, state checks, and file/state mutation belong in the handler.

### 3. Resolve selectable skills through one shared catalog helper

Add a small shared helper, likely in `src/shared/catalog.ts` or a new `src/shared/skills.ts`, that resolves a user-provided skill id across selectable language, framework, and architecture skills.

Return an explicit discriminated union, for example:

```ts
type ResolvedSelectableSkill =
  | { kind: 'language'; skill: SelectableLanguageSkill }
  | { kind: 'framework'; skill: SelectableFrameworkSkill }
  | { kind: 'architecture'; skill: SelectableArchitectureSkill };
```

Behavior:

- Exact id match only for the MVP.
- Unknown skill: fail with a short message and suggest `ekko skills list`.
- Already selected skill: no-op success.
- Architecture skill when another architecture skill is already selected: fail safely and tell the user to stop managing/change the existing architecture selection first. Do not silently replace it in the MVP.

### 4. Require a clean workflow before selecting a skill

`ekko skills use` should not become a second interactive sync path. Before changing anything, it should verify that the current Ekko state is clean.

Extract or introduce a reusable workflow-health check that can answer:

- Is `.ekko/state.json` present and valid?
- Are all currently expected managed files present?
- Are managed files unchanged unless marked unmanaged/customized appropriately?
- Are template versions current or reviewed?
- Are there no actionable sync previews for the current state?

Implementation can reuse the existing doctor/sync logic, but avoid duplicating drift rules in the new handler. A practical path is:

- move doctor diagnosis helpers out of `doctor-project/handler.ts` into a shared module, and/or
- add a small `getWorkflowCleanliness` helper that combines state validation with `getSyncPreviews(...).filter(isActionableSyncPreview)`.

If not clean, `ekko skills use` exits without file/state changes and tells the user to run `ekko sync` first.

### 5. Apply a skill selection atomically and safely

After clean-state validation, build the next selection in memory:

- language: append to `selectedLanguageSkills`
- framework: append to `selectedFrameworkSkills`
- architecture: set `selectedArchitectureSkill` only if empty

Then calculate the workflow targets for the next state.

Expected safe changes:

- create the selected skill’s missing `.agents/skills/<skill>/SKILL.md` file from its template
- refresh `AGENTS.md` so optional skill routing includes the new skill instruction
- update `.ekko/state.json` with the new selected skill and current hashes/template versions

Safety rules:

- Do not overwrite local edits.
- If the new skill target already exists but is unrecorded, stop and explain that Ekko cannot safely adopt it through `skills use` yet.
- If `AGENTS.md` has changed since the last recorded hash, stop and tell the user to run `ekko sync`.
- Prefer all-or-nothing behavior: preflight every file that would be touched before writing any file.

The write path can reuse `renderMissingWorkflowFiles`, `renderTemplateForSync`, and `writeEkkoState`, but the handler should keep the command’s intent obvious: select one skill, create required files, refresh routing, record state.

### 6. Keep `ekko sync` as the broader review/repair flow

`ekko sync` should remain the interactive place for drift, existing local files, template updates, and broader selection prompts. `ekko skills use` is the narrow fast path for a known skill name when the repo is already clean.

Future cleanup can make `sync` and `skills use` share more selection helpers, but the MVP should avoid a large command rewrite.

### 7. Document missing skills as assignable work

Add a small docs artifact for human-identified missing skills:

```txt
docs/features/ekko-mvp/missing_skills.md
```

Keep it simple and contributor-oriented. Each entry should include:

- skill id and name
- category: required or selectable
- why it is needed
- expected routing/trigger instruction
- intended template path
- status: missing, planned, in progress, or available
- owner, if known

`ekko skills list` may later read from a structured catalog, but the MVP does not need that. For now, the technical requirement is that missing required/selectable skills are visible enough for a teammate to claim and implement.

## Validation

Automated checks:

- `pnpm build`
- `pnpm check`

Manual smoke checks:

- Fresh repo: `ekko init` can select Codex, Claude, Gemini, and Windsurf.
- Existing clean repo: `ekko skills use typescript` creates/records the TypeScript skill and refreshes `AGENTS.md` routing.
- Existing dirty repo: modify a managed file, run `ekko skills use typescript`, and confirm it refuses changes and points to `ekko sync`.
- Unknown skill: `ekko skills use nope` suggests `ekko skills list`.
- Already selected skill: command exits successfully without changing files.
- Windsurf-selected repo: `ekko doctor` and `ekko sync` treat Windsurf as supported, not as an unsupported state entry.
- Missing-skill inventory: `docs/features/ekko-mvp/missing_skills.md` lists required/selectable gaps in a format a contributor can claim.

## Risks / Open Questions

- Windsurf currently documents both `AGENTS.md` and workspace skills; the MVP should start with `AGENTS.md` + `.agents/skills` because that matches Ekko’s cross-agent model. If real-world testing shows Windsurf needs `.windsurf/skills`, add that as a later template-target change.
- Existing sync prompts already allow adding new skills interactively. Implementation should avoid duplicating too much of that logic, but should not block the simpler explicit command on a full sync refactor.
- Missing-skill inventory is intentionally documentation-first. If it becomes a real catalog that drives CLI behavior, that should be designed as a separate follow-up.
- Architecture skill replacement is intentionally conservative for the MVP; replacing one architecture skill with another may need a separate user-confirmed flow.
