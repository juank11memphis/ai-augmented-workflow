# MCP-Linked Selection Flows Epic Brief

## Summary

Make Sibu's init, targeted selection, and sync flows connect GitHub and Notion MCP selections with their matching exporter skills while preserving explicit user messaging, local-edit protection, and sync review semantics.

## Source Context

- Feature brief: `../../feature_brief.md`
- Technical design: `../../technical_design.md`

## Scope

- During `sibu init`, explain MCP-implied exporter skills as companion additions and omit them from the later optional workflow skills prompt.
- During `sibu mcp use`, add the matching exporter skill and refresh affected workflow files through guarded mutation.
- During direct exporter `sibu skills use`, add the required MCP server with explicit dependency messaging.
- During `sibu sync`, offer matching exporter skills for projects that already have GitHub or Notion MCP selected.
- Preserve state, target planning, and local-edit protections throughout these flows.

## Out of Scope

- Creating exporter skill template content beyond what is delivered by the foundation Epic.
- Exporting artifacts to external systems.
- Validating provider authentication or credentials.

## User Stories

- [Include companion export skills during init](./stories/01-include-companion-export-skills-during-init.md)
- [Add dependency-aware targeted skill and MCP selection](./stories/02-add-dependency-aware-targeted-skill-and-mcp-selection.md)
- [Offer exporter skill adoption during sync](./stories/03-offer-exporter-skill-adoption-during-sync.md)

## Acceptance Criteria

- Init records completed MCP and workflow skill selections without showing MCP-implied exporter skills as pre-selected optional choices.
- Targeted MCP and skill selection flows can add both sides of the MCP/export-skill pair with clear messaging.
- Sync offers existing MCP-enabled projects a safe path to adopt matching exporter skills.
- `AGENTS.md`, MCP config files, skill files, and `.sibu/state.json` stay consistent after each flow.
- Existing workflow mutation readiness and local-edit protections remain intact.

## Dependencies / Risks

- Depends on exporter skill catalog metadata from the foundation Epic.
- The sync flow must not persist implied exporter selections when users skip the corresponding file adoption/review actions.
