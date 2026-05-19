# Technical Design: Dedicated Export Skills

## Inputs

- Product vision: `docs/product-vision.md`
- Deep Module Map: `docs/deep-module-map.md`
- Feature brief: `docs/features/dedicated-export-skills/feature_brief.md`
- Delegated skills for implementation: `clean-code`, `typescript`, `command-pattern`, `sibu-template-change`, `ai-prompt-engineer-master`

## Summary

Add two selectable workflow skills, `export-to-github` and `export-to-notion`, and model their MCP dependencies in Sibu's target-planning catalog. Selection flows should derive the complete workflow selection from user intent: selecting GitHub or Notion MCP implies the matching export skill, and selecting an export skill implies the required MCP server after explicit user-facing guidance. Existing authoring templates should lose their embedded export sections so export behavior lives only in the dedicated exporter skill templates.

## Existing Context

- Selectable skills are cataloged in `src/modules/workflow-target-planning/catalog.ts` and rendered into agent-specific `.agents/skills/<skill>/SKILL.md` targets by `getSelectedSkillTargetsForAgents` in `workflow-targets.ts`.
- Selectable workflow skills are currently represented by `WorkflowSkillId`, `SelectableWorkflowSkill`, `selectedWorkflowSkills`, `SELECTABLE_WORKFLOW_SKILLS`, and `resolveSelectableSkillById`.
- Selectable MCP servers are represented by `McpServerId`, `selectedMcpServers`, `SELECTABLE_MCP_SERVERS`, and `resolveSelectableMcpServerById`.
- `sibu init` collects MCP servers before workflow skills, then passes both selections into `getWorkflowTargets` and `writeSibuState`.
- `sibu mcp use` updates MCP config targets only; it does not currently refresh `AGENTS.md` or add skill targets.
- `sibu skills use` updates `AGENTS.md`, writes exactly one new skill target, and does not currently update MCP selections or MCP config targets.
- `sibu sync` discovers newly expected templates by recomputing workflow targets from state. It already supports “new-template” previews for targets that become expected but are absent from `.sibu/state.json`.
- Existing export guidance lives in authoring skill templates: Notion export sections in feature brief, UX, and technical design writers; a mandatory GitHub export gate in Scrum planner.
- `templates/manifest.json` is the source of template versions and sync-visible change notes.

## Proposed Design

### Selection model

Extend workflow skill IDs with:

- `export-to-github`
- `export-to-notion`

Add both as selectable workflow skills in `SELECTABLE_WORKFLOW_SKILLS` with normal skill target mappings for every currently supported agent target that can consume `.agents/skills`. For the current target model, that means Codex, Gemini, Claude, and Windsurf all receive the same shared `.agents/skills/<skill>/SKILL.md` path.

Add catalog metadata for MCP-backed workflow skills instead of scattering dependency rules through command handlers. A small helper in Workflow Target Planning should expose these relationships:

```txt
export-to-github -> github
export-to-notion -> notion
github -> export-to-github
notion -> export-to-notion
```

Use helper names that describe policy rather than UI, such as:

- `getWorkflowSkillsImpliedByMcpServers(selectedMcpServers)`
- `getMcpServersRequiredByWorkflowSkills(selectedWorkflowSkills)`
- `completeWorkflowSelectionForMcpServers(...)`
- `completeMcpSelectionForWorkflowSkills(...)`

The catalog remains the single source of truth for the pairing. Command handlers should ask the catalog for completed selections instead of hardcoding individual GitHub/Notion rules.

### `sibu init`

Complete MCP-implied export skill selection before the optional workflow skills prompt is shown. The prompt should not display export skills that are already implied by selected MCP servers as pre-selected options; doing so makes the pairing look optional and creates a false second decision.

Recommended init flow:

1. User selects MCP servers.
2. Sibu derives any companion export skills implied by those MCP servers.
3. If companion export skills were derived, Sibu prints a concise explanatory line, such as: `Notion MCP selected. I’ll also include export-to-notion so agents can publish feature docs to Notion.`
4. Sibu asks for optional workflow skills, excluding skills already implied by selected MCP servers from that prompt.
5. If the user explicitly selects an exporter workflow skill from the remaining prompt or another path and its MCP server is missing, explain that the MCP server is required and add the required MCP server before files are planned.
6. Ask for Notion docs parent page whenever the completed MCP selection includes Notion and previous state/config does not already provide it.
7. Pass the completed MCP and workflow selections into `getWorkflowTargets`, `renderMissingWorkflowFiles`, and `writeSibuState`.
8. Include both the selected MCP server and the companion export skill in the final setup summary/log output.

