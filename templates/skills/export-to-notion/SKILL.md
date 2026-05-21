---
name: export-to-notion
description: Export a named feature's local feature brief, UX design, and technical design Markdown files to Notion using configured Notion MCP capabilities.
---

# Export to Notion

Use this skill when the user asks to export a feature's core documentation to Notion.

## Delegation default

Use the configured `notion-exporter` sub-agent by default when it is installed for the current AI target. Start it in the background when the runtime supports background sub-agent execution.

Pass only a clean, narrow export packet to the sub-agent:

- feature slug or explicit source paths
- Notion destination details
- the no-local-write rule
- expected final output format: created or updated Notion URLs and errors

Do not fork or pass the main agent's full conversation context. The exporter does not need implementation, planning, or unrelated discussion context.

If a configured Notion exporter sub-agent or background execution is unavailable, run the export inline and clearly tell the user why.

## Required input

- A feature name or feature slug.
- Configured Notion MCP capabilities.
- `.sibu/state.json` with `mcpServerConfigs.notion.docsParentPage` when available.

If the feature name is ambiguous, inspect `docs/features/` and ask one focused clarification question.

## Source files

Export only these local Markdown files when present:

```txt
docs/features/<feature-slug>/feature_brief.md
docs/features/<feature-slug>/ux.md
docs/features/<feature-slug>/technical_design.md
```

Do not export Epics, User Stories, implementation plans, product vision, Deep Module Maps, or arbitrary docs with this skill.

## Notion destination

Use this organization under the configured Notion docs parent page:

```txt
<docsParentPage>
└── <repo name>
    └── Features
        └── <feature name>
            ├── Feature Brief
            ├── UX Design
            └── Technical Design
```

## Workflow

1. Resolve the feature slug from the user's feature name.
2. Read `.sibu/state.json` when available and use `mcpServerConfigs.notion.docsParentPage` as the destination parent.
3. Confirm which of the allowed source files exist.
4. Ask one explicit opt-in question before creating or modifying Notion pages.
5. Create or reuse the repo, Features, and feature organization pages under the configured parent.
6. Export each existing allowed artifact to its matching Notion page.
7. Report export success or failure per artifact.

## Export rules

- Local Markdown remains canonical.
- Do not write Notion URLs back into local Markdown.
- Do not invent missing source artifacts.
- Do not export files outside the allowed source list.
- If Notion MCP capabilities or destination configuration are unavailable, fail clearly and explain what is missing.
