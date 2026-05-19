# Step 1: Add sync implied exporter previews

## Objective
When existing state has GitHub or Notion MCP selected without the matching exporter skill, sync should offer the missing exporter skill through normal preview items.

## Tasks
- Derive implied exporter workflow skills from selected MCP servers before preview generation.
- Include missing exporter skill targets as `new-template` previews.
- Compute routing refresh previews with the planned implied workflow skills.

## Verification
- Sync preview tests cover GitHub and Notion MCP states missing exporter skills.

## Review Status
Approved on 2026-05-19T14:08:00-06:00.
