# Step: Validate Selected MCP State

## Goal

Extend Workflow State Registry validation so existing states remain valid and states with selected MCP servers are accepted only when the optional field has the expected array shape.

## Scope

- Update `src/modules/workflow-state-registry/state.ts` state shape validation to accept optional `selectedMcpServers`.
- Validate `selectedMcpServers` as an array of strings, matching the current validation style for other selected categories.
- Preserve backward compatibility for state files where `selectedMcpServers` is absent.
- Do not require catalog-level semantic validation of MCP ids in state validation unless existing selected skill categories already do that.
- Do not change state read/write formatting.

## Files

- `src/modules/workflow-state-registry/state.ts`

## Done when

- `readStateForDoctor` accepts state files without `selectedMcpServers`.
- `readStateForDoctor` accepts state files with `selectedMcpServers: ['github']`.
- `readStateForDoctor` rejects non-string values in `selectedMcpServers`.
- Existing state validation behavior for skills, agents, and managed files is unchanged.

## Review status

- Status: approved
- Approved by: juanca
- Approved at: 2026-05-07T01:11:42Z