This keeps init's mutation behavior unchanged: it still writes only the initial planned files and records the completed selection in `.sibu/state.json`. The UX change is that implied exporter skills are communicated as companion additions, not shown as editable pre-selected choices.

### `sibu mcp use`

When a user adds `github` or `notion` through `sibu mcp use`, the handler should add the matching export skill in the same guarded mutation.

The use-MCP plan should include:

- refreshed MCP config targets affected by the MCP selection
- the new exporter skill target, if not already selected and not already recorded
- the `AGENTS.md` target, because skill routing must refresh when `selectedWorkflowSkills` changes
- all expected workflow targets for the final completed selection

Preflight should continue to rely on Workflow Mutation Readiness first. The targeted preflight should then protect every affected file:

- existing MCP config targets must be recorded in state before refresh
- `AGENTS.md` must be recorded, present, and unchanged before routing refresh
- the exporter skill target must not already exist unrecorded

On success, render the affected MCP config files, render the new skill file, refresh `AGENTS.md`, and write state with the completed MCP and workflow selections. The final CLI output should explicitly say that the MCP server was added and the matching export skill was added.

### `sibu skills use`

When a user runs `sibu skills use export-to-github` or `sibu skills use export-to-notion`, `getNextSkillSelection` should return a selected skill result plus dependency information when the required MCP server is absent.

The handler should not silently configure the dependency. It should print a clear message before applying the plan, for example:

```txt
export-to-notion requires the Notion MCP server. I will add Notion MCP configuration and the export skill together.
```

Then apply the same kind of completed-selection plan used by `sibu mcp use`:

- add the exporter skill
- add the required MCP server if missing
- ask for Notion docs parent page if Notion becomes selected
- refresh/create affected MCP config files
- refresh `AGENTS.md`
- write state with completed workflow and MCP selections

For non-export skills, keep the current narrow skill-use behavior.

Implementation should avoid assuming there is exactly one new target once dependencies are involved. Replace the current `newSkillTarget` single-target path with a plan that can carry multiple affected targets for exporter skill selection while preserving the simpler path for ordinary skills if that keeps the code clearer.

### `sibu sync`

Sync should offer already-initialized projects the matching exporter skill when state has a selected MCP server but lacks the implied workflow skill.

Do this before preview generation by completing the state selections in memory:

1. Read state.
2. Add implied exporter workflow skills for selected MCP servers.
3. Mark state as changed if any workflow skill was implied.
4. Generate previews from the completed state.

The existing “new-template” preview mechanism should then surface the new exporter skill file and any `AGENTS.md` routing refresh as normal sync review items. If the user skips all affected file actions, do not write a state that claims the export skill is selected without its managed files being adopted or reviewed. State should only persist the implied selection when the corresponding sync actions make the workflow consistent, or when there are no file changes needed.

This preserves Sync Review ownership: sync offers adoption and protects local edits; it does not force new exporter files into customized workflows.

### Exporter skill templates

Add two templates:

```txt
templates/skills/export-to-github/SKILL.md
templates/skills/export-to-notion/SKILL.md
```

`export-to-github` should instruct the agent to accept a feature name, find the feature's Epic and User Story Markdown files under `docs/features/<feature-slug>/epics/**`, and export them to GitHub with the configured GitHub MCP capabilities. It should preserve the existing Scrum planner export rules that remain product-relevant: use the current repo, ask for explicit opt-in before GitHub mutations, create fresh issues, create Epic and Story issues, attach Stories as native sub-issues, report created issue URLs/numbers, and avoid writing GitHub URLs into local Markdown.

`export-to-notion` should instruct the agent to accept a feature name and export only these files when present:

```txt
docs/features/<feature-slug>/feature_brief.md
docs/features/<feature-slug>/ux.md
docs/features/<feature-slug>/technical_design.md
```

It should own the existing Notion organization convention:

