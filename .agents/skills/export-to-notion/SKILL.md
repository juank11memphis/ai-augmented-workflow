---
name: export-to-notion
description: Export a named feature's local feature brief, UX design, and technical design Markdown files to Notion using configured Notion MCP capabilities.
---

# Export to Notion

Use this skill when the user asks to export a feature's core documentation to Notion.

## Non-blocking delegation requirement

Before reading source docs or calling Notion mutation tools, check whether the configured `notion-exporter` sub-agent is available for the current AI target.

If available, you must delegate the export to `notion-exporter`. Do not perform the export inline and do not call Notion mutation tools from the main agent.

The delegation is fire-and-notify:

- Start the `notion-exporter` sub-agent in the background.
- Do not call `wait_agent`, poll for completion, spawn a status-checking agent, or otherwise block the main thread.
- Immediately return control to the user after spawning the exporter.
- Tell the user the export is running in the background and that completion will arrive via sub-agent notification.
- Only inspect the final result if the user explicitly asks for status/results later, or after a sub-agent completion notification is received.

Pass only a clean, narrow export packet:

- feature slug or explicit source paths
- Notion destination details
- the no-local-write rule
- whether user opt-in for Notion mutation has already been granted
- expected final output format: created or updated Notion URLs and errors

Do not fork or pass the main agent's full conversation context. The exporter does not need implementation, planning, or unrelated discussion context.

Inline export is allowed only when sub-agent execution is unavailable, the configured `notion-exporter` is not installed, or the user explicitly asks for inline fallback after the background exporter is unavailable or failed. Before any inline mutation, clearly tell the user why delegation cannot be used.

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
7. After spawning the background exporter, immediately report that the export is running in the background. Do not wait for final URLs in the same turn.

## Delegation self-check

Before finalizing, verify:

- Did I use `notion-exporter` when it was available?
- Did I avoid `wait_agent`, status polling, and duplicate status-checking agents?
- If not, did I explicitly report why before any inline Notion mutation?
- Did I avoid local file writes and keep local Markdown canonical?

## Export rules

- Local Markdown remains canonical.
- Do not write Notion URLs back into local Markdown.
- Do not invent missing source artifacts.
- Do not export files outside the allowed source list.
- If Notion MCP capabilities or destination configuration are unavailable, fail clearly and explain what is missing.