```txt
<docsParentPage>
└── <repo name>
    └── Features
        └── <feature name>
            ├── Feature Brief
            ├── UX Design
            └── Technical Design
```

The exporter should treat local Markdown as canonical, ask for explicit opt-in before creating or modifying Notion pages, avoid writing Notion URLs back into local Markdown, and report export success or failure per artifact.

### Remove export guidance from authoring templates

Remove destination-specific export sections from:

- `templates/skills/feature-brief-writer/SKILL.md`
- `templates/skills/ux-expert/SKILL.md`
- `templates/skills/technical-design-writer/SKILL.md`
- `templates/skills/scrum-master-planner/SKILL.md`

Their final response behavior should return to local artifact creation only. If useful, each authoring skill may include one concise sentence that export is handled by the dedicated exporter skills, but it must not include gates, MCP availability checks, provider-specific instructions, or export workflows.

Update `.agents/skills/**` generated copies only if the implementation story explicitly refreshes local managed workflow files in this repository. The template source remains the canonical implementation target.

### Manifest and state schema

Update `templates/manifest.json` in the same change as template edits:

- bump the global `templateVersion`
- add entries for the two new exporter skill templates
- bump changed authoring skill template versions with user-facing sync notes
- bump `AGENTS.md` only if routing instructions or generated guidance changes

Update `WorkflowSkillId` to include the two new IDs. No new persisted state field is required; existing `selectedWorkflowSkills` and `selectedMcpServers` can represent the completed selection.

## Module Boundaries

- Workflow Target Planning owns the catalog metadata and selection-completion helpers. It should not write files or prompt users.
- Skill Selection Management owns direct `sibu skills use` behavior and exporter-skill dependency handling from the skill side.
- MCP Server Selection Management owns direct `sibu mcp use` behavior and implied exporter skill adoption from the MCP side.
- Project Adoption owns applying completed selections during `sibu init` without overwriting existing files.
- Sync Review owns offering implied exporter skills to existing projects through normal preview/action flow.
- Template Catalog and Rendering owns exporter skill templates and authoring-template cleanup.

CLI entrypoints should remain thin. They should keep routing to existing handlers and should not know the exporter/MCP dependency map.

## Validation

- Add or update catalog tests proving:
  - `export-to-github` and `export-to-notion` resolve as workflow skills.
  - GitHub MCP implies `export-to-github`.
  - Notion MCP implies `export-to-notion`.
  - Exporter workflow skills require their matching MCP server.
  - Workflow targets include exporter skill files for all feasible supported agents.
- Add `sibu init` tests for MCP-selected exporter auto-selection, including: implied exporter skills are omitted from the optional workflow prompt, the companion addition is explained in output, the final state records both selections, and Notion docs parent page prompting occurs when Notion is implied.
- Add `sibu mcp use` tests proving GitHub/Notion MCP use also writes the exporter skill, refreshes `AGENTS.md`, updates state, and preserves preflight protection for local edits.
- Add `sibu skills use` tests proving direct exporter skill selection adds the required MCP server, prompts for Notion docs parent when needed, renders affected MCP config files, refreshes `AGENTS.md`, and records both selections.
- Add sync preview tests proving existing states with GitHub/Notion MCP selected and no matching exporter skill see new-template previews for the exporter skill and routing refresh.
- Add template/manifest tests proving all new and changed templates are present in `templates/manifest.json`.
- Run `pnpm run test` and `pnpm run build`.
- For template lifecycle confidence, run `sibu doctor` and, when practical, exercise `sibu init`/`sibu sync` in a temporary project.

## Risks / Tradeoffs

- Completing selections automatically improves discoverability, but command output must make dependency additions explicit so Sibu does not feel like it silently expands external integration behavior.
- `sibu sync` must avoid persisting implied exporter selections without adopted/reviewed files; otherwise state can claim a skill is selected while the workflow is missing its guidance.
- Refactoring `sibu skills use` from a single-new-target assumption to multi-target dependency plans increases implementation size, but it keeps exporter dependency handling honest and reusable.
- Removing export prompts from authoring skills changes the user habit from “export offered after writing” to “ask the exporter skill explicitly.” The new skills and routing instructions need to make that path easy to discover.
